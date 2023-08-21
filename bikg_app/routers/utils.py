# utils.py
import numpy as np
from collections import defaultdict
from rdflib import Graph, Namespace, URIRef, RDF
import time
from tqdm.auto import tqdm
import sys
import json

if 'ipykernel' in sys.modules:
    from tqdm.notebook import tqdm as tqdm_notebook
    tqdm_instance = tqdm_notebook
else:
    tqdm_instance = tqdm


def get_symmetric_graph_matrix(graph):
    """Takes a rdflib graph and returns a symmetric adjacency matrix"""
    # get the list of nodes
    nodes = list(graph)
    # create a dictionary of node indices
    node_indices = {node: i for i, node in enumerate(nodes)}
    # create a symmetric adjacency matrix
    matrix = np.zeros((len(nodes), len(nodes)))
    for s, _p, o in graph:
        matrix[node_indices[s], node_indices[o]] = 1
        matrix[node_indices[o], node_indices[s]] = 1
    return matrix


def serialize_edge_count_dict(d):
    serialized_dict = {}
    for outer_key, outer_value in d.items():
        inner_dict = {}
        for inner_key, inner_value in dict(outer_value).items():
            inner_key_str = tuple(map(str, inner_key))
            inner_dict[json.dumps(inner_key_str)] = inner_value
        serialized_dict[str(outer_key)] = inner_dict
    return serialized_dict


def serialize_focus_node_exemplar_dict(d):
    serialized_dict = {}
    for key, value in d.items():
        serialized_key = str(key)
        serialized_value = [str(item) for item in value]
        serialized_dict[serialized_key] = serialized_value
    return serialized_dict


def deserialize_edge_count_dict(d):
    deserialized_dict = {}
    for outer_key, inner_dict in d.items():
        inner_value = {}
        for inner_key, value in inner_dict.items():
            inner_key_tuple = tuple(json.loads(inner_key))
            inner_value[inner_key_tuple] = value
        deserialized_dict[outer_key] = inner_value
    return deserialized_dict


def load_edge_count_json(path):
    with open(path, 'r') as f:
        data = json.load(f)
    return deserialize_edge_count_dict(data)


def deserialize_focus_node_exemplar_dict(d):
    deserialized_dict = {}
    for key, value in d.items():
        deserialized_key = key
        deserialized_value = [item for item in value]
        deserialized_dict[deserialized_key] = deserialized_value
    return deserialized_dict


def load_uri_set_of_uris_dict(path):
    with open(path, 'r') as f:
        data = json.load(f)
    return deserialize_focus_node_exemplar_dict(data)


def save_edge_count_json(data, path):
    with open(path, 'w') as f:
        json.dump(serialize_edge_count_dict(dict(data)), f)


def save_uri_set_of_uris_dict(data, path):
    with open(path, 'w') as f:
        json.dump(serialize_focus_node_exemplar_dict(dict(data)), f)


def copy_namespaces(source_g, target_g):
    for prefix, ns in source_g.namespaces():
        target_g.namespace_manager.bind(prefix, ns)


# TODO instead of counting the edge object pairs we should count the exemplar occurrences
# TODO or keep track of ignored edges as well
def get_violation_report_exemplars(ontology_g, violation_report_g):

    SH = Namespace("http://www.w3.org/ns/shacl#")
    DCTERMS = Namespace("http://purl.org/dc/terms/")
    OWL = Namespace("http://www.w3.org/2002/07/owl#")
    ontology_g.namespace_manager.bind("sh", SH)
    ontology_g.namespace_manager.bind("dcterms", DCTERMS)
    violation_report_g.namespace_manager.bind("sh", SH)
    violation_report_g.namespace_manager.bind("dcterms", DCTERMS)

    copy_namespaces(violation_report_g, ontology_g)

    violations_query = """
    SELECT ?violation ?p ?o WHERE {
        ?violation a sh:ValidationResult .
        }
        """
    violations = [row[0] for row in violation_report_g.query(violations_query)] # type: ignore

    edge_count_dict = defaultdict(lambda: defaultdict(int))
    focus_node_exemplar_dict = defaultdict(set)
    exemplar_focus_node_dict = defaultdict(set)

    ignored_edges = set([DCTERMS.date, SH.focusNode, URIRef('http://rdfunit.aksw.org/ns/core#testCase')])

    exemplar_sets = {}

    for violation in tqdm_instance(violations, desc="Processing violations"):
        violations_query = """
        SELECT ?s ?p ?o WHERE {
            <%s> ?p ?o.
        }
        """ % violation

        edge_object_pairs = []
        shape = None
        current_focus_node = None
        for row in violation_report_g.query(violations_query):
            _, p, o = row # type: ignore
            if p == SH.focusNode:
                current_focus_node = o
            if p == SH.sourceShape:
                shape = o
            elif p in ignored_edges:
                continue
            edge_object_pairs.append((p, o))

        exemplar_name = exemplar_sets.get(frozenset(edge_object_pairs))

        if exemplar_name is None:
            exemplar_name = URIRef(f"{shape}_exemplar_{len(exemplar_sets)+1}")
            exemplar_sets[frozenset(edge_object_pairs)] = exemplar_name

        focus_node_exemplar_dict[current_focus_node].add(exemplar_name)
        exemplar_focus_node_dict[exemplar_name].add(current_focus_node)

        for p, o in edge_object_pairs:
            if edge_count_dict[exemplar_name][(p, o)] == 0:
                if p == SH.sourceShape:
                    ontology_g.add((o, URIRef("http://customnamespace.com/hasExemplar"), exemplar_name)) # type: ignore
                else:
                    ontology_g.add((exemplar_name, p, o)) # type: ignore
                # TODO create custom URI instead of object property
                ontology_g.add((exemplar_name, RDF.type, SH.PropertyShape))
            edge_count_dict[exemplar_name][(p, o)] += 1

    return ontology_g, edge_count_dict, focus_node_exemplar_dict, exemplar_focus_node_dict


# utils.py
import numpy as np
from collections import defaultdict
from rdflib import Graph, Namespace, URIRef
import time
from tqdm.auto import tqdm
import sys

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

# TODO instead of counting the edge object pairs we should count the exemplar occurrences
# TODO or keep track of ignored edges as well
def get_violation_report_exemplars(ontology_g, violation_report_g):

    SH = Namespace("http://www.w3.org/ns/shacl#")
    DCTERMS = Namespace("http://purl.org/dc/terms/")
    ontology_g.namespace_manager.bind("sh", SH)
    ontology_g.namespace_manager.bind("dcterms", DCTERMS)
    violation_report_g.namespace_manager.bind("sh", SH)
    violation_report_g.namespace_manager.bind("dcterms", DCTERMS)

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
                ontology_g.add((exemplar_name, p, o)) # type: ignore
            edge_count_dict[exemplar_name][(p, o)] += 1

    return ontology_g, edge_count_dict, focus_node_exemplar_dict, exemplar_focus_node_dict


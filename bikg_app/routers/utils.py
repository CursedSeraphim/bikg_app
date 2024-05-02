"""This module is a collection of utility functions used by the API endpoints."""
# utils.py
import json
import sys
from collections import defaultdict

import numpy as np
from rdflib import RDF, Namespace, URIRef
from tqdm.auto import tqdm

if "ipykernel" in sys.modules:
    from tqdm.notebook import tqdm as tqdm_notebook

    TQDMInstance = tqdm_notebook
else:
    TQDMInstance = tqdm


def get_symmetric_graph_matrix(graph):
    """Returns a symmetric adjacency matrix for a given rdflib graph.

    Args:
        graph (rdflib.Graph): The graph for which to generate an adjacency matrix.

    Returns:
        np.ndarray: A symmetric adjacency matrix representing the graph.
    """
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


def serialize_nested_count_dict(d) -> str:
    """Serializes a nested dictionary of edge counts for easier storage.

    Args:
        d (Dict[Any, Any]): A dictionary containing edge count information.

    Returns:
        str: A serialized version of the input dictionary.
    """
    serialized_dict = {}
    for outer_key, outer_value in d.items():
        if isinstance(outer_value, set):
            outer_value = list(outer_value)
        serialized_dict[str(outer_key)] = outer_value
    return json.dumps(serialized_dict)


def serialize_dict_keys_and_values(d):
    """Serializes a dictionary that maps focus nodes to exemplar nodes.

    Args:
        d (dict): A dictionary mapping focus nodes to exemplar nodes.

    Returns:
        dict: A serialized version of the input dictionary.
    """
    serialized_dict = {}
    for key, value in d.items():
        serialized_key = str(key)
        serialized_value = [str(item) for item in value]
        serialized_dict[serialized_key] = serialized_value
    return serialized_dict


def deserialize_nested_count_dict(d):
    """Deserializes a nested dictionary of edge counts.

    Args:
        d (str): A JSON-serialized string containing edge count information.

    Returns:
        dict: A deserialized version of the input dictionary.
    """
    deserialized_dict = json.loads(d)  # Deserialize the JSON string to a Python dictionary
    return deserialized_dict


def load_nested_counts_dict_json(path):
    """Loads edge count information from a JSON file.

    Args:
        path (str): The path to the JSON file containing edge count data.

    Returns:
        dict: A deserialized dictionary containing edge count information.
    """
    with open(path, encoding="utf-8") as f:
        data = json.load(f)
    return deserialize_nested_count_dict(data)


def deserialize_dict_keys_and_values(d):
    """Deserializes a dictionary that maps focus nodes to exemplar nodes.

    Args:
        d (dict): A serialized dictionary mapping focus nodes to exemplar nodes.

    Returns:
        dict: A deserialized version of the input dictionary.
    """
    deserialized_dict = {}
    for key, value in d.items():
        deserialized_key = key
        deserialized_value = list(value)
        deserialized_dict[deserialized_key] = deserialized_value
    return deserialized_dict


def load_lists_dict(path):
    """Loads a dictionary that maps URIs to sets of URIs from a JSON file.

    Args:
        path (str): The path to the JSON file containing the data.

    Returns:
        dict: A deserialized dictionary mapping URIs to sets of URIs.
    """
    with open(path, encoding="utf-8") as f:
        data = json.load(f)
    return deserialize_dict_keys_and_values(data)


def save_nested_counts_dict_json(data, path):
    """Saves edge count information to a JSON file.

    Args:
        data (dict): A dictionary containing edge count information.
        path (str): The path where the JSON file will be saved.

    Returns:
        None
    """
    with open(path, "w", encoding="utf-8") as f:
        json.dump(serialize_nested_count_dict(dict(data)), f)


def save_lists_dict(data, path):
    """Saves a dictionary that maps URIs to sets of URIs to a JSON file.

    Args:
        data (dict): A dictionary mapping URIs to sets of URIs.
        path (str): The path where the JSON file will be saved.

    Returns:
        None
    """
    with open(path, "w", encoding="utf-8") as f:
        json.dump(serialize_dict_keys_and_values(dict(data)), f)


def copy_namespaces(source_g, target_g):
    """Copies all namespaces from one rdflib graph to another.

    Args:
        source_g (rdflib.Graph): The source graph from which to copy namespaces.
        target_g (rdflib.Graph): The target graph to which namespaces will be copied.

    Returns:
        None
    """
    for prefix, ns in source_g.namespaces():
        target_g.namespace_manager.bind(prefix, ns)


def get_violation_report_exemplars(ontology_g, violation_report_g):
    """
    Generates and returns a violation report based on ontology and violation graphs.

    This function generates exemplars for the ontology graph based on the violations
    found in the violation report graph. It also counts edge-object pairs and keeps
    track of focus nodes and their related exemplars. Note that TODOs indicate pending
    modifications for tracking ignored edges and exemplar occurrences.

    Args:
        ontology_g (rdflib.Graph): The ontology graph that serves as the reference.
        violation_report_g (rdflib.Graph): The graph containing violation reports.

    Returns:
        tuple: A 4-tuple containing the updated ontology graph, a dictionary of
        edge counts, a dictionary mapping focus nodes to exemplars, and a dictionary
        mapping exemplars to focus nodes.

    TODO:
        - Instead of counting the edge-object pairs, consider counting the exemplar occurrences.
        - Keep track of ignored edges as well.
    """
    sh = Namespace("http://www.w3.org/ns/shacl#")
    dcterms = Namespace("http://purl.org/dc/terms/")
    ex = Namespace("http://example.com/exemplar#")
    ontology_g.namespace_manager.bind("dcterms", dcterms)
    ontology_g.namespace_manager.bind("sh", sh)
    ontology_g.namespace_manager.bind("ex", ex)
    violation_report_g.namespace_manager.bind("dcterms", dcterms)
    violation_report_g.namespace_manager.bind("sh", sh)
    violation_report_g.namespace_manager.bind("ex", ex)

    copy_namespaces(violation_report_g, ontology_g)

    violations_query = """
    SELECT ?violation ?p ?o WHERE {
        ?violation a sh:ValidationResult .
        }
        """
    validation_results = [row[0] for row in violation_report_g.query(violations_query)]  # type: ignore

    edge_count_dict = defaultdict(lambda: defaultdict(int))
    focus_node_exemplar_dict = defaultdict(set)
    exemplar_focus_node_dict = defaultdict(set)
    violation_exemplar_dict = defaultdict(lambda: defaultdict(int))  # New dictionary to keep track of violation-exemplar pairs

    ignored_edges = {
        dcterms.date,
        sh.focusNode,
        URIRef("http://rdfunit.aksw.org/ns/core#testCase"),
    }

    exemplar_sets = {}

    for validation_result in TQDMInstance(validation_results, desc="Processing violations"):
        violations_query = f"""
            SELECT ?s ?p ?o WHERE {{
                <{validation_result}> ?p ?o.
            }}
        """

        edge_object_pairs = []
        shape = ""
        current_focus_node = None
        for row in violation_report_g.query(violations_query):
            _, p, o = row  # type: ignore
            if p == sh.focusNode:
                current_focus_node = o
            if p == sh.sourceShape:
                shape = o
            elif p in ignored_edges:
                continue
            edge_object_pairs.append((p, o))

        exemplar_name = exemplar_sets.get(frozenset(edge_object_pairs))
        print(f"Exemplar name: {exemplar_name}")

        if exemplar_name is None:
            print(f"Creating new exemplar for {shape}")
            # Use custom exemplar namespace instead of the shape's namespace
            splitter = "omics/"
            if "omics/" in shape:
                splitter = "omics/"
            elif "omics#" in shape:
                splitter = "omics#"
            else:
                raise ValueError("ViolationShape URI expected to contain 'omics/' or 'omics#', but was {shape}")
            
            exemplar_name = URIRef(f"{ex}{shape.split(splitter)[-1]}_exemplar_{len(exemplar_sets)+1}")
            print(f"Exemplar name: {exemplar_name}")
            exemplar_sets[frozenset(edge_object_pairs)] = exemplar_name

        focus_node_exemplar_dict[current_focus_node].add(exemplar_name)
        exemplar_focus_node_dict[exemplar_name].add(current_focus_node)
        violation_exemplar_dict[shape][
            exemplar_name
        ] += 1  # Updating the new dictionary to associate the violation with the exemplar and count

        process_edge_object_pairs(ontology_g, sh, edge_count_dict, edge_object_pairs, exemplar_name)

    return (
        ontology_g,
        edge_count_dict,
        focus_node_exemplar_dict,
        exemplar_focus_node_dict,
        violation_exemplar_dict,
    )


def process_edge_object_pairs(ontology_g, sh, edge_count_dict, edge_object_pairs, exemplar_name):
    for p, o in edge_object_pairs:
        po_str = f"{p}__{o}"
        if edge_count_dict[exemplar_name][po_str] == 0:
            if p == sh.sourceShape:
                ontology_g.add((o, URIRef("http://customnamespace.com/hasExemplar"), exemplar_name))  # type: ignore
            else:
                ontology_g.add((exemplar_name, p, o))  # type: ignore
                # TODO create custom URI instead of object property
            ontology_g.add((exemplar_name, RDF.type, sh.PropertyShape))
        edge_count_dict[exemplar_name][po_str] += 1

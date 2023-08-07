# utils.py
import numpy as np
from collections import defaultdict
from rdflib import Graph, Namespace, URIRef
import time
from tqdm import tqdm

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

    violations_query = """
    SELECT ?violation ?p ?o WHERE {
        ?violation a sh:ValidationResult .
        }
        """
    print("running violations query...")
    start_time = time.time()
    violations = [row[0] for row in violation_report_g.query(violations_query)] # type: ignore
    end_time = time.time()
    print(f"Time to run violations query: {end_time - start_time}")

    # Dictionary to keep track of exemplars and their counts
    edge_count_dict = defaultdict(lambda: defaultdict(int))

    # Define ignored predicates here (modify as needed)
    ignored_edges = set([DCTERMS.date, SH.focusNode, URIRef('http://rdfunit.aksw.org/ns/core#testCase')])

    # Dictionary to keep track of the sets of edge object pairs and corresponding exemplar keys
    exemplar_sets = {}

    for violation in tqdm(violations, desc="Processing violations"):
        violations_query = """
        SELECT ?s ?p ?o WHERE {
            <%s> ?p ?o.
        }
        """ % violation

        edge_object_pairs = []
        shape = None
        for row in violation_report_g.query(violations_query):
            _, p, o = row # type: ignore
            if p == SH.sourceShape:
                shape = o
            elif p in ignored_edges:
                continue
            edge_object_pairs.append((p, o))

        # Check if this set of edge object pairs matches any of the previously found exemplars
        local_shape_name = shape.split('#')[-1] # type: ignore
        exemplar_name = exemplar_sets.get(frozenset(edge_object_pairs))

        # If the exemplar does not exist, create a new one
        if exemplar_name is None:
            exemplar_name = URIRef(f"{shape}_exemplar_{len(exemplar_sets)+1}")
            exemplar_sets[frozenset(edge_object_pairs)] = exemplar_name

        # Add the exemplar edges to the graph and update counts
        for p, o in edge_object_pairs:
            # Add to graph if new for this exemplar
            if edge_count_dict[exemplar_name][(p, o)] == 0:
                ontology_g.add((exemplar_name, p, o)) # type: ignore
            edge_count_dict[exemplar_name][(p, o)] += 1
        end_time = time.time()

    return ontology_g, edge_count_dict
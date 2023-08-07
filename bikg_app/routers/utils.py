# utils.py
import numpy as np
from collections import defaultdict
from rdflib import Graph, Namespace


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


def get_violation_report_exemplars(ontology_file, violation_report_file):
    """
    Takes the property shapes from the ontology.
    In the violation report for each property shape shape_i there might be multiple violations.
    An exemplar of a violation report for each shape_i is created that contains all edges of all occurrences of violation reports for shape_i.
    A graph is created that is an extension of the ontology graph with the exemplars.
    We also create a dictionary for each shape_i that contains the count of edge/object pairs of all the violation reports that are aggregated in the exemplar.

    params:
        ontology_file: the ontology .ttl file path containing an rdf graph
        violation_report_file: the violation report .ttl file path containing an rdf graph

    returns: the extended graph and the dictionary
    """
    # Load the ontology
    g = Graph()
    g.parse(ontology_file, format="turtle")
    
    # Load the violation report
    g_v = Graph()
    g_v.parse(violation_report_file, format="turtle")

    # Define the namespaces
    SH = Namespace("http://www.w3.org/ns/shacl#")
    g.namespace_manager.bind("sh", SH)

    # Get a list of all property shapes by executing a SPARQL query on the ontology graph
    property_shapes_query = """
    SELECT ?shape WHERE {
        ?shape a sh:PropertyShape.
    }
    """
    property_shapes = [row[0] for row in g.query(property_shapes_query)] # type: ignore

    # Create a dictionary for each property shape
    edge_count_dict = defaultdict(lambda: defaultdict(int))

    # TODO
    # this needs to be changed in such a way that we first define a set of edges that should be ignored ignored_edges for the following approach
    # we look at a query result for the given shape and determine the set of edges object pairs (which are not ignored) that are present
    # we store this subgraph structure as <sourceShape>_exemplar_n - this will also be the key to store the edge object counts in the dictionary
    # basically this means we need a data structure in which we can put the set of edge object pairs that we found for an exemplar, and be easily and efficiently able to try to look up this set when iterating the next shape
    # in order to see whether this exemplar already exists
    # when iterating over the next shape we check if its set of edge object pairs matches any of the previously found exemplars
    # if so we don't need to make a new entry in the data structure where we store sets of edge object pairs of exemplars, and we can retrieve and use the same <sourceShape>_exemplar_n key to increase the counts in the dictionary
    # otherwise we create a new exemplar
    # in the graph we append the s,p,o of each of the new exemplars using  <sourceShape>_exemplar_n as the subject
    # where <sourceShape> is the URI of the shape and this is the nth exemplar we found and stored
    # and we return the new graph and the dictionary all counts. since the key in the dictionary would also be <sourceShape>_exemplar_n handling all exemplars individually should be solved automatically

    # Iterate through property shapes
    for shape in property_shapes:
        violations_query = """
        SELECT ?violation ?p ?o WHERE {
            ?violation sh:sourceShape <%s>.
            ?violation ?p ?o.
        }
        """ % shape
        for row in g_v.query(violations_query):
            v, p, o = row  # type: ignore
            # Add the (p, o) pair only once to the ontology graph if it's a new one for this shape
            if edge_count_dict[shape][(p, o)] == 0:
                g.add((v, p, o)) # type: ignore
            # Increment the count for the (shape, p, o) triplet
            edge_count_dict[shape][(p, o)] += 1

    return g, edge_count_dict
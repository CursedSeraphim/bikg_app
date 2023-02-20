from rdflib import Graph
# import forceatlas2
from fa2 import ForceAtlas2
import numpy as np

def get_symmetric_graph_matrix(graph):
    """ Takes a rdflib graph and returns a symmetric adjacency matrix """
    # get the list of nodes
    nodes = list(graph)
    # create a dictionary of node indices
    node_indices = {node: i for i, node in enumerate(nodes)}
    # create a symmetric adjacency matrix
    matrix = np.zeros((len(nodes), len(nodes)))
    for s, p, o in graph:
        matrix[node_indices[s], node_indices[o]] = 1
        matrix[node_indices[o], node_indices[s]] = 1
    return matrix


def get_force_directed_positions(graph, graph_matrix):
    # set numpy random state
    np.random.seed(0)
    # create random initial positions for the nodes
    positions = np.random.rand(graph_matrix.shape[0], 2)

    # create a forceatlas2 object
    forceatlas2 = ForceAtlas2(
                            # Behavior alternatives
                            outboundAttractionDistribution=True,  # Dissuade hubs
                            linLogMode=False,  # NOT IMPLEMENTED
                            adjustSizes=False,  # Prevent overlap (NOT IMPLEMENTED)
                            edgeWeightInfluence=1.0,

                            # Performance
                            jitterTolerance=1.0,  # Tolerance
                            barnesHutOptimize=True,
                            barnesHutTheta=1.2,
                            multiThreaded=False,  # NOT IMPLEMENTED

                            # Tuning
                            scalingRatio=2.0,
                            strongGravityMode=False,
                            gravity=1.0,

                            # Log
                            verbose=True)

    # run forceatlas2
    positions = forceatlas2.forceatlas2(graph_matrix, pos=positions, iterations=1000)
    # create a dictionary that maps nodes to positions
    positions_d = {node: positions[i] for i, node in enumerate(list(graph))}
    return positions_d
    
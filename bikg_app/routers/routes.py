# routes.py
import json
import os
import time
from collections import defaultdict

import numpy as np
import pandas as pd
from fastapi import APIRouter, Request, Response
from rdflib import RDF, Graph, Namespace
from rdflib.namespace import split_uri
from scipy.stats import chi2_contingency

from bikg_app.routers.utils import (
    load_lists_dict,
    load_nested_counts_dict_json,
    serialize_dict_keys_and_values,
    serialize_nested_count_dict,
)

SH = Namespace("http://www.w3.org/ns/shacl#")
OWL = Namespace("http://www.w3.org/2002/07/owl#")
RDFS = Namespace("http://www.w3.org/2000/01/rdf-schema#")

# File paths
VIOLATIONS_FILE_PATH = os.path.join("bikg_app/json", "violation_list.json")
STUDY_CSV_FILE_PATH = "bikg_app/csv/study.csv"
ONTOLOGY_TTL_FILE_PATH = "bikg_app/ttl/omics_model_union_violation_exemplar.ttl"
EXEMPLAR_EDGE_COUNT_JSON_PATH = "bikg_app/json/exemplar_edge_count_dict.json"
FOCUS_NODE_EXEMPLAR_DICT_JSON_PATH = "bikg_app/json/focus_node_exemplar_dict.json"
EXEMPLAR_FOCUS_NODE_DICT_JSON_PATH = "bikg_app/json/exemplar_focus_node_dict.json"
VIOLATION_EXEMPLAR_DICT_PATH = 'bikg_app/json/violation_exemplar_dict.json'

# load the violations
assert os.path.exists(VIOLATIONS_FILE_PATH)
with open(VIOLATIONS_FILE_PATH, "rb") as violations_f:
    violations_list = json.load(violations_f)

# load the tabularized data
df = pd.read_csv(STUDY_CSV_FILE_PATH, index_col=0)
df = df.replace(np.nan, "nan", regex=True)
filtered_columns = [column for column in df.columns if column not in ["x", "y"]]

# compute the overall value counts
overall_value_counts = {}
for column in filtered_columns:
    overall_value_counts[column] = df[column].value_counts().to_dict()

# compute the overall violation value counts
overall_violation_value_dict = {}
for column in violations_list:
    overall_violation_value_dict[column] = df[column].value_counts().to_dict()

# load the ontology
g = Graph()
g.parse(ONTOLOGY_TTL_FILE_PATH, format="ttl")
ttl_data = g.serialize(format="turtle")

overall_violation_value_counts = {
    violation: sum(key * value for key, value in counts.items()) for violation, counts in overall_violation_value_dict.items()
}

types_list = df["rdf:type"].unique().tolist()

def shorten_uris_in_nested_dict(nested_dict, g: Graph):
    new_dict = {}
    for outer_key, inner_dict in nested_dict.items():
        # Shorten the outer key URI
        new_outer_key = str(g.namespace_manager.qname(outer_key))
        
        new_inner_dict = {}
        for inner_key, value in inner_dict.items():
            # Shorten the inner key URI
            new_inner_key = str(g.namespace_manager.qname(inner_key))
            
            # Shorten the inner value URI if it's a URI
            if isinstance(value, str):
                new_value = str(g.namespace_manager.qname(value))
            else:
                new_value = value
            
            new_inner_dict[new_inner_key] = new_value
        
        new_dict[new_outer_key] = new_inner_dict
    
    return new_dict


# load the edge_count_dict that gives edge counts within each exemplar
edge_count_dict = load_nested_counts_dict_json(EXEMPLAR_EDGE_COUNT_JSON_PATH)
# load the focus_node_exemplar_dict that gives the exemplars for each focus node
focus_node_exemplar_dict = load_lists_dict(FOCUS_NODE_EXEMPLAR_DICT_JSON_PATH)
# exemplar_focus_node_dict that gives the focus node for each exemplar
exemplar_focus_node_dict = load_lists_dict(EXEMPLAR_FOCUS_NODE_DICT_JSON_PATH)
# violation_exemplar_dict that gives the exemplars and their counts for each violation
violation_exemplar_dict = shorten_uris_in_nested_dict(load_nested_counts_dict_json(VIOLATION_EXEMPLAR_DICT_PATH), g)

router = APIRouter()


def build_type_node_count_dict(df):
    """
    Description of build_violation_node_count_dict.
    Calculates how many focus nodes exist for each type
    :param df: Dataframe with one row per focus node with the column 'rdf:type'
    :return: A dictionary with types as keys and violation counts as values
    """
    if 'rdf:type' not in df.columns:
        raise ValueError("The dataframe must contain a 'rdf:type' column.")
    
    # Use the value_counts method to get the count of each unique type in the 'rdf:type' column
    type_counts = df['rdf:type'].value_counts()
    
    # Convert the Series object to a dictionary
    type_count_dict = type_counts.to_dict()
    
    return type_count_dict


type_count_dict = build_type_node_count_dict(df)


def build_type_violation_dict(df, violations_list):
    """
    Description of build_type_violation_dict.
    :param :df: Dataframe with columns "rdf:type" and v for each v in violations_list
    :return: A dictionary with types as keys and (violation, violation_count) as values
    """
    # Initialize an empty dictionary to store the results
    type_violation_dict = {}
    
    # Loop through each unique RDF type in the DataFrame
    for rdf_type in df['rdf:type'].unique():
        # Filter the DataFrame to only include rows with the current RDF type
        filtered_df = df[df['rdf:type'] == rdf_type]
        
        # Initialize an empty list to store violation counts for the current RDF type
        violation_counts = []
        
        # Loop through each violation type in violations_list
        for violation in violations_list:
            # Count the number of occurrences of the current violation type
            # in the filtered DataFrame
            violation_count = filtered_df[violation].sum()
            
            # Append the violation type and its count to violation_counts
            if violation_count > 0:
                violation_counts.append((violation, violation_count))
        
        # Add the violation counts for the current RDF type to type_violation_dict
        type_violation_dict[rdf_type] = violation_counts
    
    return type_violation_dict


type_violation_dict = build_type_violation_dict(df, violations_list)
print('type_violation_dict', type_violation_dict)
      

def get_prefixes(graph: Graph):
    return {prefix: str(namespace) for prefix, namespace in graph.namespaces()}


def has_namespace(uri):
    return uri.startswith("http://") or uri.startswith("https://")


def safe_split_uri(uri, ns_dict):
    try:
        ns, _ = split_uri(uri)
        return ns_dict.get(ns, ns)
    except ValueError:
        return str(uri)


def get_prefix_ns_node_edge_counts(graph: Graph):
    # Initialize the dictionary to hold namespace information
    ns_info = {}

    # Initialize counters
    node_count = {}
    edge_count = {}

    # Collect namespaces from the graph
    ns_dict = {str(ns): prefix for prefix, ns in graph.namespaces()}

    for subject, predicate, obj in graph:
        # Extract or fall back to full URIs if split_uri fails
        subject_ns = safe_split_uri(subject, ns_dict)
        predicate_ns = safe_split_uri(predicate, ns_dict)
        object_ns = safe_split_uri(obj, ns_dict)

        # Increment counters
        node_count[subject_ns] = node_count.get(subject_ns, 0) + 1
        node_count[object_ns] = node_count.get(object_ns, 0) + 1
        edge_count[predicate_ns] = edge_count.get(predicate_ns, 0) + 1

    # Populate ns_info based on graph namespaces
    for ns, prefix in ns_dict.items():
        ns_info[prefix] = {
            "namespace": ns,
            "node_count": node_count.get(ns, 0),
            "edge_count": edge_count.get(ns, 0),
        }

    return ns_info


@router.get("/namespaces")
def send_namespace_dict():
    """
    Retrieves all the namespace prefixes used in the ontology
    along with the count of nodes and edges using each namespace.
    """
    return get_prefix_ns_node_edge_counts(g)


def shorten_dict_uris(d, prefixes):
    def shorten(uri):
        # Check if the uri is a tuple and shorten each element of the tuple
        if isinstance(uri, tuple):
            return tuple(shorten(elem) for elem in uri)
        for prefix, namespace in prefixes.items():
            if uri.startswith(namespace):
                return uri.replace(namespace, f"{prefix}:")
        return uri

    def process_item(item):
        if isinstance(item, dict):
            return {shorten(key): process_item(value) for key, value in item.items()}
        elif isinstance(item, list):
            return [process_item(value) for value in item]
        elif isinstance(item, str):
            return shorten(item)
        else:
            return item

    return process_item(d)


@router.get("/file/edge_count_dict")
async def get_edge_count_dict():
    prefixes = get_prefixes(g)  # Get the prefixes from the graph
    return serialize_nested_count_dict(shorten_dict_uris(edge_count_dict, prefixes))


@router.get("/file/focus_node_exemplar_dict")
async def get_focus_node_exemplar_dict():
    # TODO shorten uris with shorten_dict_uris then return serialized shortened dict
    prefixes = get_prefixes(g)  # Get the prefixes from the graph
    return serialize_dict_keys_and_values(shorten_dict_uris(focus_node_exemplar_dict, prefixes))


@router.get("/file/exemplar_focus_node_dict")
async def get_exemplar_focus_node_dict():
    prefixes = get_prefixes(g)  # Get the prefixes from the graph
    return serialize_dict_keys_and_values(shorten_dict_uris(exemplar_focus_node_dict, prefixes))


@router.get("/file/study")
async def read_csv_file():
    return {"data": df.to_dict(orient="records")}


@router.get("/owl:Class")
async def get_classes():
    """
    Retrieves all the classes in the ontology
    """
    return [str(g.namespace_manager.qname(c)) for c in g.subjects(predicate=RDF.type, object=OWL.Class)]  # type: ignore


@router.post("/FeatureCategorySelection")
async def get_nodes_violations_types_from_feature_categories(request: Request):
    """
    Uses the existing "df" variable of the tabulraized data to efficiently under all best practices of pandas extract:
    - The nodes (indices) that have the selected feature categories, where feature is a column of the df and category is a value of that column.
    - The value counts of this view of the df.
    """
    selected_feature_categories = await request.json()
    feature = selected_feature_categories.get("feature", [])
    categories = selected_feature_categories.get("categories", [])

    # Use pandas best practices to efficiently extract the nodes that have the selected feature categories
    selected_nodes = df[df[feature].isin(categories)].index.tolist()

    # Use pandas best practices to efficiently extract the value counts of this view of the df
    selected_df = df.loc[selected_nodes]
    selected_value_counts = {}
    for col in filtered_columns:
        selected_value_counts[col] = selected_df[col].value_counts().to_dict()

    # Return the nodes and the value counts as a dictionary
    return {"selectedNodes": selected_nodes, "valueCounts": selected_value_counts}


@router.post("/ViolationSelection")
async def get_nodes_violations_types_from_violations(request: Request):
    """
    Uses the existing "df" variable of the tabulraized data to efficiently under all best practices of pandas extract:
    - The nodes (indices) that have the selected violation feature categories, where categories are a columns of the df and we want to find those with values > 0
    - The value counts of this view of the df.
    """
    selected_feature_categories = await request.json()
    selected_feature_categories.get("feature", [])
    categories = selected_feature_categories.get("categories", [])

    selected_nodes = df[df[categories].gt(0).any(axis=1)].index.tolist()
    selected_df = df.loc[selected_nodes]

    selected_value_counts = {}
    for col in filtered_columns:
        selected_value_counts[col] = selected_df[col].value_counts().to_dict()

    # Return the nodes and the value counts as a dictionary
    return {"selectedNodes": selected_nodes, "valueCounts": selected_value_counts}


@router.post("/plot/bar/violations")
async def get_violations_bar_plot_data_given_selected_nodes(request: Request):
    selected_nodes = await request.json()  # selected_nodes is a dictionary here
    selected_nodes = selected_nodes.get("selectedNodes", [])  # Extracting the list from the dictionary

    # Select rows from df using selected_nodes as indices
    selected_df = df.loc[selected_nodes]

    # Process the selected data: for each column, count the occurrences of each category
    selection_violation_value_counts = {}
    for col in violations_list:
        selection_violation_value_counts[col] = selected_df[col].value_counts().to_dict()

    # Convert selection_value_counts into a dictionary where the key is the violation
    # and the value is the number of times (weighted sum of counts) that the violation has occurred.
    selection_violation_counts = {
        violation: sum(key * value for key, value in counts.items()) for violation, counts in selection_violation_value_counts.items()
    }

    # Compute chi square score per column
    chi_scores = {}
    chi_scores["violations"] = chi_square_score(selection_violation_counts, overall_violation_value_counts)

    # Transform the result into a format that can be used by plotly.
    plotly_data = {}
    plotly_data = {
        "selected": value_counts_to_plotly_data(selection_violation_counts, "Selected Nodes", "steelblue"),
        "overall": value_counts_to_plotly_data(overall_violation_value_counts, "Overall Distribution", "lightgrey"),
    }
    # Send the processed data to the client
    return {
        "plotlyData": {"violations": plotly_data},
        "chiScores": {"violations": chi_scores},
    }


@router.post("/plot/bar")
async def get_bar_plot_data_given_selected_nodes(request: Request):
    """
    Uses pandas best practices to process all columns of the df. each column is a predicate in the graph / a feature.
    Computes the number of occurrences of each category of each feature.
    returns: A dictionary where each key is a feature and each value is a dictionary of the form {category: count}
    """
    time.time()
    selected_nodes = await request.json()  # selected_nodes is a dictionary here
    selected_nodes = selected_nodes.get("selectedNodes", [])  # Extracting the list from the dictionary

    # Select rows from df using selected_nodes as indices
    selected_df = df.loc[selected_nodes]

    # Process the selected data: for each column, count the occurrences of each category
    selection_value_counts = {}
    for col in filtered_columns:
        selection_value_counts[col] = selected_df[col].value_counts().to_dict()

    # Compute chi square score per column
    chi_scores = {}
    for col in filtered_columns:
        chi_scores[col] = chi_square_score(selection_value_counts[col], overall_value_counts[col])

    # Transform the result into a format that can be used by plotly.
    plotly_data = {}
    for col in filtered_columns:
        plotly_data[col] = {
            "selected": value_counts_to_plotly_data(selection_value_counts[col], "Selected Nodes", "steelblue"),
            "overall": value_counts_to_plotly_data(overall_value_counts[col], "Overall Distribution", "lightgrey"),
        }

    time.time()
    # Send the processed data to the client
    return {"plotlyData": plotly_data, "chiScores": chi_scores}


def chi_square_score(selection_data, overall_data):
    """
    Computes chi square score from relative frequencies
    0 values have to be smoothed using a tiny value (e.g. 1e-7) to avoid division by 0
    Uses scipy.stats.chi2_contingency to compute the chi square score
    The first parameter of the chi2_contingency function expects:
    observedarray_like - The contingency table. The table contains the observed frequencies (i.e. number of occurrences) in each category. In the two-dimensional case, the table is often described as an “R x C table”.
    returns: the chi square score
    """
    # create observed frequency table
    categories = set(list(selection_data.keys()) + list(overall_data.keys()))
    observed = np.array(
        [selection_data.get(category, 1e-7) if selection_data.get(category, 1e-7) != 0 else 1e-7 for category in categories]
    )
    expected = np.array([overall_data.get(category, 1e-7) if overall_data.get(category, 1e-7) != 0 else 1e-7 for category in categories])

    # Compute chi-square scores
    chi2, _, _, _ = chi2_contingency([observed, expected])

    return chi2


def value_counts_to_plotly_data(value_counts, distribution_name, marker_color):
    """
    example - per feature it will look like this:
    {
        y: categories,
        x: counts,
        type: 'bar',
        orientation: 'h',
        name: distribution_name,
        marker: {
            color: marker_color
        }
    }
    """
    return {
        "y": list(value_counts.keys()),
        "x": list(value_counts.values()),
        "type": "bar",
        "orientation": "h",
        "name": distribution_name,
        "marker": {"color": marker_color},
    }


@router.get("/sub-class-of")
async def get_sub_class_of():
    """
    Retrieves all tuples with the rdfs:SubClassOf predicate using SPARQL and converts them to QNames.
    """
    g = Graph()
    g.parse(data=ttl_data, format="turtle")  # Assuming ttl_data is the turtle file content

    query = """
    SELECT ?s ?o WHERE {
        ?s rdfs:subClassOf ?o .
    }
    """

    result = []
    for row in g.query(query):
        result.append(
            {
                "s": g.namespace_manager.qname(row.s),  # type: ignore
                "p": "rdfs:subClassOf",
                "o": g.namespace_manager.qname(row.o),  # type: ignore
            }
        )

    return result


class Node:
    def __init__(self, id):
        self.id = id
        self.children = []
        self.count = 0

    def __str__(self, level=0):
        ret = "\t" * level + repr(self.id) + f' (Count: {self.count})\n'
        for child in self.children:
            ret += child.__str__(level + 1)
        return ret
    
    def to_dict(self):
        return {
            'id': self.id,
            'count': self.count,
            'children': [child.to_dict() for child in self.children]
        }


# TODO the problem is that type dict only has keys for those that have violations, because it is built from the df
def build_ontology_tree(type_violation_dict, type_count_dict, violation_exemplar_dict, g: Graph = g):
    """
    Uses rdfs:subClassOf to find nodes in the ontology tree.
    Build a tree datastructurte from this ontology.
    While doing so, uses type_violation_dict and violation_exemplar_dict to add the actual counts of violating focus nodes and cumulative counts that sum up the children counts to the nodes.
    Builds a tree of their parent/child relationship.
    Each node is defined to have the following properties:
    - id: the name of the node
    - count: the count of violating focus nodes
    Also fills a dictionary of node: count while traversing the tree.
    :param type_violation_dict: A dictionary with types as keys and a list of (violation, violation_count) as values
    :param violation_exemplar_dict: A dictionary with violations as keys with a nested dict of exemplar: exemplar_count
    :return: A tree datastructure of the ontology and a dictionary of node: count
    """

    query = """
    SELECT ?s ?o WHERE {
        ?s rdfs:subClassOf ?o .
    }
    """

    parent_child_map = defaultdict(list)
    all_type_nodes = set()  # Store all nodes
    parents = set()
    children = set()
    for row in g.query(query):
        parent = str(g.namespace_manager.qname(row.o))  # type: ignore
        child = str(g.namespace_manager.qname(row.s))  # type: ignore
        parent_child_map[parent].append(child)
        all_type_nodes.add(parent)
        all_type_nodes.add(child)
        parents.add(parent)
        children.add(child)

    roots = parents - children

    # iterate all_type_nodes and add them as keys to type_violation_dict if they are not already in there initializing them with count 0
    for node in all_type_nodes:
        if node not in type_count_dict:
            type_count_dict[node] = 0

    node_count_dict = {}
    root = Node("VirtualRoot")

    def build_sub_class_tree(current_node, parent_child_map):
        for child_id in parent_child_map[current_node.id]:
            child_node = Node(child_id)
            current_node.children.append(child_node)
            if child_id in type_count_dict:
                child_node.count = type_count_dict[child_id]
            build_sub_class_tree(child_node, parent_child_map)

    def add_violations(current_node, type_violation_dict):
        for child in current_node.children:
            add_violations(child, type_violation_dict)
        if current_node.id in type_violation_dict:
            for violation, count in type_violation_dict[current_node.id]:
                violation_node = Node(violation)
                # violation_node.count = count
                current_node.children.append(violation_node)

    def add_exemplars(current_node, violation_exemplar_dict):
        for child in current_node.children:
            add_exemplars(child, violation_exemplar_dict)
        if current_node.id in violation_exemplar_dict:
            for exemplar, exemplar_count in violation_exemplar_dict[current_node.id].items():
                exemplar_node = Node(exemplar)
                exemplar_node.count = exemplar_count
                current_node.children.append(exemplar_node)

    def compute_cumulative_counts(current_node, type_violation_dict, violation_exemplar_dict):
        for child in current_node.children:
            compute_cumulative_counts(child, type_violation_dict, violation_exemplar_dict)

        if current_node.id in all_type_nodes:  # Current node is a 'type' node
            for child in current_node.children: 
                if child.id in all_type_nodes:
                    current_node.count += child.count  # Use child.count directly

        elif current_node.id in violation_exemplar_dict:  # Current node is a 'violation' node
            for child in current_node.children:  # Children are 'exemplar' nodes
                current_node.count += child.count  # Use child.count directly
        # else:  # Current node is an 'exemplar' node

        node_count_dict[current_node.id] = current_node.count


    # Start from the actual roots of the subclass tree and build the tree upwards
    for actual_root in roots:
        root_node = Node(actual_root)
        root.children.append(root_node)
        build_sub_class_tree(root_node, parent_child_map)

    for node in root.children:
        add_violations(node, type_violation_dict)
        for violation_node in node.children:
            add_exemplars(violation_node, violation_exemplar_dict)

    compute_cumulative_counts(root, type_violation_dict, violation_exemplar_dict)

    return root, node_count_dict


ontology_tree, node_count_dict = build_ontology_tree(type_violation_dict, type_count_dict, violation_exemplar_dict, g)
print(ontology_tree)
print(node_count_dict)


@router.get("/get_ontology_tree")
async def get_ontology_tree():
    if ontology_tree is None:
        return {"error": "Ontology tree not built yet"}

    serializable_tree = ontology_tree.to_dict()
    return serializable_tree


@router.get("/get_node_count_dict")
async def get_type_node_count_dict():
    if node_count_dict is None:
        return {"error": "node count dict not built yet"}
    
    return node_count_dict


@router.get("/get_violation_exemplar_dict")
async def get_violation_exemplar_dict():
    if violation_exemplar_dict is None:
        return {"error": "Violation exemplar dict not built yet"}

    return violation_exemplar_dict


@router.get("/get_type_violation_dict")
async def get_type_violation_dict():
    if violation_exemplar_dict is None:
        return {"error": "Type violation dict not built yet"}

    return type_violation_dict


# TODO: execute this in preprocessing already
@router.get("/file/ontology")
def get_ttl_file(response: Response):
    """
    sends the contents of the ttl file serialized to the client
    """
    response.headers["Content-Disposition"] = "attachment; filename=omics_model.ttl"
    return Response(content=ttl_data, media_type="text/turtle")


def uri_to_qname(graph, uri):
    try:
        return graph.namespace_manager.qname(uri)
    except ValueError:
        print("uri_to_qname failed for uri:", uri)
        return uri


@router.get("/violation_path_nodes_dict")
def get_violation_path_nodes_dict():
    """
    Uses the graph object to compute 2 dictionaries and returns them:
    1. A dictionary with types (o2) as keys and the nodes (s1 and o1) as values that need to be visible to show the path to the violating violations.
    2. A dictionary with violations (o1) as keys and the nodes (s1 and o2) as values that need to be visible to show the path to the types.

    Returns:
        dict: A dictionary with either types or violations as keys and corresponding nodes as values.
    """

    qres = g.query(
        """
        SELECT ?s1 ?o1 ?o2
        WHERE {
            ?s1 a sh:NodeShape .
            ?s1 sh:property ?o1 .
            ?s1 sh:targetClass ?o2 .
            ?o1 a sh:PropertyShape .
            ?o2 a owl:Class .
        }
        """
    )

    class_prop_d = defaultdict(set)
    prop_class_d = defaultdict(set)

    for row in qres:
        ns, ps, c = row  # type: ignore
        ns_q = uri_to_qname(g, ns)
        ps_q = uri_to_qname(g, ps)
        c_q = uri_to_qname(g, c)

        # Add elements to sets
        class_prop_d[c_q].add(ns_q)  # type: ignore
        class_prop_d[c_q].add(ps_q)  # type: ignore

        prop_class_d[ps_q].add(ns_q)  # type: ignore
        prop_class_d[ps_q].add(c_q)  # type: ignore

    # Convert sets back to lists
    class_prop_d = {key: list(val) for key, val in class_prop_d.items()}
    prop_class_d = {key: list(val) for key, val in prop_class_d.items()}

    return {"class_property_d": class_prop_d, "property_class_d": prop_class_d}


@router.get("/violation_list")
async def get_violation_list():
    return violations_list


@router.get("/file/json/{file_path}")
async def read_file(file_path: str):
    file_path = os.path.join("bikg_app/json", file_path)

    # check whether file path exists
    if not os.path.exists(file_path):
        print("file does not exist:", file_path)
        return {"data": []}

    # load file_path and return it
    with open(file_path, "rb") as json_file:
        return json.load(json_file)

# routes.py
import json
import os
from collections import defaultdict
import time
import numpy as np
import pandas as pd
from fastapi import APIRouter, Request, Response
from rdflib import Graph, Namespace
from rdflib.namespace import split_uri
from scipy.stats import chi2_contingency

from bikg_app.routers.utils import load_edge_count_json, load_uri_set_of_uris_dict, serialize_edge_count_dict, serialize_focus_node_exemplar_dict

SH = Namespace("http://www.w3.org/ns/shacl#")
OWL = Namespace("http://www.w3.org/2002/07/owl#")

# File paths
VIOLATIONS_FILE_PATH = os.path.join("bikg_app/json", "violation_list.json")
STUDY_CSV_FILE_PATH = "bikg_app/csv/study.csv"
ONTOLOGY_TTL_FILE_PATH = "bikg_app/ttl/omics_model_union_violation_exemplar.ttl"
EXEMPLAR_EDGE_COUNT_JSON_PATH = 'bikg_app/json/exemplar_edge_count_dict.json'
FOCUS_NODE_EXEMPLAR_DICT_JSON_PATH = 'bikg_app/json/focus_node_exemplar_dict.json'
EXEMPLAR_FOCUS_NODE_DICT_JSON_PATH = 'bikg_app/json/exemplar_focus_node_dict.json'

# load the violations
assert os.path.exists(VIOLATIONS_FILE_PATH)
with open(VIOLATIONS_FILE_PATH, "rb") as f:
    violations_list = json.load(f)

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

overall_violation_value_counts = {
    violation: sum(key * value for key, value in counts.items()) for violation, counts in overall_violation_value_dict.items()
}

# load the edge_count_dict that gives edge counts within each exemplar
edge_count_dict = load_edge_count_json(EXEMPLAR_EDGE_COUNT_JSON_PATH)
# load the focus_node_exemplar_dict that gives the exemplars for each focus node
focus_node_exemplar_dict = load_uri_set_of_uris_dict(FOCUS_NODE_EXEMPLAR_DICT_JSON_PATH)
# exemplar_focus_node_dict that gives the focus node for each exemplar
exemplar_focus_node_dict = load_uri_set_of_uris_dict(EXEMPLAR_FOCUS_NODE_DICT_JSON_PATH)

router = APIRouter()


def get_prefixes(graph: Graph):
    return {prefix: str(namespace) for prefix, namespace in graph.namespaces()}


def split_uri_or_omics(uri):
    if uri.startswith("http://data.boehringer.com/ontology/omics/"):
        return "omics", ""
    return split_uri(uri)


def get_prefix_ns_node_edge_counts(graph: Graph):
    # Initialize the dictionary to hold namespace information
    ns_info = {}

    # Initialize counters
    node_count = {}
    edge_count = {}

    for subject, predicate, obj in graph:
        try:
            subject_ns, _ = split_uri_or_omics(subject)
            predicate_ns, _ = split_uri_or_omics(predicate)
            object_ns, _ = split_uri_or_omics(obj)
        except Exception:
            # exceptions are numbers such as 0, 1 which have no namespace
            continue

        # Note that this counts subjects/objects multiple times if they have multiple edges
        if subject_ns:
            node_count[subject_ns] = node_count.get(subject_ns, 0) + 1
        if object_ns:
            node_count[object_ns] = node_count.get(object_ns, 0) + 1
        if predicate_ns:
            edge_count[predicate_ns] = edge_count.get(predicate_ns, 0) + 1

    # Populate ns_info
    for prefix, namespace in graph.namespaces():
        ns_str = str(namespace)
        ns_info[prefix] = {
            "namespace": ns_str,
            "node_count": node_count.get(ns_str, 0),
            "edge_count": edge_count.get(ns_str, 0)
        }

    # Special handling for 'omics'
    if "omics" in node_count or "omics" in edge_count:
        ns_info["omics"] = {
            "namespace": "http://data.boehringer.com/ontology/omics/",
            "node_count": node_count.get("omics", 0),
            "edge_count": edge_count.get("omics", 0)
        }

    print("ns_info:", ns_info)

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
        try:
            # Check if the uri is a tuple and shorten each element of the tuple
            if isinstance(uri, tuple):
                return tuple(shorten(elem) for elem in uri)
            for prefix, namespace in prefixes.items():
                if uri.startswith(namespace):
                    return uri.replace(namespace, f"{prefix}:")
            return uri
        except Exception as e:
            print("Error shortening URI:", uri, "Error:", str(e))
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


@router.get("/file/edge_count_dict", response_model=dict)
async def get_edge_count_dict():
    prefixes = get_prefixes(g)  # Get the prefixes from the graph
    return serialize_edge_count_dict(shorten_dict_uris(edge_count_dict, prefixes))


@router.get("/file/focus_node_exemplar_dict", response_model=dict)
async def get_focus_node_exemplar_dict():
    # TODO shorten uris with shorten_dict_uris then return serialized shortened dict
    prefixes = get_prefixes(g)  # Get the prefixes from the graph
    return serialize_focus_node_exemplar_dict(shorten_dict_uris(focus_node_exemplar_dict, prefixes))


@router.get("/file/exemplar_focus_node_dict", response_model=dict)
async def get_exemplar_focus_node_dict():
    prefixes = get_prefixes(g)  # Get the prefixes from the graph
    return serialize_focus_node_exemplar_dict(shorten_dict_uris(exemplar_focus_node_dict, prefixes))


@router.get("/file/study")
async def read_csv_file():
    return {"data": df.to_dict(orient="records")}


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
    for column in filtered_columns:
        selected_value_counts[column] = selected_df[column].value_counts().to_dict()

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
    for column in filtered_columns:
        selected_value_counts[column] = selected_df[column].value_counts().to_dict()

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
    for column in violations_list:
        selection_violation_value_counts[column] = selected_df[column].value_counts().to_dict()

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
    return {"plotlyData": {"violations": plotly_data}, "chiScores": {"violations": chi_scores}}


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
    for column in filtered_columns:
        selection_value_counts[column] = selected_df[column].value_counts().to_dict()

    # Compute chi square score per column
    chi_scores = {}
    for column in filtered_columns:
        chi_scores[column] = chi_square_score(selection_value_counts[column], overall_value_counts[column])

    # Transform the result into a format that can be used by plotly.
    plotly_data = {}
    for column in filtered_columns:
        plotly_data[column] = {
            "selected": value_counts_to_plotly_data(selection_value_counts[column], "Selected Nodes", "steelblue"),
            "overall": value_counts_to_plotly_data(overall_value_counts[column], "Overall Distribution", "lightgrey"),
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


# TODO: execute this in preprocessing already
@router.get("/file/ontology")
def get_ttl_file(response: Response):
    """
    sends the contents of the ttl file serialized to the client
    """
    global g
    ttl_data = g.serialize(format="turtle")

    response.headers["Content-Disposition"] = "attachment; filename=omics_model.ttl"
    return Response(content=ttl_data, media_type="text/turtle")


def uri_to_qname(graph, uri):
    try:
        return graph.namespace_manager.qname(uri)
    except Exception:
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
    with open(file_path, "rb") as f:
        return json.load(f)

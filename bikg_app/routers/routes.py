# routes.py
from fastapi import APIRouter, Response, Request
from fastapi.responses import FileResponse
from rdflib import Graph, Namespace
import pandas as pd
import numpy as np
import json
import os
from time import time
from scipy.stats import chi2_contingency

df = pd.read_csv("bikg_app/csv/study.csv", index_col=0)
df = df.replace(np.nan, 'nan', regex=True)
filtered_columns = [column for column in df.columns if column not in ['x', 'y']]
overall_value_counts = {}
for column in filtered_columns:
    overall_value_counts[column] = df[column].value_counts().to_dict()

router = APIRouter()

@router.get("/file/study")
async def read_csv_file():
    return {"data": df.to_dict(orient="records")}


@router.post("/plot/bar")
async def get_bar_plot_data_given_selected_nodes(request: Request):
    """
        Uses pandas best practices to process all columns of the df. each column is a predicate in the graph / a feature.
        Computes the number of occurrences of each category of each feature.
        returns: A dictionary where each key is a feature and each value is a dictionary of the form {category: count}
    """
    start = time()
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
        plotly_data[column] = {'selected': value_counts_to_plotly_data(selection_value_counts[column], 'Selected Nodes', 'steelblue'), 'overall': value_counts_to_plotly_data(overall_value_counts[column], 'Overall Distribution', 'lightgrey')}

    end = time()
    # Send the processed data to the client    
    return {"plotly_data": plotly_data, "chi_scores": chi_scores}


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
    observed = np.array([selection_data.get(category, 1e-7) for category in categories])
    expected = np.array([overall_data.get(category, 1e-7) for category in categories])

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
        'y': list(value_counts.keys()),
        'x': list(value_counts.values()),
        'type': 'bar',
        'orientation': 'h',
        'name': distribution_name,
        'marker': {
            'color': marker_color
        }
    }


@router.get("/file/ontology")
def get_ttl_file(response: Response):
    """
    sends the contents of the ttl file serialized to the client
    """
    with open("bikg_app/ttl/omics_model.ttl", "r") as file:
        response.headers["Content-Disposition"] = "attachment; filename=omics_model.ttl"
        return Response(content=file.read(), media_type="text/turtle")
        

@router.get("/file/json/{file_path}")
async def read_file(file_path: str):
    file_path = os.path.join("bikg_app/json", file_path)
    
    # check whether file path exists
    if not os.path.exists(file_path):
        print('file does not exist:', file_path)
        return {"data": []}

    # load file_path and return it
    with open(file_path, "rb") as f:
        return json.load(f)
    
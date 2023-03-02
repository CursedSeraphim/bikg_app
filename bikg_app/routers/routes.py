from fastapi import APIRouter
from rdflib import Graph
import pandas as pd
import numpy as np
import json
import os

router = APIRouter()

# TODO consider removing this route
@router.get("/csv/file/{file_path}")
async def read_csv_file(file_path: str):
    file_path = os.path.join("bikg_app/csv", file_path)
    print('csv being fetched', file_path)
    df = pd.read_csv(file_path)
    return {"data": df.to_dict(orient="records")}


@router.get("/file/{file_path}")
async def read_file(file_path: str):
    file_path = os.path.join("bikg_app/json", file_path)
    print('file being fetched', file_path)
    
    # check whether file path exists
    if not os.path.exists(file_path):
        print('file does not exist:', file_path)
        return {"data": []}

    # load file_path and return it
    with open(file_path, "rb") as f:
        return json.load(f)
        

@router.post('/VegaRequest/{file_path}')
async def get_filtered_csv(file_path: str, data: dict):
    """
    The file_path should point to a csv.
    The csv should have a column called focus_node.
    This method filters the csv using the focus_node column based on the nodes received.
    It provides a json spec that can be used as data for a vegalite chart.
    
    params:
        file_path: str
        data: dict containing list of nodes
    
    returns:
        json spec for a vegalite chart, containing occurrences of a categorical variable among the filtered nodes
    """
    file_path = os.path.join("bikg_app/csv", file_path)

    # if file does not exist return empty vega json spec
    if not os.path.exists(file_path):
        print('file does not exist:', file_path)
        return {"data": []}

    nodeList = data['nodes']

    # read the csv file into a pandas dataframe
    df = pd.read_csv(file_path)

    # filter the dataframe based on the focus_node column and the received nodes
    filtered_df = df[df['focus_node'].isin(nodeList)]

    # the df contains the column http://www.w3.org/1999/02/22-rdf-syntax-ns#type
     # count the occurrences of unique values in the column
    counts = filtered_df['http://www.w3.org/1999/02/22-rdf-syntax-ns#type'].value_counts()

    # convert counts to a list
    counts_list = counts.tolist()

    # create a dictionary to store the results
    results = {'values': [], 'counts': []}

    # iterate over the unique values and their counts, and add them to the dictionary
    for value, count in zip(counts.index, counts_list):
        results['values'].append(value)
        results['counts'].append(count)

    # results is now of the shape {'values': ['http://data.boehringer.com/ontology/omics/TranscriptOmicsSample', 'http://data.boehringer.com/ontology/omics/Donor', 'http://data.boehringer.com/ontology/omics/PrimaryCellSpecimen'], 'counts': [2, 1, 1]}

    # create a json spec for a vegalite chart using the results. the chart should be a horizontal bar chart with a bar for each unique value, and the height of the bar should be proportional to the count of the value
    # first create a dataframe from the dictionary of results
    df_results = pd.DataFrame.from_dict(results)

    # create the Vega Lite spec
    chart_spec = {
        "$schema": "https://vega.github.io/schema/vega-lite/v5.json",
        "data": {"values": df_results.to_dict("records")},
        "mark": "bar",
        "encoding": {
            "y": {
                "field": "values",
                "type": "nominal",
                "sort": {"op": "sum", "field": "counts", "order": "descending"}
            },
            "x": {
                "field": "counts",
                "type": "quantitative",
                "axis": {"title": "Count"}
            }
        }
    }
    
    return chart_spec

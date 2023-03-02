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
    nodeList = data['nodes']
    print('file_path received', file_path)
    print('nodes received', nodeList)

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

    # create a json spec for a vegalite chart using the results
    chart_spec = {
        'mark': 'bar',
        'encoding': {
            'x': {'field': 'values', 'type': 'nominal'},
            'y': {'field': 'counts', 'type': 'quantitative'}
        },
        'data': {'values': [{'values': results['counts'], 'values_2': results['values']}]},
    }

    return chart_spec

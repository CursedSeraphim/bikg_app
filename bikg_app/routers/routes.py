from fastapi import APIRouter, Response
from fastapi.responses import FileResponse
from rdflib import Graph, Namespace
import pandas as pd
import numpy as np
import json
import os
import time

router = APIRouter()

# TODO consider removing this route
@router.get("/file/csv/{file_path}")
async def read_csv_file(file_path: str):
    file_path = os.path.join("bikg_app/csv", file_path)

    # check whether file path exists
    if not os.path.exists(file_path):
        print('file does not exist:', file_path)
        return {"data": []}

    df = pd.read_csv(file_path)
    # print(df.head(5))
    # convert problematic float values to strings
    # df = df.applymap(lambda x: str(x) if isinstance(x, np.floating) and np.isnan(x) else x)
    # replace nan values
    df = df.replace(np.nan, 'nan', regex=True)
    return {"data": df.to_dict(orient="records")}

RDFS = Namespace('http://www.w3.org/2000/01/rdf-schema#')

@router.get("/file/ontology")
def get_ttl_file(response: Response):
    """
    sends the contents of the ttl file serialized to the client
    """
    with open("bikg_app/rdf/omics_model.ttl", "r") as file:
        response.headers["Content-Disposition"] = "attachment; filename=omics_model.ttl"
        return Response(content=file.read(), media_type="text/turtle")
        


@router.get("/file/ontologyold")
async def read_ontology_old():
    file_path = os.path.join("bikg_app/rdf", "omics_model.ttl")
    
    # check whether file path exists
    if not os.path.exists(file_path):
        print('file does not exist:', file_path)
        return {"data": []}
    
    
    # if bikg_app/json/ontology.json doesn't exist, create it
    if not os.path.exists('bikg_app/json/ontology.json'):
        # create an RDF graph and parse the ontology file
        g = Graph()
        g.parse(file_path, format='ttl')

        # filter the graph to include only relations with rdfs:subClassOf
        filtered_triples = [(s, p, o) for s, p, o in g.triples((None, RDFS.subClassOf, None))]

        # create a dictionary with the filtered graph and save it as json
        filtered_dict = {"data": []}
        for s, p, o in filtered_triples:
            filtered_dict["data"].append({
                "subject": str(s),
                "predicate": str(p),
                "object": str(o)
            })
        with open('bikg_app/json/ontology.json', "w") as f:
            json.dump(filtered_dict, f)

    # return the filtered ontology
    with open('bikg_app/json/ontology.json', "r") as f:
        return json.load(f)
    

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
            },
            "tooltip": [
                {"field": "values", "type": "nominal"},
                {"field": "counts", "type": "quantitative"}
            ]
        }
    }
    end_time = time.time()
    return chart_spec

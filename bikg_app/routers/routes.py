# routes.py
from fastapi import APIRouter, Response
from fastapi.responses import FileResponse
from rdflib import Graph, Namespace
import pandas as pd
import numpy as np
import json
import os

router = APIRouter()

@router.get("/file/csv/{file_path}")
async def read_csv_file(file_path: str):
    file_path = os.path.join("bikg_app/csv", file_path)

    # check whether file path exists
    if not os.path.exists(file_path):
        print('file does not exist:', file_path)
        return {"data": []}

    df = pd.read_csv(file_path)
    df = df.replace(np.nan, 'nan', regex=True)
    return {"data": df.to_dict(orient="records")}

RDFS = Namespace('http://www.w3.org/2000/01/rdf-schema#')


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
        
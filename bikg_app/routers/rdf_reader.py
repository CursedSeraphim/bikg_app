# A new Python file in this FastAPI project to define an endpoint for reading RDF files from a folder
# In this new Python file, we can use Python's RDFLib library to read the RDF files from the folder and process the data as needed.

from fastapi import APIRouter
from rdflib import Graph
import pandas as pd
import os

router = APIRouter()

@router.get("/rdf/file/{file_path}")
async def read_rdf_file(file_path: str):
    file_path = os.path.join("bikg_app/rdf", file_path)  # Construct the full file path
    print(f"Reading RDF file: {file_path}")
    with open(file_path, "rb") as f:
        g = Graph().parse(data=f.read(), format="turtle")
    print(f"Number of triples: {len(g)}")
    return {"data": g.serialize(format="ttl")}

@router.get("/csv/file/{file_path}")
async def read_csv_file(file_path: str):
    file_path = os.path.join("bikg_app/csv", file_path)
    print('csv being fetched', file_path)
    df = pd.read_csv(file_path)
    # return as csv
    # return {"data": df.to_csv()}
    return {"data": df.to_dict(orient="records")}

# @router.get("/rdf/file/{file_path}")
# async def read_rdf_file(file_path: str):
#     file_path = os.path.join("bikg_app/rdf", file_path)  # Construct the full file path
#     with open(file_path, "rb") as f:
#         g = Graph().parse(data=f.read(), format="turtle")
#         # subsample 
#     return {"data": g.serialize(format="ttl")}
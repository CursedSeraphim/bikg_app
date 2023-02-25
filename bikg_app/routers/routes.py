from fastapi import APIRouter
from rdflib import Graph
import pandas as pd
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
        
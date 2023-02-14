# A new Python file in this FastAPI project to define an endpoint for reading RDF files from a folder and to import functionality from here into the main FastAPI file.
# In this new Python file, we can use Python's RDFLib library to read the RDF files from the folder and process the data as needed.

from fastapi import APIRouter
from rdflib import Graph
import os

router = APIRouter()

@router.get("/rdf/{folder_path}")
async def read_rdf_files(folder_path: str):
    print(f"Reading RDF files from folder: {folder_path}")
    g = Graph()
    for filename in os.listdir(folder_path):
        print(f"Reading file: {filename}")
        if filename.endswith(".rdf"):
            file_path = os.path.join(folder_path, filename)
            print(f"File path: {file_path}")
            with open(file_path, "rb") as f:
                print(f"Reading file: {file_path}")
                g.parse(data=f.read(), format="application/rdf+xml")
    print(f"Number of triples: {len(g)}")
    return {"data": g.serialize(format="json-ld").decode("utf-8")}


@router.get("/rdf/file/{file_path}")
async def read_rdf_file(file_path: str):
    file_path = os.path.join("bikg_app/rdf", file_path)  # Construct the full file path
    print(f"Reading RDF file: {file_path}")
    with open(file_path, "rb") as f:
        g = Graph().parse(data=f.read(), format="turtle")
    print(f"Number of triples: {len(g)}")
    return {"data": g.serialize(format="json-ld")}



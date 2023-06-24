import os
import sys
from fastapi import Request
from fastapi.middleware.cors import CORSMiddleware
# import requests

from tdp_core.server.visyn_server import create_visyn_server
from routers.routes import router as rdf_router

# This app is either started via the uvicorn runner in __main__.py,
# or as module to execute commands via `python -m <app>.dev_app db-migration exec ...`
app = create_visyn_server(
    start_cmd=" ".join(sys.argv[1:]), workspace_config={"_env_file": os.path.join(os.path.dirname(os.path.realpath(__file__)), ".env")}
)

origins = [
    "*",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# @app.middleware("http")
# async def log_requests(request: Request, call_next):
#     print(f"Incoming request: {request.method} {request.url.path}")
#     response = await call_next(request)
#     return response

# print(f"Adding router for reading RDF files from folder: {folder_path}")
app.include_router(rdf_router)

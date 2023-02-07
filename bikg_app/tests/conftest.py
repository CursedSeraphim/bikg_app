import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient
from tdp_core.server.visyn_server import create_visyn_server
from tdp_core.tests.fixtures.postgres_db import postgres_db

assert postgres_db  # silence unused import warning


@pytest.fixture(scope="session")
def app(postgres_db) -> FastAPI:
    return create_visyn_server(workspace_config={"tdp_core": {"enabled_plugins": ["tdp_core", "bikg_app"]}, "bikg_app": {}})


@pytest.fixture(scope="session")
def client(app):
    with TestClient(app) as c:
        yield c

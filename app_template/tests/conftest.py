import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient
from visyn_core.server.visyn_server import create_visyn_server
from visyn_core.tests.fixtures.postgres_db import postgres_db

assert postgres_db  # silence unused import warning


@pytest.fixture(scope="session")
def app(postgres_db) -> FastAPI:
    return create_visyn_server(workspace_config={"visyn_core": {"enabled_plugins": ["visyn_core", "app_template"]}, "app_template": {}})


@pytest.fixture(scope="session")
def client(app):
    with TestClient(app) as c:
        yield c

from fastapi.testclient import TestClient


def test_post_violations(client: TestClient):
    assert client.post("/api/bikg/plot/bar/violations", json={"selectedNodes": []}).status_code == 200

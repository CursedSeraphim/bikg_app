from fastapi.testclient import TestClient


def test_get_example(client: TestClient):
    assert client.get("/api/bikg/example").json() == {"message": "example"}

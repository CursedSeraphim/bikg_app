from fastapi.testclient import TestClient


def test_get_example(client: TestClient):
    response = client.get("/api/bikg/example")
    assert response.status_code == 200
    assert response.json() == {"message": "example"}

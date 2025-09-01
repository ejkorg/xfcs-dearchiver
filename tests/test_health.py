import json
from fastapi.testclient import TestClient
from backend.main import app


def test_health():
    client = TestClient(app)
    r = client.get("/api/health")
    assert r.status_code == 200
    data = r.json()
    assert data.get("status") == "ok"


def test_envs_endpoint_available():
    client = TestClient(app)
    r = client.get("/api/envs")
    assert r.status_code == 200
    assert isinstance(r.json(), list)

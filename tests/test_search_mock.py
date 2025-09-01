import os
from pathlib import Path

from fastapi.testclient import TestClient


def test_search_with_mock(monkeypatch):
    # Create a YAML pointing to mock dirs
    cfg_yaml = Path('backend/config.yaml')
    yaml = cfg_yaml.read_text()
    # Use environment variables to override paths at runtime
    monkeypatch.setenv('XFCS__ARCHIVES_ROOT', str(Path('mock/archives').resolve()))
    monkeypatch.setenv('XFCS__DATA_ROOT', str(Path('mock/data').resolve()))
    monkeypatch.setenv('XFCS__TEMp_DIR', str(Path('mock/tmp').resolve()))
    monkeypatch.setenv('XFCS__ENVS_CONFIG', str(Path('mock/mock_env.conf').resolve()))

    # Import after env is set
    from backend.main import app
    client = TestClient(app)

    payload = {
        "criteria": [
            {"lot_id": "FAKELOT123", "env": "demo_sort_eagle", "year": 2020, "month": "Jan"}
        ]
    }
    r = client.post('/api/archive/search', json=payload)
    assert r.status_code == 200
    data = r.json()
    assert 'results' in data
    results = data['results']
    assert len(results) == 1
    lot = results[0]
    assert lot['lot_id'] == 'FAKELOT123'
    # Our fake file should be found
    assert lot['raw_count'] >= 1

# xfcs-dearchiver – FastAPI + Vue (Vite)

This branch contains a modern FastAPI backend and a Vue 3 + Vite frontend, porting the legacy CGI flow to a typed, testable SPA + REST architecture.

## Project layout
- `backend/` – FastAPI app, pydantic settings, services, and endpoints
- `frontend/` – Vue 3 app (Vite). Dev server proxies `/api` to the backend on port 8000
- `mock/` – Small mock dataset and `mock_env.conf` for local/dev testing
- `tests/` – Pytest suite (includes a mock-backed search test)

## Backend quickstart (with mock data)

Create a virtualenv and install deps:

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -e .[dev]
```

Run FastAPI using the mock dataset:

```bash
XFCS__ARCHIVES_ROOT=$(pwd)/mock/archives \
XFCS__DATA_ROOT=$(pwd)/mock/data \
XFCS__ENVS_CONFIG=$(pwd)/mock/mock_env.conf \
uvicorn backend.main:app --host 127.0.0.1 --port 8000 --reload
```

Check health:

```bash
curl http://127.0.0.1:8000/api/health
```

Example search request:

```bash
curl -X POST http://127.0.0.1:8000/api/archive/search \
	-H 'Content-Type: application/json' \
	-d '{"criteria":[{"lot_id":"FAKELOT123","env":"demo_sort_eagle","year":2020,"month":"Jan"}]}'
```

## Frontend quickstart

```bash
cd frontend
npm ci
npm run dev
```

Open http://localhost:5173. The dev server proxies `/api` to `http://127.0.0.1:8000`.

## Run tests

```bash
source .venv/bin/activate
pytest -q
```

CI runs backend tests and frontend build on pushes and pull requests (see `.github/workflows/ci.yml`).

## Notes
- Configuration sources precedence: init kwargs > environment variables (supports both `XFCS__FIELD` and `XFCS_FIELD`) > YAML (`backend/config.yaml`) > dotenv > file secrets.
- The `mock/` tree includes a small reproducible dataset so searches (e.g., `FAKELOT123`) return a result.

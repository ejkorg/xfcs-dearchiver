# xfcs-dearchiver (migration scaffold)

This branch adds a modern FastAPI backend and Vue 3 + Vite frontend scaffold to replace legacy CGI + frames.

## Layout
- `backend/`: FastAPI app with basic endpoints and docs.
- `frontend/`: Vue 3 + Vite SPA scaffold. Dev server proxies `/api` to backend.
- `tests/`: Minimal pytest for backend health.

## Quickstart

Backend (FastAPI):

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r backend/requirements.txt
uvicorn backend.main:app --reload --port 8000
```

Frontend (Vue + Vite):

```bash
cd frontend
npm install
npm run dev
```

Then open http://localhost:5173 and test the search form; it calls `/api/lotid`.

## Next steps
- Port each CGI in `cgi-bin/` into typed FastAPI routes.
- Replace frames with Vue Router views and move static assets into `frontend/public/` or `src/assets/`.
- Add Pydantic models and error handling. Write tests for each endpoint.

# Backend (FastAPI)

Dev quickstart:

1. Create venv and install deps

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r backend/requirements.txt
```

2. Run the server

```bash
uvicorn backend.main:app --reload --port 8000
```

3. Visit
- Health: http://localhost:8000/api/health
- Docs: http://localhost:8000/docs

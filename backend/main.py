from fastapi import FastAPI, Query, UploadFile, File, HTTPException, Body
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from typing import List
from pathlib import Path

app = FastAPI(title="xfcs-dearchiver API", version="0.1.0")

# Dev CORS; tighten in prod
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

from .config import Settings

def get_settings() -> Settings:
    # construct a fresh Settings so that env var overrides (including test monkeypatch)
    # are always respected at request time
    return Settings()
from .models import (
    EnvInfo,
    FileEntry,
    LotSearchResult,
    MonitorRequest,
    MonitorResponse,
    MonitorResponseItem,
    ReloadRequest,
    ReloadResponse,
    SearchRequest,
    SearchResponse,
)
from .services import load_envs, find_files, human_size, reload_file_to_env, monitor_loaded

# Note: We intentionally do not cache envs at import time because tests or runtime
# may override environment variables after import. We'll load envs on-demand.


@app.get("/api/health")
def health():
    return {"status": "ok"}


@app.get("/api/envs", response_model=List[EnvInfo])
def list_envs():
    s = get_settings()
    _ENVS = load_envs(settings=s)
    results: List[EnvInfo] = []
    for env, rec in _ENVS.items():
        results.append(
            EnvInfo(
                name=env,
                site=rec.site,
                yr_from=rec.yr_from,
                yr_to=rec.yr_to,
                active=rec.active,
                tester=rec.tester,
            )
        )
    return results


@app.post("/api/archive/search", response_model=SearchResponse)
def search_archive(payload: SearchRequest = Body(...)):
    # Emulate edbWebDearchive.pl -s
    s = get_settings()
    _ENVS = load_envs(settings=s)
    # settings loaded from environment and YAML; envs loaded on-demand
    results: List[LotSearchResult] = []
    # Prepare lotid list for matching
    lot_ids = [c.lot_id.strip().strip("*?") for c in payload.criteria if c.lot_id.strip()]
    # Build paths from env+year+month
    paths_set = set()
    for c in payload.criteria:
        envs = []
        if c.env == "All":
            # Use all envs mentioned in env.conf
            envs = list(_ENVS.keys())
        elif isinstance(c.env, list):
            envs = c.env
        else:
            envs = [c.env]
        years: List[str]
        if str(c.year).lower() == "all":
            # use whole env range
            years = []
        else:
            years = [str(c.year)]
        months: List[str]
        if str(c.month).lower() == "all":
            months = []
        else:
            months = [str(c.month)]
        for e in envs:
            env_rec = _ENVS.get(e)
            if not env_rec:
                continue
            years_list = years or [str(y) for y in range(env_rec.yr_from, env_rec.yr_to + 1)]
            months_list = months or s.months
            # Always include env root as fallback
            env_root = s.archives_root / env_rec.site / e
            paths_set.add(env_root)
            for y in years_list:
                for m in months_list:
                    paths_set.add(s.archives_root / env_rec.site / e / y / m)

    # Search for matching files under the constructed directories
    unique_files = find_files(list(paths_set), lot_ids, settings=s)

    # Aggregate per lotid
    lot_map = {lot: LotSearchResult(lot_id=lot) for lot in lot_ids}
    for f in unique_files:
        size = human_size(f)
        # derive lot id match
        name = f.name
        for lot in lot_ids:
            if lot.lower() in name.lower():
                lot_rec = lot_map[lot]
                lot_rec.raw_files.append(FileEntry(path=str(f), size=size))
                lot_rec.raw_count += 1
                # derive env and set active flag
                # Expect: <archives_root>/<site>/<env>/<year>/<month>/<file>
                env = None
                try:
                    rel = f.resolve().relative_to(s.archives_root.resolve())
                    # rel parts: <site>/<env>/...
                    if len(rel.parts) >= 2:
                        env = rel.parts[1]
                except Exception:
                    # fallback to heuristic index
                    parts = f.parts
                    if len(parts) > 3:
                        env = parts[3]
                if env:
                    env_rec = _ENVS.get(env)
                    if env_rec:
                        lot_rec.active = env_rec.active
                break

    return SearchResponse(results=list(lot_map.values()))


@app.post("/api/files/download")
def download_files(files: List[str] = Body(..., embed=True)):
    # Zip selected files into a temp zip and return the zip
    import tempfile
    import zipfile
    from pathlib import Path

    if not files:
        raise HTTPException(status_code=400, detail="No files provided")
    s = get_settings()
    tmp_dir = Path(tempfile.mkdtemp(prefix="xfcs-zip-", dir=str(s.temp_dir)))
    zip_path = tmp_dir / "Exensio_Files.zip"
    try:
        with zipfile.ZipFile(zip_path, "w", compression=zipfile.ZIP_DEFLATED) as zf:
            for f in files:
                p = Path(f)
                if p.exists():
                    zf.write(p, arcname=p.name)
        return FileResponse(str(zip_path), media_type="application/zip", filename=zip_path.name)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to zip files: {e}")


@app.post("/api/reload", response_model=ReloadResponse)
def reload_files(payload: ReloadRequest):
    # Copy files into env dearchive and move into env to trigger processing.
    import time
    s = get_settings()
    envs_to_monitor = set()
    lotids_to_monitor = set()
    first_time: int | None = None
    for f in payload.files:
        p = Path(f)
        if not p.exists():
            # skip missing
            continue
        # env is part[3], lotid from filename simple heuristic: letters+digits sequence
        parts = p.parts
        if len(parts) > 3:
            envs_to_monitor.add(parts[3])
        # naive lotid extraction: split on underscores and take first token with digit
        for token in p.stem.split("_"):
            if any(ch.isdigit() for ch in token):
                lotids_to_monitor.add(token)
                break
        ts = reload_file_to_env(p, settings=s)
        if first_time is None or ts < first_time:
            first_time = ts
    if first_time is None:
        first_time = int(time.time())
    return ReloadResponse(
        reload_time=first_time,
        selected_envs=sorted(envs_to_monitor),
        monitor_lotids=sorted(lotids_to_monitor),
        message="Reload initiated. Monitoring available via /api/monitor.",
    )


@app.post("/api/monitor", response_model=MonitorResponse)
def monitor(payload: MonitorRequest):
    s = get_settings()
    items = monitor_loaded(payload.envs, payload.lotids, payload.reload_time, settings=s)
    return MonitorResponse(
        items=[
            MonitorResponseItem(
                file_name=fn,
                file_size=fs,
                status=st,
                status_color=col,
                refresh=rf,
            )
            for fn, fs, st, col, rf in items
        ]
    )

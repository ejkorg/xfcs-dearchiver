from fastapi import FastAPI, Query, UploadFile, File, HTTPException, Body
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from typing import List

app = FastAPI(title="xfcs-dearchiver API", version="0.1.0")

# Dev CORS; tighten in prod
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

from .config import settings
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

_ENVS = load_envs()


@app.get("/api/health")
def health():
    return {"status": "ok"}


@app.get("/api/envs", response_model=List[EnvInfo])
def list_envs():
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
    results: List[LotSearchResult] = []
    # Prepare lotid list for matching
    lot_ids = [c.lot_id.strip().strip("*?") for c in payload.criteria if c.lot_id.strip()]
    # Build paths from env+year+month
    paths: List[str] = []
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
            months_list = months or settings.months
            for y in years_list:
                for m in months_list:
                    paths.append(str(settings.archives_root / env_rec.site / e / y / m))
    file_paths = find_files([settings.archives_root / p for p in []], lot_ids)  # placeholder
    # We precomputed string paths; now search each
    matched_files: List[str] = []
    for p in paths:
        files = find_files([settings.archives_root / ""], lot_ids)  # will be replaced below
    # A simpler approach: search across archives_root for env/year/month combinations
    unique_files = []
    seen = set()
    for p in paths:
        local_files = find_files([Path(p)], lot_ids)
        for f in local_files:
            if f.name in seen:
                continue
            seen.add(f.name)
            unique_files.append(f)

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
                parts = f.parts
                env = parts[3] if len(parts) > 3 else None
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
    tmp_dir = Path(tempfile.mkdtemp(prefix="xfcs-zip-", dir=str(settings.temp_dir)))
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
        ts = reload_file_to_env(p)
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
    items = monitor_loaded(payload.envs, payload.lotids, payload.reload_time)
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

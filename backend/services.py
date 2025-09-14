from __future__ import annotations

import subprocess
from dataclasses import dataclass
from pathlib import Path
from typing import Dict, Iterable, List, Tuple

from .config import Settings


@dataclass
class EnvRecord:
    env: str
    site: str
    yr_from: int
    yr_to: int
    active: bool
    plant: str
    area: str
    tester: str


def _parse_env_name(env: str, site: str) -> Tuple[str, str, str]:
    # Heuristic based on util_get_envs.pl translate_env_names
    parts = env.upper().split("_")
    tester = parts[-1] if parts else ""
    # derive plant/area; best-effort compatible with original script
    if site == "edbfound":
        plant = parts[0] if parts else ""
        area = "_".join(parts[1:-1]) if len(parts) > 2 else ""
    else:
        plant = f"FS{parts[0]}" if parts else ""
        # assume second token approximates area
        area = parts[1] if len(parts) > 1 else ""
    return plant, area, tester


def load_envs(config_path: Path | None = None, settings: Settings | None = None) -> Dict[str, EnvRecord]:
    settings = settings or Settings()
    cfg = config_path or settings.envs_config
    envs: Dict[str, EnvRecord] = {}
    site_map: Dict[str, str] = {}
    # env.conf format: key=site:yr_from:yr_to
    with open(cfg, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            key, val = line.split("=", 1)
            if key.startswith("["):
                # section header [envs]
                continue
            site, yr_from, yr_to = val.split(":", 3)
            yr_from_i, yr_to_i = int(yr_from), int(yr_to)
            plant, area, tester = _parse_env_name(key, site)
            # active flag: check if /apps/exensio_data/data/<env>/Processed exists
            active_dir = settings.data_root / key / settings.active_check_folder
            envs[key] = EnvRecord(
                env=key,
                site=site,
                yr_from=yr_from_i,
                yr_to=yr_to_i,
                active=active_dir.exists(),
                plant=plant,
                area=area,
                tester=tester,
            )
            site_map[key] = site
    return envs


def human_size(path: Path) -> str:
    try:
        size = path.stat().st_size
    except FileNotFoundError:
        return "0"
    units = [(1 << 30, "Gb"), (1 << 20, "Mb"), (1 << 10, "Kb")]
    for factor, suffix in units:
        if size >= factor:
            val = size / factor
            s = f"{val:.1f}".rstrip("0").rstrip(".")
            return f"{s}{suffix}"
    return str(size)


def find_files(paths: List[Path], lot_patterns: List[str], settings: Settings | None = None) -> List[Path]:
    settings = settings or Settings()
    # Build a find command similar to edbWebDearchive.pl search_archives, but local.
    results: List[Path] = []
    exclude = settings.find_exclude_patterns or []
    for base in paths:
        if not base.exists():
            continue
        for path in base.rglob("*"):
            if not path.is_file():
                continue
            name = path.name
            # exclude testplan markers
            if any(pat in name for pat in exclude):
                continue
            for lot in lot_patterns:
                # emulate wildcard: lot may include ? or * pre-escaped
                if lot.lower() in name.lower():
                    results.append(path)
                    break
    # de-dup by filename
    seen = set()
    unique: List[Path] = []
    for p in results:
        if p.name in seen:
            continue
        seen.add(p.name)
        unique.append(p)
    return unique


def reload_file_to_env(file_path: Path, settings: Settings | None = None) -> int:
    settings = settings or Settings()
    # Mimic: copy to data_root/<env>/dearchive, gunzip if needed, move into env folder.
    parts = file_path.parts
    # expect /archives/<site>/<env>/<year>/<month>/<file.gz>
    try:
        env = parts[3]
    except IndexError:
        env = "unknown"
    dearchive_dir = settings.data_root / env / "dearchive"
    final_dir = settings.data_root / env
    dearchive_dir.mkdir(parents=True, exist_ok=True)
    final_dir.mkdir(parents=True, exist_ok=True)

    dst = dearchive_dir / file_path.name
    try:
        dst.write_bytes(file_path.read_bytes())
    except FileNotFoundError:
        # If source missing, skip but still return time to avoid blocking
        return int(__import__("time").time())

    # if .gz, optionally unzip
    if dst.suffix.lower() == ".gz":
        try:
            subprocess.run(["gzip", "-df", str(dst)], check=True, capture_output=True)
            dst = dst.with_suffix("")
        except Exception:
            pass
    # move to final dir
    try:
        (final_dir / dst.name).write_bytes(dst.read_bytes())
        dst.unlink(missing_ok=True)
    except Exception:
        pass
    return int(__import__("time").time())


def monitor_loaded(envs: Iterable[str], lotids: Iterable[str], since: int, settings: Settings | None = None) -> List[Tuple[str, str, str, str, bool]]:
    settings = settings or Settings()
    # Search data_root/<env> for files matching lotids, ignore testplans and .err, approximate statuses.
    import time

    items: List[Tuple[str, str, str, str, bool]] = []
    lot_lower = [l.lower() for l in lotids]
    for env in envs:
        base = settings.data_root / env
        if not base.exists():
            continue
        for p in base.rglob("*"):
            if not p.is_file():
                continue
            if p.suffix == ".err" or any(pat in p.name for pat in (".TP", "_TP")):
                continue
            try:
                mtime = int(p.stat().st_mtime)
            except Exception:
                continue
            if mtime < since:
                continue
            name_lower = p.name.lower()
            if not any(l in name_lower for l in lot_lower):
                continue
            # crude status mapping based on path parts
            status = "for conv"
            status_color = "green"
            refresh = True
            if "NotProcessed" in p.parts:
                status = "conv failed"
                status_color = "red"
                refresh = False
            elif settings.active_check_folder in p.parts:
                status = "Please check Exensio Cloudsite after 15 mins as the data needs to be transmitted via FTP and loaded on Cloudsite."
                status_color = "black"
                refresh = False
            items.append((p.name, human_size(p), status, status_color, refresh))
    return items

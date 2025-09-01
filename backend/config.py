from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from typing import List

import yaml


@dataclass
class Settings:
    archives_root: Path
    data_root: Path
    temp_dir: Path
    months: List[str]
    envs_config: Path
    active_check_folder: str = "Processed"
    find_exclude_patterns: List[str] | None = None

    @classmethod
    def load(cls, file: Path | str = None) -> "Settings":
        cfg_path = Path(file) if file else Path(__file__).with_name("config.yaml")
        with open(cfg_path, "r", encoding="utf-8") as f:
            data = yaml.safe_load(f) or {}
        return cls(
            archives_root=Path(data.get("archives_root", "/archives")),
            data_root=Path(data.get("data_root", "/apps/exensio_data/data")),
            temp_dir=Path(data.get("temp_dir", "/tmp/xfcs-dearchiver")),
            months=list(data.get("months", [
                "Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"
            ])),
            envs_config=Path(data.get("envs_config", "env.conf")),
            active_check_folder=str(data.get("active_check_folder", "Processed")),
            find_exclude_patterns=list(data.get("find_exclude_patterns", [".TP", "_TP"]))
        )


settings = Settings.load()

from __future__ import annotations

import os
from pathlib import Path
from typing import Any, Dict, List

import yaml
from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict, PydanticBaseSettingsSource


DEFAULT_MONTHS = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
]


class YamlConfigSettingsSource(PydanticBaseSettingsSource):
    def __init__(self, settings_cls):
        super().__init__(settings_cls)
        yaml_path = os.environ.get("XFCS_CONFIG_YAML") or str(
            Path(__file__).with_name("config.yaml")
        )
        try:
            with open(yaml_path, "r", encoding="utf-8") as f:
                self._data = yaml.safe_load(f) or {}
        except FileNotFoundError:
            self._data = {}

    def __call__(self) -> Dict[str, Any]:
        return dict(self._data)

    def get_field_value(self, field, field_name):
        # Basic mapping: direct key lookup; supports nested keys if provided in YAML
        if field_name in self._data:
            return self._data[field_name], field_name, None
        # allow hyphen/underscore variants for convenience
        alt = field_name.replace("_", "-")
        if alt in self._data:
            return self._data[alt], field_name, None
        return None, field_name, None


class Settings(BaseSettings):
    # Paths
    archives_root: Path = Path("/archives")
    data_root: Path = Path("/apps/exensio_data/data")
    temp_dir: Path = Path("/tmp/xfcs-dearchiver")

    # Behavior
    months: List[str] = Field(default_factory=lambda: list(DEFAULT_MONTHS))
    envs_config: Path = Path("env.conf")
    active_check_folder: str = "Processed"
    find_exclude_patterns: List[str] = Field(default_factory=lambda: [".TP", "_TP"])

    # Settings config
    model_config = SettingsConfigDict(
        env_prefix="XFCS_",
        env_nested_delimiter="__",
        extra="ignore",
    )

    @classmethod
    def settings_customise_sources(
        cls,
        settings_cls,
        init_settings,
        env_settings,
        dotenv_settings,
        file_secret_settings,
    ):
        # Precedence: init kwargs > env vars > YAML > dotenv > file secrets
        return (
            init_settings,
            env_settings,
            YamlConfigSettingsSource(settings_cls),
            dotenv_settings,
            file_secret_settings,
        )


settings = Settings()

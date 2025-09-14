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

    class DualEnvSettingsSource(PydanticBaseSettingsSource):
        """Custom env source to support both XFCS_FIELD and XFCS__FIELD overrides.

        Some older scripts used a double underscore after the prefix even for top-level
        fields. This source checks both variants explicitly so tests and runtime can
        set either form.
        """

        def __init__(self, settings_cls):
            super().__init__(settings_cls)

        def __call__(self) -> Dict[str, Any]:
            data: Dict[str, Any] = {}
            for field_name in self.settings_cls.model_fields.keys():
                key_uc = field_name.upper()
                for k in (f"XFCS__{key_uc}", f"XFCS_{key_uc}"):
                    if k in os.environ:
                        data[field_name] = os.environ[k]
                        break
            return data

        def get_field_value(self, field, field_name):
            key_uc = field_name.upper()
            for k in (f"XFCS__{key_uc}", f"XFCS_{key_uc}"):
                if k in os.environ:
                    return os.environ[k], field_name, None
            return None, field_name, None

    @classmethod
    def settings_customise_sources(
        cls,
        settings_cls,
        init_settings,
        env_settings,
        dotenv_settings,
        file_secret_settings,
    ):
        # Precedence: init kwargs > DualEnv (XFCS__FIELD or XFCS_FIELD) > env vars > YAML > dotenv > file secrets
        return (
            init_settings,
            cls.DualEnvSettingsSource(settings_cls),
            env_settings,
            YamlConfigSettingsSource(settings_cls),
            dotenv_settings,
            file_secret_settings,
        )


settings = Settings()

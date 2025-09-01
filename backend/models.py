from __future__ import annotations

from typing import List, Literal, Optional
from pydantic import BaseModel, Field


class EnvInfo(BaseModel):
    name: str
    site: str
    yr_from: int
    yr_to: int
    active: bool
    tester: str | None = None


class SearchCriteria(BaseModel):
    lot_id: str = Field(..., min_length=1)
    env: str | List[str] | Literal["All"] = "All"
    year: str | int = "All"  # "All" or 4-digit
    month: str | Literal["All"] = "All"  # Jan..Dec or All


class SearchRequest(BaseModel):
    criteria: List[SearchCriteria]


class FileEntry(BaseModel):
    path: str
    size: str  # human-readable like "10Mb"


class LotSearchResult(BaseModel):
    lot_id: str
    db_status: str = ""
    raw_count: int = 0
    stdf_count: int = 0
    raw_files: List[FileEntry] = []
    active: bool = True
    reason: Optional[str] = None


class SearchResponse(BaseModel):
    results: List[LotSearchResult]


class ReloadRequest(BaseModel):
    files: List[str]
    data_type: Literal["RAW", "STDF"] = "RAW"
    username: Optional[str] = None


class ReloadResponse(BaseModel):
    reload_time: int
    selected_envs: List[str]
    monitor_lotids: List[str]
    message: str = ""


class MonitorResponseItem(BaseModel):
    file_name: str
    file_size: str
    status: str
    status_color: Literal["red", "green", "black"]
    refresh: bool


class MonitorRequest(BaseModel):
    reload_time: int
    envs: List[str]
    lotids: List[str]


class MonitorResponse(BaseModel):
    items: List[MonitorResponseItem]

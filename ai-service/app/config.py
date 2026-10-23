"""Environment-driven settings. Secrets come only from environment variables."""
from __future__ import annotations

import os
from dataclasses import dataclass, field
from functools import lru_cache

from dotenv import load_dotenv

load_dotenv()  # reads ai-service/.env locally; on Railway real env vars are used

LOCAL_DEV_ORIGINS = ["http://localhost:5173", "http://127.0.0.1:5173"]


def _csv(value: str) -> list[str]:
    return [item.strip().rstrip("/") for item in value.split(",") if item.strip()]


@dataclass(frozen=True)
class Settings:
    gemini_keys: list[str] = field(default_factory=list)
    gemini_model: str = "gemini-flash-lite-latest"
    gemini_backend: str = "auto"  # auto | studio | vertex
    gemini_thinking_level: str = "LOW"  # LOW keeps replies fast and steady; empty = model default
    karwan_api_url: str = ""
    frontend_origins: list[str] = field(default_factory=list)
    request_timeout_seconds: float = 20.0

    @property
    def allowed_origins(self) -> list[str]:
        """Production frontend origin(s) plus local dev origins - nothing else."""
        return list(dict.fromkeys([*self.frontend_origins, *LOCAL_DEV_ORIGINS]))


def load_settings() -> Settings:
    keys = [os.getenv("GEMINI_KEY_A", "").strip(), os.getenv("GEMINI_KEY_B", "").strip()]
    return Settings(
        gemini_keys=[k for k in keys if k],
        gemini_model=os.getenv("GEMINI_MODEL", "").strip() or "gemini-flash-lite-latest",
        gemini_backend=(os.getenv("GEMINI_BACKEND", "").strip().lower() or "auto"),
        gemini_thinking_level=os.getenv("GEMINI_THINKING_LEVEL", "LOW").strip().upper(),
        karwan_api_url=os.getenv("KARWAN_API_URL", "").strip().rstrip("/"),
        frontend_origins=_csv(os.getenv("FRONTEND_ORIGIN", "")),
        request_timeout_seconds=float(os.getenv("AI_REQUEST_TIMEOUT_SECONDS", "20") or 20),
    )


@lru_cache
def get_settings() -> Settings:
    return load_settings()

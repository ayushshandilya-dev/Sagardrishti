"""Sagar-Drishti API configuration.

Every value can be overridden through environment variables or a root `.env`
file. Production deployments typically set `DATABASE_URL` (Postgres) and
`CORS_ORIGINS` (the deployed console URL); everything else has a sensible
default so the platform runs out-of-the-box in a laptop demo.
"""
from __future__ import annotations

from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # ── Identity ────────────────────────────────────────────────
    api_name: str = "Sagar-Drishti Maritime Intelligence & Forensic Attribution API"
    api_codename: str = "SamudraNetra / AeroSlick-Sentinel"
    api_version: str = "3.0.0"
    api_env: str = "development"
    agency: str = "Indian Coast Guard (ICG) / Directorate General of Shipping (DGS)"

    # ── Storage ─────────────────────────────────────────────────
    # Defaults to a local SQLite document store so the API works with zero
    # configuration. Production compose/cloud deployments set this to Postgres.
    database_url: str = "sqlite:///./data/sagar_drishti.db"
    auto_seed: bool = True

    # ── CORS ────────────────────────────────────────────────────
    # Comma separated origins; "*" allows any (demo default). For production
    # set e.g. "https://sagar-drishti.vercel.app".
    cors_origins: str = "*"

    # ── Forensic custody ────────────────────────────────────────
    node_id: str = "icg-sagar-drishti-node-01"
    node_signing_key: str = "01" * 32  # single ICG authority key for demonstrable custody

    # ── Drift / attribution sampling ────────────────────────────
    default_max_hours: float = 12.0
    default_step_seconds: int = 300

    @property
    def cors_origin_list(self) -> list[str]:
        raw = self.cors_origins.strip()
        if raw == "*":
            return ["*"]
        return [o.strip() for o in raw.split(",") if o.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
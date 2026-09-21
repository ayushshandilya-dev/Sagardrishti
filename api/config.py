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

    # ── Access control ──────────────────────────────────────────
    # If set, every /api/v1/* request must carry `X-API-Key: <api_key>`.
    # Optional by default so the public demo console needs no key; operators
    # set it to gate scripts/ops access. Rate limiting is always active.
    api_key: str | None = None

    # ── Rate limiting (in-process token buckets) ────────────────
    # Generous by default; tighten before public launch.
    rate_limit_requests_per_minute: int = 300
    rate_limit_compute_per_minute: int = 30

    # ── Database migrations ─────────────────────────────────────
    # Alembic `upgrade head` runs on startup; create_all is the fallback ONLY
    # in non-production environments.
    run_migrations: bool = True

    # ── Drift / attribution sampling ────────────────────────────
    default_max_hours: float = 12.0
    default_step_seconds: int = 300

    @property
    def cors_origin_list(self) -> list[str]:
        raw = self.cors_origins.strip()
        if raw == "*":
            return ["*"]
        return [o.strip() for o in raw.split(",") if o.strip()]

    def validate_production(self) -> None:
        """Fail fast on unsafe configuration when API_ENV=production."""
        if self.api_env != "production":
            return

        problems: list[str] = []
        if not self.database_url.startswith("postgresql"):
            problems.append("API_ENV=production requires DATABASE_URL to point at Postgres (sqlite is not allowed)")
        if self.cors_origins.strip() == "*":
            problems.append("API_ENV=production requires explicit CORS_ORIGINS (wildcard not allowed)")
        if self.node_signing_key == "01" * 32:
            problems.append("API_ENV=production requires a real NODE_SIGNING_KEY (the demo default is not allowed)")
        if not self.api_key:
            problems.append("API_ENV=production requires an API_KEY for the X-API-Key gate")
        if not self.run_migrations:
            problems.append("API_ENV=production requires run_migrations so the schema is migrated, not just created")

        if problems:
            raise RuntimeError(
                "Unsafe production configuration:\n  - " + "\n  - ".join(problems)
            )


@lru_cache
def get_settings() -> Settings:
    return Settings()
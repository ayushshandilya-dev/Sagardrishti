"""Persistence layer for the Sagar-Drishti API.

A deliberately thin document/entity store (Postgres in production, SQLite by
default) with lightweight relational rows for the parts that benefit from it:

  * ``incidents``   – SAR oil-spill detection events (full scene JSON)
  * ``vessels``     – monitored AIS vessels / attribution candidates
  * ``metocean``    – single active INCOIS/ECMWF surface vector snapshot
  * ``ledger_blocks`– tamper-evident Merkle ledger chain blocks (chain-order)
  * ``drift_runs``  – audit trail of every RK4 backtrack computation
  * ``attribution_runs`` – audit trail of every candidate scoring computation

The engine is created from ``Settings.database_url``; tables are created on
startup (``init_db``) and seeded idempotently (``api.seed``).
"""
from __future__ import annotations

from collections.abc import Iterator
from contextlib import contextmanager
from datetime import datetime, timezone
from typing import Any

from sqlalchemy import (
    JSON,
    Column,
    DateTime,
    Float,
    Integer,
    String,
    create_engine,
)
from sqlalchemy.orm import declarative_base, sessionmaker

from api.config import get_settings

Base = declarative_base()


class IncidentRow(Base):
    """A detected SAR oil-spill event with its full scene payload."""

    __tablename__ = "incidents"

    event_id = Column(String, primary_key=True)
    severity = Column(String, nullable=False, index=True)
    data = Column(JSON, nullable=False)


class VesselRow(Base):
    """A monitored AIS vessel (attribution candidates included)."""

    __tablename__ = "vessels"

    mmsi = Column(Integer, primary_key=True)
    data = Column(JSON, nullable=False)


class MetOceanRow(Base):
    """Single active surface metocean snapshot."""

    __tablename__ = "metocean"

    id = Column(Integer, primary_key=True)
    updated_utc = Column(DateTime(timezone=True), nullable=False)
    data = Column(JSON, nullable=False)


class LedgerBlockRow(Base):
    """A single block in the tamper-evident Merkle evidence chain."""

    __tablename__ = "ledger_blocks"

    block_hash = Column(String, primary_key=True)
    index = Column(Integer, nullable=False)
    data = Column(JSON, nullable=False)


class DriftRunRow(Base):
    """Persisted reverse-Lagrangian (RK4) backtrack computation."""

    __tablename__ = "drift_runs"

    id = Column(Integer, primary_key=True, autoincrement=True)
    run_utc = Column(DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc))
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    max_hours = Column(Float, nullable=False)
    request = Column(JSON, nullable=False)
    result = Column(JSON, nullable=False)


class AttributionRunRow(Base):
    """Persisted candidate-vessel scoring computation."""

    __tablename__ = "attribution_runs"

    id = Column(Integer, primary_key=True, autoincrement=True)
    run_utc = Column(DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc))
    request = Column(JSON, nullable=False)
    result = Column(JSON, nullable=False)


class Database:
    """Lazy engine/session holder so importing modules never touches I/O."""

    def __init__(self) -> None:
        self._engine = None  # type: ignore[assignment]
        self._session = None  # type: ignore[assignment]

    def connect(self) -> None:
        settings = get_settings()
        kwargs: dict[str, Any] = {}
        if settings.database_url.startswith("sqlite"):
            kwargs["connect_args"] = {"check_same_thread": False}
        self._engine = create_engine(settings.database_url, pool_pre_ping=True, **kwargs)
        self._session = sessionmaker(bind=self._engine, autoflush=False, expire_on_commit=False)

    @property
    def engine(self):
        if self._engine is None:
            self.connect()
        return self._engine

    @property
    def session(self):
        if self._session is None:
            self.connect()
        return self._session

    def create_all(self) -> None:
        Base.metadata.create_all(bind=self.engine)

    @contextmanager
    def session_scope(self) -> Iterator:
        session = self.session()
        try:
            yield session
            session.commit()
        except Exception:
            session.rollback()
            raise
        finally:
            session.close()


db = Database()


def run_migrations() -> None:
    """Apply Alembic migrations (upgrade head) against the configured store."""
<<<<<<< HEAD
    import logging
    from pathlib import Path
=======
    try:
        from alembic import command
        from alembic.config import Config
    except ImportError:
        logger.warning("Alembic not installed. Falling back to db.create_all() for local development.")
        db.create_all()
        return
>>>>>>> 9b2760a50f3580bb19095db474a776860413101b

    logger = logging.getLogger("sagar.db")

    try:
        from alembic import command
        from alembic.config import Config
    except ImportError:
        logger.warning("Alembic not installed; falling back to db.create_all()")
        db.create_all()
        return

    root = Path(__file__).resolve().parent.parent


    cfg = Config(str(root / "alembic.ini"))
    cfg.set_main_option("script_location", str(root / "migrations"))
    cfg.set_main_option("sqlalchemy.url", get_settings().database_url)

    # Fresh store -> run the chain. Pre-Alembic store (tables but no version
    # table) -> stamp head so we do not collide with the existing schema.
    from sqlalchemy import inspect

    inspector = inspect(db.engine)
    if not inspector.has_table("alembic_version"):
        if any(inspector.has_table(t) for t in ("incidents", "vessels", "ledger_blocks")):
            command.stamp(cfg, "head")
            logger.info("Stamped pre-Alembic store at head")
        else:
            command.upgrade(cfg, "head")
            logger.info("Schema migrated to head (%s)", get_settings().database_url)
    else:
        command.upgrade(cfg, "head")
        logger.info("Schema at head (%s)", get_settings().database_url)


def init_db() -> None:
    """Bring the schema to head: Alembic migrations, or create_all (dev only)."""
    settings = get_settings()
    if settings.run_migrations:
        try:
            run_migrations()
            return
        except Exception as exc:
            import logging
            logging.getLogger("sagar.db").warning("Alembic migration failed (%s); falling back to create_all()", exc)
    if settings.api_env == "production":
        raise RuntimeError("API_ENV=production requires run_migrations=true (Alembic)")
    db.create_all()
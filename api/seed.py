"""Idempotent seeding of the Sagar-Drishti database.

Populates incidents, monitored vessels, the active met-ocean snapshot and the
cryptographic evidence ledger from the deterministic sample scene set. Safe to
call on every boot (startup seeder) — rows already present are left untouched.
"""
from __future__ import annotations

import logging
from datetime import datetime, timezone

from api.config import get_settings
from api.db import (
    IncidentRow,
    LedgerBlockRow,
    MetOceanRow,
    VesselRow,
    db,
)
from api.forensics import build_ledger_blocks
from data.sample_scenes import MOCK_AIS_VESSELS, MOCK_METOCEAN, MOCK_SAR_SCENES

logger = logging.getLogger("sagar.seed")


def seed_incidents() -> int:
    with db.session_scope() as session:
        existing = {r.event_id for r in session.query(IncidentRow).all()}
        inserted = 0
        for scene in MOCK_SAR_SCENES:
            if scene["eventId"] not in existing:
                session.add(
                    IncidentRow(
                        event_id=scene["eventId"],
                        severity=scene.get("severity", "WATCH"),
                        data=scene,
                    )
                )
                inserted += 1
        return inserted


def seed_vessels() -> int:
    with db.session_scope() as session:
        existing = {r.mmsi for r in session.query(VesselRow).all()}
        inserted = 0
        for v in MOCK_AIS_VESSELS:
            if v["mmsi"] not in existing:
                session.add(VesselRow(mmsi=v["mmsi"], data=v))
                inserted += 1
        return inserted


def seed_metocean() -> int:
    with db.session_scope() as session:
        if session.query(MetOceanRow).count() > 0:
            return 0
        session.add(
            MetOceanRow(
                updated_utc=datetime.now(timezone.utc),
                data=MOCK_METOCEAN,
            )
        )
        return 1


def seed_ledger() -> int:
    with db.session_scope() as session:
        existing = {b.block_hash for b in session.query(LedgerBlockRow).all()}
        inserted = 0
        for block in build_ledger_blocks():
            if block["block_hash"] not in existing:
                session.add(
                    LedgerBlockRow(
                        block_hash=block["block_hash"],
                        index=block["index"],
                        data=block,
                    )
                )
                inserted += 1
        return inserted


def seed_all() -> None:
    """Seed every domain collection. Called on startup when auto_seed is on."""
    if not get_settings().auto_seed:
        return

    n_inc = seed_incidents()
    n_v = seed_vessels()
    n_m = seed_metocean()
    n_l = seed_ledger()

    if any((n_inc, n_v, n_m, n_l)):
        logger.warning(
            "Seeding Sagar-Drishti store: %d incidents, %d vessels, %d metocean, %d ledger blocks",
            n_inc, n_v, n_m, n_l,
        )
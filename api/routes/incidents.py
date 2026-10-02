from typing import Any
import json, os, pathlib

from fastapi import APIRouter, HTTPException

from api.db import IncidentRow, db
from data.sample_scenes import MOCK_SAR_SCENES

router = APIRouter(prefix="/api/v1/incidents", tags=["incidents"])

# Path to the live detection JSON written by live_monitor.py / GitHub Actions
_LIVE_DETECTION_PATH = pathlib.Path(__file__).resolve().parents[2] / "output" / "latest_detection.json"


def _load_live_detection() -> dict | None:
    """Load the latest live satellite detection result if it exists."""
    try:
        if _LIVE_DETECTION_PATH.exists():
            with open(_LIVE_DETECTION_PATH) as f:
                return json.load(f)
    except Exception:
        pass
    return None


def _all_incidents() -> list[dict[str, Any]]:
    with db.session_scope() as session:
        rows = session.query(IncidentRow).order_by(IncidentRow.event_id.desc()).all()
    return [r.data for r in rows]


@router.get("", response_model=list[dict[str, Any]])
async def get_incidents():
    """Retrieve all monitored active SAR oil spill incidents.
    
    Always prepends the latest live satellite detection (from GitHub Actions)
    so the map shows real data the moment a new Sentinel-1 pass is processed.
    """
    incidents = _all_incidents()
    base = incidents if incidents else list(MOCK_SAR_SCENES)

    # Prepend the live detection as the newest incident if it exists
    live = _load_live_detection()
    if live:
        # Remove any previous live detection from the list to avoid duplicates
        base = [i for i in base if not i.get("eventId", "").startswith("SD-LIVE-")]
        base.insert(0, live)

    return base


@router.get("/{event_id}", response_model=dict[str, Any])
async def get_incident(event_id: str):
    """Retrieve a specific incident by its event ID (persisted store or live detection)."""
    with db.session_scope() as session:
        row = session.query(IncidentRow).filter(IncidentRow.event_id == event_id).first()
    if row is not None:
        return row.data

    # Check live satellite detection first (SD-LIVE-* IDs)
    live = _load_live_detection()
    if live and live.get("eventId") == event_id:
        return live

    for scene in MOCK_SAR_SCENES:
        if scene["eventId"] == event_id:
            return scene

    raise HTTPException(status_code=404, detail=f"Incident {event_id} not found")
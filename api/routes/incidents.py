from typing import Any

from fastapi import APIRouter, HTTPException

from api.db import IncidentRow, db
from data.sample_scenes import MOCK_SAR_SCENES

router = APIRouter(prefix="/api/v1/incidents", tags=["incidents"])


def _all_incidents() -> list[dict[str, Any]]:
    with db.session_scope() as session:
        rows = session.query(IncidentRow).order_by(IncidentRow.event_id.desc()).all()
    return [r.data for r in rows]


@router.get("", response_model=list[dict[str, Any]])
async def get_incidents():
    """Retrieve all monitored active SAR oil spill incidents (persisted store)."""
    incidents = _all_incidents()
    if not incidents:
        return MOCK_SAR_SCENES
    return incidents


@router.get("/{event_id}", response_model=dict[str, Any])
async def get_incident(event_id: str):
    """Retrieve a specific incident by its event ID (persisted store)."""
    with db.session_scope() as session:
        row = session.query(IncidentRow).filter(IncidentRow.event_id == event_id).first()
    if row is not None:
        return row.data

    for scene in MOCK_SAR_SCENES:
        if scene["eventId"] == event_id:
            return scene

    raise HTTPException(status_code=404, detail=f"Incident {event_id} not found")
from fastapi import APIRouter, HTTPException
from typing import List, Dict, Any
from data.sample_scenes import MOCK_SAR_SCENES

router = APIRouter(prefix="/api/v1/incidents", tags=["incidents"])

@router.get("", response_model=List[Dict[str, Any]])
async def get_incidents():
    """Retrieve all monitored active SAR oil spill incidents."""
    return MOCK_SAR_SCENES

@router.get("/{event_id}", response_model=Dict[str, Any])
async def get_incident(event_id: str):
    """Retrieve specific incident by its event ID."""
    for scene in MOCK_SAR_SCENES:
        if scene["eventId"] == event_id:
            return scene
    raise HTTPException(status_code=404, detail=f"Incident {event_id} not found")

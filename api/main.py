from contextlib import asynccontextmanager
from typing import Any

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from api.config import get_settings
from api.db import db, init_db
from api.routes import attribution, drift, evidence, incidents
from api.seed import seed_all

settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Bring up persistence, seed the store, then serve traffic."""
    init_db()
    try:
        seed_all()
    except Exception as exc:  # noqa: BLE001 - startup resilience: serve even if seed fails
        app.state.seed_error = str(exc)
    yield


app = FastAPI(
    title=settings.api_name,
    version=settings.api_version,
    description=(
        "API supporting Sentinel-1 SAR Oil Spill Detection, RK4 Lagrangian Drift "
        "Backtracking, Bayesian AIS Attribution, and Section 65B Merkle Ledger."
    ),
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=settings.cors_origin_list != ["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register route controllers
app.include_router(incidents.router)
app.include_router(drift.router)
app.include_router(attribution.router)
app.include_router(evidence.router)


@app.get("/", tags=["system"])
async def root() -> dict[str, Any]:
    return {
        "system": "Sagar-Drishti",
        "codename": settings.api_codename,
        "status": "OPERATIONAL",
        "version": settings.api_version,
        "env": settings.api_env,
        "agency": settings.agency,
    }


@app.get("/health", tags=["system"])
async def health() -> dict[str, Any]:
    from sqlalchemy import text

    db_status = "up"
    try:
        with db.session_scope() as session:
            session.execute(text("SELECT 1"))
    except Exception:  # noqa: BLE001 - health probe must never raise
        db_status = "down"

    return {
        "status": "healthy",
        "service": "operational",
        "database": db_status,
        "schema": settings.api_version,
        "node": settings.node_id,
        "environment": settings.api_env,
    }


@app.get("/api/v1/vessels", tags=["vessels"])
async def get_monitored_vessels() -> dict[str, Any]:
    """Retrieve all AIS vessels monitored in the Indian EEZ transit corridors."""
    from api.db import VesselRow

    with db.session_scope() as session:
        rows = session.query(VesselRow).all()
        vessels = [r.data for r in rows]

    return {
        "status": "success",
        "count": len(vessels),
        "vessels": vessels,
    }


@app.get("/api/v1/metocean", tags=["metocean"])
async def get_metocean_conditions() -> dict[str, Any]:
    """Retrieve the active MetOcean surface current and wind vector fields."""
    from api.db import MetOceanRow
    from data.sample_scenes import MOCK_METOCEAN

    with db.session_scope() as session:
        row = session.query(MetOceanRow).order_by(MetOceanRow.updated_utc.desc()).first()
        payload = row.data if row else MOCK_METOCEAN

    return {"status": "success", "data": payload}


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("api.main:app", host="0.0.0.0", port=8000, reload=True)
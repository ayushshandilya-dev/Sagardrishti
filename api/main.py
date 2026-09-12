from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from api.routes import incidents, drift, attribution, evidence
from data.sample_scenes import MOCK_AIS_VESSELS, MOCK_METOCEAN

app = FastAPI(
    title="Sagar-Drishti Maritime Intelligence & Forensic Attribution API",
    version="2.0.0",
    description="API supporting Sentinel-1 SAR Oil Spill Detection, RK4 Lagrangian Drift Backtracking, Bayesian AIS Attribution, and Section 65B Merkle Ledger."
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register route controllers
app.include_router(incidents.router)
app.include_router(drift.router)
app.include_router(attribution.router)
app.include_router(evidence.router)

@app.get("/")
async def root():
    return {
        "system": "Sagar-Drishti",
        "codename": "SamudraNetra / AeroSlick-Sentinel",
        "status": "OPERATIONAL",
        "version": "2.0.0",
        "agency": "Indian Coast Guard (ICG) / Directorate General of Shipping (DGS)"
    }

@app.get("/health")
async def health():
    return {"status": "healthy", "service": "operational"}

@app.get("/api/v1/vessels")
async def get_monitored_vessels():
    """Retrieve all AIS vessels monitored in the Indian EEZ transit corridors."""
    return MOCK_AIS_VESSELS

@app.get("/api/v1/metocean")
async def get_metocean_conditions():
    """Retrieve active MetOcean surface current and wind vector fields."""
    return MOCK_METOCEAN

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("api.main:app", host="0.0.0.0", port=8000, reload=True)
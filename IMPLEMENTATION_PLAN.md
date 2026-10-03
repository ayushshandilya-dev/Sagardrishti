# SAGARDRISHTI — Implementation Plan & Current Status
**Problem Statement: SIH26143**  
**Team: Coding Crows**  
**Last Updated: October 2, 2026 (SIH Submission)**

---

## Implementation Status Overview

| Stage | Description | Status |
|---|---|---|
| Stage 1 | SAR Ingestion via CDSE | ✅ Live |
| Stage 2 | AI Oil Spill Detection (SegFormer) | ✅ Live (synthetic weights) |
| Stage 3 | Reverse Drift (RK4 + Open-Meteo) | ✅ Live |
| Stage 4 | Vessel Attribution (Bayesian) | ✅ Built — ⚠️ Mock AIS data |
| Stage 5 | Cryptographic Evidence Ledger | ✅ Live |
| Stage 6 | COP Dashboard + Section 65B Dossier | ✅ Live |

---

## Stage 1: SAR Ingestion & Conditioning

**Status: ✅ LIVE**

**What is working:**
- GitHub Actions workflow (`live_monitor.yml`) polls the **Copernicus Data Space Ecosystem (CDSE)** OData API every 12 hours
- Authenticates with real CDSE credentials stored as GitHub Actions Secrets
- Downloads the latest Sentinel-1 GRD-IW scene (~1.5 GB) for the configured bounding box
- Applies radiometric calibration (DN → Sigma0 dB) and Lee speckle filtering
- Writes detection result to `output/latest_detection.json`, commits it, and the frontend immediately shows it

**Trigger a manual scan:**
1. Go to Actions → Sagardrishti Live Oil Spill Monitor → Run Workflow
2. Set `bbox` to `MinLat,MinLon,MaxLat,MaxLon` (e.g. `18.5,71.5,19.5,72.5` for Mumbai)
3. Set `days` to `14` to ensure a satellite pass is found

**Files:** `scripts/live_monitor.py`, `.github/workflows/live_monitor.yml`

**What is NOT yet connected:**
- RISAT-1A (EOS-04) — requires NRSC/ISRO data access
- Sentinel-2 optical cloud masking — architecture exists in `core/optical/`, not wired into live pipeline

---

## Stage 2: Cascade Detection & Volumetric Estimation

**Status: ✅ LIVE (with synthetic model weights)**

**What is working:**
- Two-stage cascade: CFAR scout → SegFormer-B3 deep segmentation
- Model runs on GitHub Actions CPU runner — inference on real satellite tiles
- Bonn Agreement volumetric estimation (BAOAC codes 1-5)
- Output: spill geometry (centroid, area, perimeter, orientation), confidence score, classification probabilities

**What is NOT yet complete:**
- Model is trained on **synthetic data**, not the Krestenitis labelled real-spill dataset
- **Blocker:** Krestenitis dataset requires institutional/supervisor email for access
- **Plan:** Request dataset access after mid-semester exams → retrain weights → redeploy GitHub Actions runner

**Files:** `core/sar/cascade.py`, `core/sar/detection.py`, `core/sar/losses.py`

---

## Stage 3: Weathering Inversion & Reverse Drift

**Status: ✅ FULLY LIVE**

**What is working:**
- `POST /api/v1/drift/backtrack` fetches **real live data** from two free APIs:
  - **Open-Meteo Marine API** → `ocean_current_velocity`, `ocean_current_direction`
  - **Open-Meteo Weather API** → `wind_speed_10m`, `wind_direction_10m`
- No API key required for either — completely open access
- Converts polar coordinates to cartesian (U/V components)
- Runs Fay-Mackay evaporative inversion to estimate slick age
- Runs **4th-Order Runge-Kutta (RK4)** Lagrangian backtracking with Samuels-Allen leeway
- Returns full 12-hour trajectory with per-hour uncertainty radius
- Monte Carlo ensemble (50 particles) generates confidence ellipse around origin

**What is NOT yet connected:**
- INCOIS Indian Ocean State Forecasts — requires formal MoU with Ministry of Earth Sciences
- ECMWF ERA5 reanalysis winds — requires institutional license
- Open-Meteo is a fully functional free replacement for both of these

**Files:** `api/routes/drift.py`, `core/drift/rk4.py`, `core/drift/weathering.py`

---

## Stage 4: Kinematic Fusion & Vessel Attribution

**Status: ✅ ALGORITHM LIVE — ⚠️ SIMULATED AIS DATA**

**What is working:**
- Full 5-factor Bayesian attribution scoring engine
- Traffic funnel filter (35 km radius, 6-hour window around origin)
- Dark-ship AIS gap detection and dead-reckoning
- Dirichlet-Categorical posterior normalization
- Closest Point of Approach (CPA) distance likelihood kernel
- Mock candidate vessels **dynamically repositioned** around the actual drift backtrack origin (not hardcoded)

**What is NOT yet connected:**
- Live AIS data stream — commercial APIs (MarineTraffic, VesselFinder, Spire) require enterprise licensing ($500–$5,000/month)
- **Plan:** Acquire commercial license post-SIH and wire it into `api/routes/attribution.py`

**Files:** `api/routes/attribution.py`, `core/correlation/attribution.py`, `core/correlation/traffic_filter.py`

---

## Stage 5: Cryptographic Evidence Ledger

**Status: ✅ FULLY LIVE**

**What is working:**
- Real SHA-256 hashing of live detection JSON payloads using Python `hashlib`
- Binary Merkle tree over SAR + AIS + MetOcean + Attribution data layers
- Ed25519 digital signatures via Python `cryptography` package (PyNaCl)
- `GET /api/v1/evidence/ledger` — returns the full signed Merkle chain
- `POST /api/v1/evidence/verify` — runs 6-tier integrity verification
- Ledger is automatically rebuilt when new live satellite data arrives (via `api/forensics.py`)

**Files:** `api/routes/evidence.py`, `api/forensics.py`, `core/evidence/ledger.py`

---

## Stage 6: Common Operating Picture & Section 65B Dossier

**Status: ✅ FULLY LIVE**

**What is working:**
- Next.js 16 frontend deployed on **Vercel** — [sagar-drishti-zeta.vercel.app](https://sagar-drishti-zeta.vercel.app/operations)
- MapLibre GL JS COP map with satellite basemap (ESRI World Imagery)
- Map camera **dynamically centers on the live incident coordinates**
- 8-stage cinematic demo runs on the Gulf of Kutch reference incident (click "MISSION DEMO")
- SAR viewer with High-DPI canvas rendering (fixed for Retina displays)
- `GET /api/v1/evidence/dossier/pdf` — auto-generates Section 65B court PDF using ReportLab
- Incident registry shows live detection at the top, followed by mock reference incidents

**Files:** `frontend/src/`, `api/routes/evidence.py`, `core/evidence/ledger.py`

---

## Quickstart

```bash
# Backend
pip install -r requirements.txt
uvicorn api.main:app --reload
# → http://localhost:8000 | Swagger: http://localhost:8000/docs

# Frontend
cd frontend && npm install && npm run dev
# → http://localhost:3000

# Tests
pytest tests/ -q
# → 81 passed
```

---

## Roadmap (Post-SIH)

| Priority | Task | Blocker | ETA |
|---|---|---|---|
| 🔴 | Train SegFormer on Krestenitis dataset | Supervisor institutional email required | After mid-sem exams |
| 🔴 | Connect commercial AIS API | Enterprise licensing required | Post-SIH funding |
| 🟡 | Connect INCOIS ocean currents | Formal MoU with Ministry of Earth Sciences | Post-SIH |
| 🟡 | Multi-port parallel scanning in GitHub Actions | Engineering only, no external blockers | 1 week |
| 🟢 | RISAT-1A integration | NRSC data access | Post-SIH |

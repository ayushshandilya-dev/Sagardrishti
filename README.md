# 🛰️ SAGARDRISHTI — AI-Powered Satellite SAR Oil Spill Detection & Forensic Vessel Attribution

> **Smart India Hackathon 2026 — Team Coding Crows (SIH26143)**  
> Problem Statement PS-SIH143: Leveraging satellite imagery to detect oil spills at sea along with AIS data correlation for locating the vessel responsible for oil spill.  
> Ministry: Ocean Development & Maritime Affairs

**Live Demo:** [sagar-drishti-zeta.vercel.app/operations](https://sagar-drishti-zeta.vercel.app/operations)  
**GitHub:** [ayushshandilya-dev/Sagardrishti](https://github.com/ayushshandilya-dev/Sagardrishti)

---

## 🚦 Current System Status (As of October 2, 2026)

This table shows the honest real-time status of every component in the system — what is **live and operational**, what is **simulated with real data structures**, and what is **planned** for the next phase.

| Component | Status | Notes |
|---|---|---|
| **Next.js Frontend (COP Dashboard)** | ✅ **Live** | Deployed on Vercel — [sagar-drishti-zeta.vercel.app](https://sagar-drishti-zeta.vercel.app/operations) |
| **FastAPI Backend (REST API)** | ✅ **Live (local)** | All 4 route modules functional. Run with `uvicorn api.main:app --reload` |
| **Sentinel-1 SAR Ingestion (CDSE API)** | ✅ **Live** | GitHub Actions pipeline automatically polls & downloads real Sentinel-1 GRD-IW imagery from the [Copernicus Data Space Ecosystem](https://dataspace.copernicus.eu/) every 12 hours |
| **Oil Spill AI Detection (SegFormer)** | ✅ **Live (Synthetic Weights)** | SegFormer-B3 model runs inference on real satellite tiles. Trained on synthetic data; Krestenitis dataset upgrade planned post-mid-semester exams |
| **Reverse Drift (RK4 Physics Engine)** | ✅ **Live** | `POST /api/v1/drift/backtrack` fetches **real ocean currents & wind** from Open-Meteo API (no license required) and runs 4th-Order Runge-Kutta Lagrangian backtracking |
| **Open-Meteo Hydrodynamics** | ✅ **Live** | Free, no-auth marine & weather API. Provides `ocean_current_velocity`, `ocean_current_direction`, `wind_speed_10m`, `wind_direction_10m` |
| **Cryptographic Evidence Ledger** | ✅ **Live** | Real SHA-256 hashes, Merkle tree, and Ed25519 digital signatures via Python `hashlib` + `cryptography` package. `GET /api/v1/evidence/ledger` |
| **Section 65B Legal PDF Dossier** | ✅ **Live** | Auto-generated from `GET /api/v1/evidence/dossier/pdf` using ReportLab |
| **8-Stage Cinematic Demo** | ✅ **Live** | Choreographed 3D map demo in the frontend using the Gulf of Kutch reference incident. Click "MISSION DEMO" |
| **MapLibre GL COP Map** | ✅ **Live** | Real satellite basemap (ESRI). Dynamically centers on live incident coordinates |
| **Live Satellite Incident (CDSE)** | ✅ **Live** | `output/latest_detection.json` is written by the GitHub Actions pipeline. Served at the top of the incidents list |
| **AIS Vessel Tracking** | ⚠️ **Simulated** | Real AIS data requires a commercial license (MarineTraffic/VesselFinder API). Mock vessels are dynamically scattered around the real drift origin for each spill |
| **INCOIS Ocean Currents** | ⚠️ **Not Connected** | INCOIS API access requires formal MoU with the Ministry of Earth Sciences. Replaced by Open-Meteo for now |
| **Krestenitis Model Training** | ⚠️ **Pending** | Dataset access requires a supervisor's institutional email. We will train final model weights after mid-semester exams |
| **Vessel Attribution (AIS backend)** | ⚠️ **Simulated** | 5-factor Bayesian scoring engine is fully built; operates on mock AIS data until live feed is available |

---

## 🏗️ Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                  SAGARDRISHTI PIPELINE (6 STAGES)                   │
├─────────┬───────────────┬──────────────┬──────────┬─────────────────┤
│ STAGE 1 │ STAGE 2       │ STAGE 3      │ STAGE 4  │ STAGE 5 + 6     │
│ Ingest  │ Detect        │ Drift        │ Attribute│ Evidence + COP  │
│ CDSE    │ SegFormer-B3  │ RK4 + Open-  │ Bayesian │ SHA-256 Merkle  │
│ API ✅  │ AI ✅         │ Meteo API ✅ │ (Mock    │ + Maplibre GL   │
│         │               │              │ AIS) ⚠️  │ Dossier PDF ✅  │
└─────────┴───────────────┴──────────────┴──────────┴─────────────────┘
```

### Key Components

#### Frontend (`/frontend`)
- **Framework:** Next.js 16 (App Router) + TypeScript
- **Map Engine:** MapLibre GL JS v6 with satellite basemap (ESRI World Imagery)
- **State:** Zustand store (`useCommandStore`)
- **Key Pages:**
  - `/operations` — Main COP Dashboard with live incident registry
  - `/sar/[id]` — Individual SAR scene viewer with High-DPI canvas rendering
  - `/sar-investigation` — 8-Stage cinematic forensic demo (click "MISSION DEMO")
  - `/drift` — Reverse drift trajectory viewer
  - `/attribution` — Vessel attribution scorecards
  - `/evidence` — Cryptographic ledger & verification
  - `/dossier` — Section 65B PDF download

#### Backend (`/api`)
- **Framework:** FastAPI + Uvicorn
- **Routes:**
  - `GET /api/v1/incidents` — Returns all incidents, live data prepended at position 0
  - `POST /api/v1/drift/backtrack` — **Live Open-Meteo integration**, RK4 physics
  - `GET /api/v1/attribution/candidates` — Bayesian vessel scoring (simulated AIS)
  - `GET /api/v1/evidence/ledger` — Real SHA-256 Merkle chain
  - `POST /api/v1/evidence/verify` — 6-tier cryptographic verification
  - `GET /api/v1/evidence/dossier/pdf` — Auto-generated Section 65B PDF

#### Live Satellite Pipeline (`/scripts/live_monitor.py` + `/.github/workflows/live_monitor.yml`)
- Runs automatically every 12 hours via GitHub Actions
- Authenticates with the [Copernicus Data Space Ecosystem (CDSE)](https://dataspace.copernicus.eu/)
- Downloads latest Sentinel-1 GRD-IW scene for a configurable bounding box
- Runs SegFormer-B3 AI model for oil spill detection
- Writes detection result to `output/latest_detection.json` and commits it to the repo
- Frontend reads this file and displays the live incident at the top of the dashboard

**Triggering a manual scan over a different port:**
1. Go to [Actions → Sagardrishti Live Oil Spill Monitor](https://github.com/ayushshandilya-dev/Sagardrishti/actions/workflows/live_monitor.yml)
2. Click **Run workflow**
3. Enter bounding box: `MinLat,MinLon,MaxLat,MaxLon`
   - Mumbai Offshore: `18.5,71.5,19.5,72.5`
   - Chennai Offshore: `12.5,80.0,13.5,81.0`
   - Gulf of Kutch: `22.0,68.5,23.0,69.5`
4. Set `days` to `14` to ensure a satellite pass is found

---

## 🚀 Quickstart

### Prerequisites
- Python 3.11+
- Node.js 22+
- `uv` package manager (recommended) or `pip`

### 1. Backend Setup
```bash
git clone https://github.com/ayushshandilya-dev/Sagardrishti.git
cd Sagardrishti

# Install Python dependencies
pip install -r requirements.txt

# Start FastAPI backend
uvicorn api.main:app --reload
# → Backend live at http://localhost:8000
# → Swagger docs at http://localhost:8000/docs
```

### 2. Frontend Setup
```bash
cd frontend
npm install
npm run dev
# → Frontend live at http://localhost:3000
```

### 3. Run Tests
```bash
pytest tests/ -q
# → 81 tests passing across all scientific modules
```

---

## 📁 Repository Structure

```
Sagardrishti/
│
├── .github/
│   └── workflows/
│       └── live_monitor.yml       # ✅ Live: Automated Sentinel-1 satellite pipeline (runs every 12h)
│
├── api/                           # FastAPI Backend
│   ├── main.py                    # App factory, CORS, WebSocket
│   ├── config.py                  # Env config, cryptographic node keys
│   ├── db.py                      # SQLAlchemy ORM (SQLite local / Postgres prod)
│   ├── forensics.py               # ✅ Live: SHA-256 + Merkle + Ed25519 evidence assembly
│   └── routes/
│       ├── incidents.py           # ✅ Live: Serves CDSE detection + mock incidents
│       ├── drift.py               # ✅ Live: Open-Meteo + RK4 backtracking
│       ├── attribution.py         # ⚠️ Simulated: Bayesian scoring on mock AIS
│       └── evidence.py            # ✅ Live: Cryptographic ledger + PDF dossier
│
├── core/                          # Scientific & Physics Core
│   ├── sar/                       # SAR preprocessing, CFAR, SegFormer cascade
│   ├── drift/                     # Fay-Mackay weathering, RK4 engine, Monte Carlo ensemble
│   ├── correlation/               # Bayesian attribution, Dirichlet posterior, explainability
│   ├── evidence/                  # Merkle tree, Ed25519, Section 65B PDF generator
│   └── metocean/                  # MetOcean provider interface (Open-Meteo integrated)
│
├── frontend/                      # Next.js 16 COP Dashboard
│   └── src/
│       ├── app/                   # Route pages (operations, sar, drift, attribution, evidence)
│       ├── components/
│       │   ├── map/               # MapLibre GL maritime map, camera engine, vessel markers
│       │   └── sar-investigation/ # 8-stage cinematic demo engine
│       └── lib/
│           ├── api.ts             # HTTP client with graceful mock fallback
│           ├── store.ts           # Zustand global state
│           └── mockData.ts        # Fallback data when backend is offline
│
├── scripts/
│   ├── live_monitor.py            # ✅ Live: CDSE auth, satellite download, AI inference
│   └── train_smoke_test.py        # Model training smoke test (for Krestenitis upgrade)
│
├── output/
│   ├── latest_detection.json      # ✅ Live: Written by GitHub Actions on each satellite pass
│   ├── evidence_dossier.pdf       # ✅ Live: Auto-generated Section 65B court dossier
│   ├── evidence_dossier.json      # ✅ Live: Canonical RFC 8785 evidence bundle
│   └── ledger_chain.json          # ✅ Live: Append-only cryptographic blockchain
│
├── data/
│   └── sample_scenes.py           # Reference scenes for 8-stage demo & dossier generation
│
├── tests/                         # 81 pytest test cases
│
├── requirements.txt               # Full dependency list
└── docker-compose.yml             # Multi-container stack (Postgres + API)
```

---

## 🔮 Roadmap (Post-SIH Submission)

| Priority | Task | Blocker |
|---|---|---|
| 🔴 High | Train SegFormer on **Krestenitis dataset** (real labelled spills) | Need institutional/supervisor email for dataset access. Planned after mid-semester exams |
| 🔴 High | Integrate **commercial AIS API** (MarineTraffic / VesselFinder) | Requires enterprise licensing |
| 🟡 Medium | Connect **INCOIS ocean current API** for Indian coastal precision | Requires formal MoU with Ministry of Earth Sciences |
| 🟡 Medium | Improve **COP Map** — add vessel wakes, AIS track history, and real-time search-and-rescue zones | Engineering work, no external blockers |
| 🟢 Low | Add **multi-port simultaneous monitoring** to the GitHub Actions pipeline | Architecture change: parallel jobs per port |
| 🟢 Low | **RISAT-1A integration** alongside Sentinel-1 | Requires NRSC data access |

---

## 🧪 Test Coverage

```
tests/test_attribution.py      ........ 23 passed
tests/test_cmod5.py            .....     3 passed
tests/test_drift.py            .......   7 passed
tests/test_evidence.py         ........  11 passed
tests/test_losses.py           .......   3 passed
tests/test_optical.py          ....      4 passed
tests/test_sar_cascade.py      ........  8 passed
tests/test_sar_eos04.py        .....     3 passed
tests/test_stage4_hardening.py ....      3 passed
tests/test_weathering.py       .....     3 passed
─────────────────────────────────────────────────
81 passed in 23.55s
```

---

## 📜 License & Attribution

Developed for the **Smart India Hackathon 2026 (SIH26143)** by **Team Coding Crows**.  
Licensed under the **Apache License, Version 2.0**.

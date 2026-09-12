# Sagar-Drishti

### AI-Powered Satellite SAR Oil Spill Detection & Forensic Vessel Attribution System

**Problem Statement Reference**: SIH26143 (Smart India Hackathon)  
**Target Stakeholders**: Indian Coast Guard (ICG), Directorate General of Shipping (DGS), Ministry of Earth Sciences (MoES)

---

## Executive Overview

Sagar-Drishti is an end-to-end maritime domain awareness platform that:

1. **Detects oil slicks** from Sentinel-1 C-Band SAR imagery — all-weather, all-dark capability under monsoon cloud cover and at night.
2. **Filters look-alikes** (biogenic blooms, low-wind calms, ship wakes) using dual-pol backscatter and texture metrics.
3. **Backtracks the discharge origin** with a 4th-order Runge–Kutta (RK4) Lagrangian advection engine driven by INCOIS surface currents and ECMWF winds — recovering `(x₀, y₀, t₀)`.
4. **Attribures the spill to a vessel** by fusing AIS trajectories into a 5-factor Bayesian score: proximity, heading collinearity, vessel-type prior, kinematic (tank-washing) anomaly, and temporal causality.
5. **Produces tamper-evident, court-ready dossiers** sealed with SHA-256 Merkle trees and Ed25519 signatures — Section 65B (Indian Evidence Act, 1872) / Section 63 (Bharatiya Sakshya Adhiniyam, 2023) compliant, aligned with IMO MARPOL Annex I Regulation 15.

The command console (`frontend/`) is a React + MapLibre GL command center that renders all of it live: satellite swath overlays, animated drift reconstruction, AIS traffic, ranking and an interactive evidence-ledger verifier.

---

## Repository Structure

```
.
├── main.py                      # Entry point: `pipeline`, `api`, `test` commands
├── requirements.txt             # Full backend dependency manifest (heavy — see below)
├── docker-compose.yml           # Optional Docker stack (backend + dashboard)
├── architecture.md              # Master architecture & technical specification
│
├── api/
│   ├── main.py                  # FastAPI app assembly + health + vessels + metocean
│   └── routes/
│       ├── incidents.py         # SAR scene catalog
│       ├── drift.py             # RK4 reverse backtracking
│       ├── attribution.py       # 5-factor Bayesian vessel scoring
│       └── evidence.py          # Merkle ledger + verification sequence
│
├── core/
│   ├── drift/rk4.py             # 4th-order Runge–Kutta reverse advection
│   ├── correlation/attribution.py  # Bayesian scoring + kinematic anomaly detection
│   └── evidence/ledger.py       # SHA-256 Merkle chain, Ed25519 signing, PDF/A dossier
│
├── data/
│   └── sample_scenes.py         # Canonical scenes, AIS vessels, MetOcean snapshot
│
├── frontend/                    # Next.js command center (web console)
│   ├── src/lib/api.ts           # Live API client with offline mock fallback
│   ├── src/lib/bootstrap.ts     # Hydrates the store from the live backend
│   └── src/app/                 # /operations /sar/[id] /drift /attribution
│                                # /vessels/[imo] /evidence /dossier /settings
│
├── dashboard/app.py             # Rapid Streamlit dashboard
└── tests/                       # Pytest suite (attribution, drift, evidence)
```

---

## Quickstart (Native — Recommended)

The primary way to run the platform. No Docker required; runs well on a laptop.

### 1. Backend API

```bash
# Use a fresh venv — the full requirements.txt is heavy (torch, rasterio, …).
# The API only needs a small subset:
python3 -m venv venv
venv/bin/pip install -q numpy scipy fastapi uvicorn pydantic pytest pynacl reportlab

# Start the API gateway (reloads on code changes):
venv/bin/python main.py api
```

- Swagger docs: <http://localhost:8000/docs>
- Health check: <http://localhost:8000/health>

### 2. Web Console

```bash
cd frontend
npm install
npm run dev
```

Open <http://localhost:3000> → console lands on `/operations`.

The **DATA LIVE / SIMULATED** chip in the top bar shows connectivity:

| State  | Meaning                                                                   |
|--------|---------------------------------------------------------------------------|
| `DATA LIVE` (green)      | Backend reachable — map, drift, attribution and ledger stream from the API. Click to re-sync. |
| `DATA SIMULATED` (amber) | API unreachable — the console renders offline-cached scene data. Click to retry. |

The console hydrates once on load; every request has a cached mock fallback, so the UI never blanks.

### 3. Run the Detection Pipeline (CLI)

```bash
venv/bin/python main.py pipeline                 # runs on bundled sample data
venv/bin/python main.py pipeline --backtrack-hours 6 --output-dir ./output
```

Produces `evidence_dossier.json` + `evidence_dossier.pdf` (court-ready MARPOL dossier) with the hash-linked ledger for the reconstructed discharge origin.

### 4. Tests

```bash
venv/bin/python main.py test          # or: venv/bin/python -m pytest tests/
```

### What Minimal Dependencies Does the API Need?

The `requirements.txt` list includes the full science stack (PyTorch, rasterio, geopandas) for training/inference on real scenes. The API and tests run on a much smaller set:

```
numpy scipy fastapi uvicorn pydantic pytest pynacl reportlab
```

Install those (as above) and ignore the heavy entries until you plug in real SAR ingestion.

---

## Optional: Docker

Docker runs the backend + dashboard in containers. The web console is behind the `full` profile because an 8 GB machine runs the native console far better.

```bash
docker compose up -d                # backend on :8000 + dashboard on :8501
docker compose --profile full up -d # + web console on :3000
```

> Native mode is the reference deployment. Docker is provided for demoing the backend on machines that have RAM to spare.

---

## API Surface

| Method | Endpoint                                        | Purpose                                       |
|--------|-------------------------------------------------|-----------------------------------------------|
| GET    | `/health`                                       | Liveness probe                                |
| GET    | `/api/v1/incidents`                             | SAR scene catalog (current incidents)         |
| POST   | `/api/v1/drift/backtrack`                       | RK4 reverse drift from slick centroid         |
| GET    | `/api/v1/attribution/candidates`                | Ranked AIS suspects vs discharge origin       |
| GET    | `/api/v1/evidence/ledger`                       | PoW-mined Merkle chain blocks                 |
| POST   | `/api/v1/evidence/verify`                       | Full 6-tier integrity verification sequence   |
| GET    | `/api/v1/vessels`                               | Monitored AIS vessels                         |
| GET    | `/api/v1/metocean`                              | INCOIS/ECMWF vector fields                    |

---

## The Evidence Chain (how the tamper-evidence works)

1. Four leaves are hashed from the **actual** data: the SAR scene, the AIS stream payload, the MetOcean snapshot, and the attribution matrix.
2. The leaves fold into a binary **Merkle root**.
3. The root is signed by the ICG node authority with **Ed25519** (RFC 8032).
4. Four blocks are **PoW-mined** (`00…` prefix) and chained with `prev_block_hash` links.
5. The dashboard's Evidence page re-runs `/api/v1/evidence/verify` live — any mutation of the data, a leaf, a block, or the signature breaks the chain and the UI reports it.

`tests/test_evidence.py` demonstrates tamper detection by mutating a block and asserting `verify_chain()` fails.

---

## How to Extend

- **Live SAR ingestion**: replace `data/sample_scenes.py` with a Copernicus CDSE OData client; keep the scene JSON schema identical and the console consumes it unchanged.
- **Deep learning segmenter**: drop a SegFormer/DeepLab checkpoint behind `core/models/` to replace the heuristic slick extraction.
- **Live AIS**: swap the sample vessels for a decoded AIVDM stream (the attribution route already consumes per-vessel events).
- **Scale-out**: the commented `postgres`/`redis`/`timescaledb`/`minio` services in `docker-compose.yml` are the intended multi-node path.

---

## Legal & Evidentiary Compliance

- **Section 65B, Indian Evidence Act, 1872** & **Section 63, Bharatiya Sakshya Adhiniyam, 2023**: electronic record certificate with automated system host/process verification.
- **SHA-256 Merkle chain + Ed25519 signing**: prevents post-facto modification of raw SAR, AIS pings, MetOcean fields, or attribution scores.
- **MARPOL Annex I, Regulation 15**: discharge reporting aligned with IMO criteria.

---

## Documentation

- Master architecture: [`architecture.md`](architecture.md)
- Console internals: `frontend/src/lib/bootstrap.ts`, `frontend/src/lib/api.ts`
- Elevator pitch: [`PITCH.md`](PITCH.md)
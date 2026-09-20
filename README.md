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
4. **Attributes the spill to a vessel** by fusing AIS trajectories into a 5-factor Bayesian score: proximity, heading collinearity, vessel-type prior, kinematic (tank-washing) anomaly, and temporal causality.
5. **Produces tamper-evident, court-ready dossiers** sealed with SHA-256 Merkle trees and Ed25519 signatures — Section 65B (Indian Evidence Act, 1872) / Section 63 (Bharatiya Sakshya Adhiniyam, 2023) compliant, aligned with IMO MARPOL Annex I Regulation 15.

The command console (`frontend/`) is a React + MapLibre GL command center that renders all of it live: satellite swath overlays, animated drift reconstruction, AIS traffic, ranking and an interactive evidence-ledger verifier.

---

## Repository Structure

```
.
├── main.py                      # Entry point: `pipeline`, `api`, `dashboard`, `test`
├── requirements.txt             # Full backend dependency manifest (heavy — see below)
├── requirements-api.txt         # Slim runtime deps for the API image (no GDAL/torch)
├── docker-compose.yml           # Production stack: Postgres + API + dashboard [+ console]
├── docker/Dockerfile            # Dashboard image (python:3.11-slim + GDAL geospatial stack)
├── Architecture.md              # Master architecture & technical specification
├── PITCH.md                     # Two-minute elevator pitch
│
├── api/
│   ├── main.py                  # FastAPI app assembly + health + vessels + metocean
│   ├── config.py                # Pydantic-settings (DB URL, CORS, signing key, env)
│   ├── db.py                    # SQLAlchemy store (Postgres/SQLite) + audit tables
│   ├── seed.py                  # Idempotent startup seeder from sample scenes
│   ├── forensics.py             # Ledger/verify payload assembly (shared by routes + seed)
│   └── routes/
│       ├── incidents.py         # SAR scene catalog (/api/v1/incidents, DB-backed)
│       ├── drift.py             # RK4 reverse backtracking (+ audit-trail persistence)
│       ├── attribution.py       # 5-factor Bayesian vessel scoring (+ audit-trail persistence)
│       └── evidence.py          # Merkle ledger + verification sequence (DB-backed)
│
├── core/
│   ├── sar/
│   │   ├── detection.py         # SegFormer / DeepLabV3+ / U-Net segmentation detectors
│   │   ├── preprocessing.py     # Radiometric calibration, Refined Lee speckle filter
│   │   └── texture.py           # Haralick GLCM look-alike discriminator
│   ├── ais/parser.py            # CSV/JSON AIS ingestion, trajectories, anomaly detection
│   ├── drift/rk4.py             # 4th-order Runge–Kutta reverse advection
│   ├── correlation/attribution.py  # Bayesian scoring + kinematic anomaly detection
│   ├── evidence/ledger.py       # SHA-256 Merkle chain, Ed25519 signing, PDF/A dossier
│   └── metocean/fetchers.py     # INCOIS / ECMWF providers + bilinear interpolation
│
├── data/
│   └── sample_scenes.py         # Canonical scenes, AIS vessels, MetOcean snapshot, EEZ corridors
│
├── dashboard/app.py             # Rapid Streamlit dashboard (4 pages)
│
├── frontend/                    # Next.js 16 web console (React + MapLibre GL)
│   ├── src/lib/                 # api.ts (live client), mockData.ts, store.ts, bootstrap.ts, types.ts
│   ├── src/app/                 # /operations /sar/[id] /sar-investigation /drift /attribution
│   │                            #  /vessels/[imo] /evidence /dossier /settings
│   ├── src/components/          # shell, map, sar, sar-investigation, drift, attribution,
│   │                            #  evidence, incident, vessels, kpi
│   ├── e2e/smoke.spec.ts        # Playwright browser checks
│   ├── Dockerfile               # Optional containerized console (--profile full)
│   └── AGENTS.md / CLAUDE.md    # Dev-agent guides (AGENTS.md is re-added by `next dev`)
│
└── tests/                       # Pytest suite — attribution, drift, evidence (39 cases)
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

## Optional: Docker (full production stack)

The compose stack now runs a **real Postgres store** seeded on boot, the slim API image, and the Streamlit dashboard. The web console is behind the `full` profile because an 8 GB machine runs the native console far better.

```bash
docker compose up -d                # Postgres + API on :8000 + dashboard on :8501
docker compose --profile full up -d # + web console on :3000
```

The API persists incidents, vessels, the evidence ledger, and every drift/attribution
computation as an audit trail. With no `DATABASE_URL` set it gracefully falls back to
SQLite (`data/sagar_drishti.db`); set `DATABASE_URL` to Postgres for production.

> Native mode is the reference deployment. Docker is provided for demoing the stack on machines that have RAM to spare.

---

## Deploying to the public internet

**Backend + database** (Render / Railway), then **console** (Vercel). The console
auto-detects a reachable backend and switches LIVE — otherwise it runs self-contained
(SIMULATED).

### Backend on Render
1. New **Web Service** → connect the GitHub repo → directory root, build `pip install -r requirements-api.txt`, start `uvicorn api.main:app --host 0.0.0.0 --port 10000`.
2. Add a **PostgreSQL** database (Render free tier) and set:
   - `DATABASE_URL` = the Postgres URI
   - `CORS_ORIGINS` = your Vercel URL
   - `NODE_SIGNING_KEY` = a fresh hex key (32 bytes)
3. Deploy. Seed data auto-loads on first boot (`/health` → `"database":"up"`).

### Console on Vercel
1. New project → same repo → **root directory: `frontend`**, framework **Next.js**.
2. Add env var `NEXT_PUBLIC_API_URL` = `https://<your-render-api>/`.
3. Deploy. The bootstrap pings `/health`; if CORS/reachability fails it degrades to SIMULATED rather than breaking the demo.

### Secrets
Postgres URI and signing keys live in the host platform's config (never the repo).
The `.env.example` files document every knob; the compose file reads `POSTGRES_PASSWORD`
and `NODE_SIGNING_KEY` from your shell/.env when provided.

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
- **Deep learning segmenter**: drop a SegFormer/DeepLab checkpoint behind `core/sar/detection.py` (register it with `load_pretrained_model`) to replace the heuristic slicer.
- **Live AIS**: swap the sample vessels for a decoded AIVDM stream (`core/ais/parser.py` already ingests CSV/JSON; the attribution route consumes per-vessel events).
- **Scale-out**: `docker-compose.yml` already wires Postgres (the store) in; the intended multi-node path adds Redis (live telemetry) and MinIO/TimescaleDB for dense SAR/AIS history after real ingestion replaces the sample scenes.

---

## Legal & Evidentiary Compliance

- **Section 65B, Indian Evidence Act, 1872** & **Section 63, Bharatiya Sakshya Adhiniyam, 2023**: electronic record certificate with automated system host/process verification.
- **SHA-256 Merkle chain + Ed25519 signing**: prevents post-facto modification of raw SAR, AIS pings, MetOcean fields, or attribution scores.
- **MARPOL Annex I, Regulation 15**: discharge reporting aligned with IMO criteria.

---

## Documentation

- Master architecture: [`Architecture.md`](Architecture.md)
- Console internals: `frontend/src/lib/bootstrap.ts`, `frontend/src/lib/api.ts`
- Elevator pitch: [`PITCH.md`](PITCH.md)
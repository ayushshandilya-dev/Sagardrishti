# SAGARDRISHTI — System Architecture
**Problem Statement: SIH26143**  
**Team: Coding Crows**  
**Last Updated: October 2, 2026 (SIH Submission)**

---

## 1. Problem Statement

Three critical gaps exist in current maritime oil spill enforcement:

1. **Delayed Detection:** Spills are reported hours after discharge, by which time the slick has drifted far from its origin, destroying the spatial link to the responsible vessel.
2. **Attribution Void ("Nearest-Ship Fallacy"):** Ocean currents and monsoon winds drift slicks 0.5–2.5 knots, shifting them many nautical miles from where the discharge occurred hours prior.
3. **Evidentiary Inadmissibility:** Standard ML confidence scores are not legally usable under Section 65B of the Indian Evidence Act or MARPOL Annex I without a cryptographically verifiable chain of custody.

---

## 2. System Architecture

### 2.1 High-Level Data Flow

```
 ┌──────────────────────────────────────────────────┐
 │            EXTERNAL DATA SOURCES                 │
 │                                                  │
 │  Sentinel-1 SAR ✅  CDSE OData API               │
 │  Ocean Currents ✅  Open-Meteo Marine API (free)  │
 │  Wind Fields    ✅  Open-Meteo Weather API (free) │
 │  Basemap        ✅  ESRI World Imagery (free)     │
 │  AIS Vessels    ⚠️  Simulated (licensing pending) │
 │  INCOIS Currents ⚠️ MoU required                 │
 └─────────────────────┬────────────────────────────┘
                       │
 ┌─────────────────────▼────────────────────────────┐
 │         GITHUB ACTIONS PIPELINE (12h cron)       │
 │  scripts/live_monitor.py                         │
 │  1. Auth → CDSE API                              │
 │  2. Query OData catalog for latest GRD-IW scene  │
 │  3. Download + unzip ~1.5 GB tile                │
 │  4. Radiometric calibration + Lee speckle filter │
 │  5. CFAR scout → SegFormer-B3 inference          │
 │  6. Write output/latest_detection.json           │
 │  7. Git commit + push to main                    │
 └─────────────────────┬────────────────────────────┘
                       │
 ┌─────────────────────▼────────────────────────────┐
 │            FASTAPI BACKEND (Python)              │
 │  api/main.py                                     │
 │                                                  │
 │  GET  /incidents      ← reads latest_detection   │
 │  POST /drift/backtrack ← Open-Meteo + RK4        │
 │  GET  /attribution/candidates ← Bayesian + mock  │
 │  GET  /evidence/ledger ← SHA-256 Merkle chain    │
 │  POST /evidence/verify ← 6-tier verification     │
 │  GET  /evidence/dossier/pdf ← Section 65B PDF    │
 └─────────────────────┬────────────────────────────┘
                       │
 ┌─────────────────────▼────────────────────────────┐
 │     NEXT.JS 16 FRONTEND (Vercel — live)          │
 │  sagar-drishti-zeta.vercel.app                   │
 │                                                  │
 │  /operations       COP Map + Incident Registry   │
 │  /sar/[id]         SAR Scene Viewer              │
 │  /sar-investigation 8-Stage Cinematic Demo       │
 │  /drift            RK4 Trajectory Map            │
 │  /attribution      Vessel Scoring Cards          │
 │  /evidence         Cryptographic Ledger          │
 │  /dossier          Section 65B PDF Download      │
 └──────────────────────────────────────────────────┘
```

### 2.2 Six-Stage Processing Pipeline

```
STAGE 1         STAGE 2          STAGE 3          STAGE 4          STAGE 5         STAGE 6
────────        ────────         ────────         ────────         ────────        ────────
Ingestion  →   Detection   →    Reverse    →    Vessel      →    Evidence   →    COP &
& Cond.        & Volume         Drift           Attribution       Ledger          Dossier

CDSE API       CFAR Scout       Open-Meteo       Bayesian         SHA-256         Maplibre
✅ LIVE        SegFormer-B3     Marine API ✅    Posterior        Merkle Tree     GL Map ✅
               ✅ LIVE          RK4 Engine ✅    ✅ Built         Ed25519 Sig
               (synthetic       Fay-Mackay       ⚠️ Mock AIS     ✅ LIVE
               weights) ⚠️      Inversion ✅
```

---

## 3. Component Architecture

### 3.1 Frontend (`/frontend`)

| Component | Technology | Status |
|---|---|---|
| Framework | Next.js 16 (App Router) + TypeScript | ✅ Live on Vercel |
| Map Engine | MapLibre GL JS v6 | ✅ Live |
| Satellite Basemap | ESRI World Imagery tiles | ✅ Live (no key needed) |
| State Management | Zustand (`useCommandStore`) | ✅ |
| SAR Viewer | HTML5 Canvas (High-DPI fixed) | ✅ |
| 8-Stage Demo | Custom cinematic engine (`sarCanvas.ts`, `useInvestigation.ts`) | ✅ |
| Live Data | `lib/api.ts` polls backend, falls back to mockData.ts | ✅ |

**Key files:**
- `frontend/src/components/map/RealMaritimeMap.tsx` — Main COP map
- `frontend/src/components/map/engine/camera.ts` — Camera poses & flyTo logic
- `frontend/src/components/sar-investigation/useInvestigation.ts` — 8-stage demo
- `frontend/src/lib/api.ts` — HTTP client
- `frontend/src/lib/mockData.ts` — Fallback data when backend offline

### 3.2 Backend (`/api`)

| Route | Method | Status | Notes |
|---|---|---|---|
| `/incidents` | GET | ✅ Live | Reads `latest_detection.json`, prepends to mock list |
| `/drift/backtrack` | POST | ✅ Live | Calls Open-Meteo, runs RK4 |
| `/attribution/candidates` | GET | ✅ Built / ⚠️ Mock AIS | Bayesian scoring on simulated vessels |
| `/evidence/ledger` | GET | ✅ Live | Real SHA-256 + Merkle |
| `/evidence/verify` | POST | ✅ Live | 6-tier cryptographic check |
| `/evidence/dossier/pdf` | GET | ✅ Live | Auto-generates Section 65B PDF |

### 3.3 Scientific Core (`/core`)

| Module | Algorithm | Status |
|---|---|---|
| `core/sar/cascade.py` | CFAR → SegFormer-B3 → DeepLabV3+ consensus | ✅ |
| `core/sar/losses.py` | Focal + Lovász-Softmax compound loss | ✅ |
| `core/drift/rk4.py` | 4th-Order Runge-Kutta Lagrangian backtracking | ✅ |
| `core/drift/weathering.py` | Fay-Mackay evaporative inversion | ✅ |
| `core/correlation/attribution.py` | 5-factor Dirichlet-Categorical Bayesian posterior | ✅ |
| `core/evidence/ledger.py` | SHA-256 Merkle tree + Ed25519 signatures | ✅ |

### 3.4 Live Satellite Pipeline (`/scripts` + `/.github/workflows`)

The GitHub Actions pipeline (`live_monitor.yml`) runs automatically every 12 hours and can be manually triggered for any global bounding box.

**Steps:**
1. Authenticate with CDSE (`mishrabhishek.2007@gmail.com` credentials stored as GitHub Secrets)
2. Query OData catalog for latest Sentinel-1 GRD-IW product in bbox
3. Download zip archive (~1.5 GB)
4. Extract `.SAFE` folder, locate VV/VH GeoTIFF bands
5. Calibrate, filter, tile, run SegFormer inference
6. Serialize detection to `output/latest_detection.json`
7. Git commit + push to `main` — frontend reads it immediately

---

## 4. External API Integration

| API | Auth | Used For | Status |
|---|---|---|---|
| CDSE OData (Copernicus) | Username + Password | Download Sentinel-1 | ✅ Live |
| Open-Meteo Marine | None | Ocean current U/V vectors | ✅ Live |
| Open-Meteo Weather | None | Wind speed/direction | ✅ Live |
| ESRI World Imagery | None | Map satellite basemap | ✅ Live |
| MarineTraffic / VesselFinder | ❌ License required | Live AIS vessel tracking | ⚠️ Pending |
| INCOIS OSF | ❌ MoU required | High-res Indian Ocean currents | ⚠️ Pending |

---

## 5. Mathematics

### Reverse Drift (RK4)
The 4th-Order Runge-Kutta integrator runs backward in time from the SAR observation:

$$\vec{x}_{n+1} = \vec{x}_n - dt \cdot \vec{v}(\vec{x}_n, t_n)$$

where the velocity field combines ocean current and wind leeway:

$$\vec{v} = \vec{u}_{curr} + \alpha_w \cdot \mathbf{R}[\theta(\phi)] \cdot \vec{u}_{10}$$

Real values of $\vec{u}_{curr}$ and $\vec{u}_{10}$ are fetched from Open-Meteo APIs at the incident coordinates.

### Bayesian Attribution
The 5-factor Dirichlet-Categorical posterior for vessel $i$:

$$P(\text{vessel}_i | \text{evidence}) \propto \prod_{k=1}^{5} f_k(\text{vessel}_i)$$

Where factors $f_1$–$f_5$ are: backtrack proximity, trajectory collinearity, vessel type prior, kinematic anomaly score, temporal plausibility.

### Cryptographic Chain
Each evidence block is chained via:

$$H_k = \text{SHA-256}(H_{k-1} \Vert \text{Root}_k \Vert T_k \Vert \text{NodeID})$$

The Merkle root over all evidence tiers is signed with Ed25519 and stored in the ledger.

---

## 6. Test Coverage

```
tests/test_attribution.py      23 passed
tests/test_cmod5.py             3 passed
tests/test_drift.py             7 passed
tests/test_evidence.py         11 passed
tests/test_losses.py            3 passed
tests/test_optical.py           4 passed
tests/test_sar_cascade.py       8 passed
tests/test_sar_eos04.py         3 passed
tests/test_stage4_hardening.py  3 passed
tests/test_weathering.py        3 passed
─────────────────────────────────────────
81 passed in 23.55s
```

---

## 7. Deployment

| Layer | Platform | URL |
|---|---|---|
| Frontend | Vercel | https://sagar-drishti-zeta.vercel.app/operations |
| Backend | Local (FastAPI) | http://localhost:8000 |
| Satellite Pipeline | GitHub Actions | Runs every 12h automatically |
| Database | SQLite (local) / Postgres (Docker) | `data/sagar_drishti.db` |

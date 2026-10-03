# SAGARDRISHTI — Live API Integration Status & Current Architecture
> Last Updated: October 2, 2026 (SIH Submission Day)

This document reflects the exact current integration status of every external API and data source in the system.

---

## ✅ LIVE INTEGRATIONS (Working Right Now)

### 1. Copernicus Data Space Ecosystem (CDSE) — Sentinel-1 SAR
- **What it does:** Downloads real Sentinel-1 GRD-IW satellite radar imagery (~1.5 GB per scene)
- **How it works:** GitHub Actions workflow (`live_monitor.yml`) triggers every 12 hours
- **Auth:** Username/password stored as GitHub Actions Secrets (`CDSE_USERNAME`, `CDSE_PASSWORD`)
- **Endpoint:** `https://catalogue.dataspace.copernicus.eu/odata/v1/Products`
- **Output:** `output/latest_detection.json` committed back to the repo
- **File:** `scripts/live_monitor.py`

### 2. Open-Meteo Marine API — Ocean Currents
- **What it does:** Provides real-time ocean current velocity and direction
- **Auth:** ❌ None required — completely free and open
- **Endpoint:** `https://marine-api.open-meteo.com/v1/marine?latitude={lat}&longitude={lon}&current=ocean_current_velocity,ocean_current_direction`
- **Used in:** `api/routes/drift.py` — feeds the RK4 backtracking algorithm
- **File:** `api/routes/drift.py`

### 3. Open-Meteo Weather API — Wind Data
- **What it does:** Provides real-time 10-metre wind speed and direction
- **Auth:** ❌ None required — completely free and open
- **Endpoint:** `https://api.open-meteo.com/v1/forecast?latitude={lat}&longitude={lon}&current=wind_speed_10m,wind_direction_10m`
- **Used in:** `api/routes/drift.py` — contributes to Fay-Mackay leeway component of RK4
- **File:** `api/routes/drift.py`

### 4. ESRI World Imagery — Satellite Basemap
- **What it does:** Provides the high-resolution satellite tile basemap visible on the COP map
- **Auth:** ❌ None required
- **Tile URL:** `https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}`
- **Used in:** `frontend/src/components/map/RealMaritimeMap.tsx`

---

## ⚠️ SIMULATED (Real Code, Mock Data)

### 5. AIS Vessel Tracking
- **Why not live:** Commercial AIS APIs (MarineTraffic, VesselFinder, SpireAviation) require enterprise licensing — typically $500–$5,000/month
- **Current approach:** Mock AIS vessels (`data/sample_scenes.py`) dynamically repositioned around the actual drift backtrack origin. The Bayesian attribution math and all 5 scoring factors run on real algorithms, just against simulated telemetry.
- **When this will be live:** After SIH — once commercial licensing is acquired

### 6. INCOIS Indian Ocean Current Data
- **Why not live:** INCOIS API requires a formal MoU with the Ministry of Earth Sciences for research access
- **Current approach:** Open-Meteo provides equivalent free ocean current data as a drop-in replacement
- **When this will be live:** After formal MoU is established

---

## 🔮 PLANNED (Not Yet Built)

### 7. Krestenitis SAR Oil Spill Dataset — Model Training
- **Why pending:** The Krestenitis dataset is gated behind an institutional data-sharing agreement that requires a supervisor/professor email
- **Current approach:** SegFormer-B3 model runs with synthetic training weights. Detection quality is functional for demo purposes
- **Timeline:** Institutional access request will be sent after mid-semester exams. Model retraining will follow.

### 8. RISAT-1A Integration
- **Why pending:** Requires NRSC data access (National Remote Sensing Centre — ISRO)
- **Current approach:** Sentinel-1 from CDSE provides sufficient SAR coverage

---

## 🔄 DATA FLOW (Current State)

```
                    ┌───────────────────────────────────────┐
                    │      GITHUB ACTIONS (every 12h)        │
                    │  live_monitor.py                       │
                    │  1. Auth → CDSE API ✅                 │
                    │  2. Download Sentinel-1 GRD tile ✅    │
                    │  3. Run SegFormer-B3 AI model ✅       │
                    │  4. Write latest_detection.json ✅     │
                    └──────────────────┬────────────────────┘
                                       │
                    ┌──────────────────▼────────────────────┐
                    │        FASTAPI BACKEND (local)         │
                    │  GET /incidents → reads JSON ✅        │
                    │  POST /drift/backtrack                 │
                    │    → Open-Meteo Marine API ✅          │
                    │    → Open-Meteo Weather API ✅         │
                    │    → RK4 physics engine ✅             │
                    │  GET /attribution/candidates           │
                    │    → Bayesian scoring ✅               │
                    │    → Mock AIS vessels ⚠️              │
                    │  GET /evidence/ledger                  │
                    │    → SHA-256 + Merkle ✅               │
                    │    → Ed25519 signatures ✅             │
                    └──────────────────┬────────────────────┘
                                       │
                    ┌──────────────────▼────────────────────┐
                    │     NEXT.JS FRONTEND (Vercel) ✅       │
                    │  Operations Dashboard (MapLibre GL)    │
                    │  8-Stage Cinematic Demo                │
                    │  SAR Viewer (High-DPI canvas)          │
                    │  Evidence Ledger + PDF Dossier         │
                    └───────────────────────────────────────┘
```

---

## 🔑 Secrets & Credentials

| Secret | Where Stored | Used By |
|---|---|---|
| `CDSE_USERNAME` | GitHub Actions Secrets | `live_monitor.yml` → `scripts/live_monitor.py` |
| `CDSE_PASSWORD` | GitHub Actions Secrets | `live_monitor.yml` → `scripts/live_monitor.py` |
| `NODE_SIGNING_KEY` | `api/config.py` (auto-generated) | Ed25519 evidence signatures |
| Open-Meteo API | ❌ No key required | `api/routes/drift.py` |
| ESRI Basemap | ❌ No key required | `frontend/src/components/map/RealMaritimeMap.tsx` |

# Sagar-Drishti Implementation Roadmap

This roadmap converts the current tested demonstration platform into a real-data, production-deployable maritime investigation system, and closes the gaps between the current build and the SIH PS mandate (SAR + EO imagery, backward + forward drift, slick age estimation, AIS attribution).

## Phase 0 - Demo Integrity & Correctness

Keep the existing smoke/e2e gate green before any production work. Fix the demo-only shortcuts that break scientific credibility:

- Remove the rigged attribution in `main.py` (`is_top = v["mmsi"] == 419001234` special-casing that injects backtrack coords and speeds). Score every vessel identically and let the factors decide.
- Move the Ed25519 signing key out of source: load `NODE_SIGNING_KEY` from env/secret store; delete the default `"01"*32` from `main.py` and `.env.example` (generate with `openssl rand -hex 32`).
- Unify vessel identity: export a single `DEFAULT_VESSEL_IMO` (9123456) and `DEFAULT_EVENT_ID` from frontend `lib`, and use it in `DemoDirectorBar` (currently 9720134), `CommandRail` fallback, mock data (9345678) and e2e.
- Fix UTF-8 mojibake in `sar-investigation/page.tsx` (`â€”`, `Â·`, `kmÂ²`).
- Make the mock fallback honest: `lib/api.ts` currently swallows every error into `MOCK_*`. Log the failure and show a "degraded (mock) mode" notice instead of a silent, cosmetic DATA LIVE chip.
- Deterministic evidence: replace `np.random.course_jitter` in `dashboard/app.py` with a seeded RNG; drop deprecated `datetime.utcnow()` / `st.experimental_rerun`.

## Phase 1 - EO (Sentinel-2) Corroboration

The PS asks for "SAR and EO imagery". MVP stays SAR-first (24/7, cloud-penetrating); EO is used for daytime visual corroboration when cloud cover permits.

- Add `core/sensors/optical.py`: Sentinel-2 L1C/L2A ingest stub computing `NDVI` and `MNDWI`, using the SCL bitmask for cloud masking, outputting a `corroboration: boolean` for a slick (dark pixel + high MNDWI + suppressed NDVI = plausible oil, opposite of chlorophyll).
- Surface it: `CorroborationChip` in `sar/[id]` (in `DetectionEvidence.tsx`), a Sentinel-2 L2A row in `settings/page.tsx` Data Sources, and one mock EO pass.
- Schema: no new table in MVP; corroboration flag persisted in `incidents.data` JSON and hashed into the evidence ledger.

## Phase 2 - Slick Age Estimation (Mackay Weathering)

The PS asks for slick age "if feasible".

- Add `core/drift/weathering.py`:
  - Evaporation: `F_evap(t) = (1/K2) * ln(1 + K1*k(t)*t)` (wind + vapor pressure driven).
  - Emulsification: `Y(t) = Y_max * (1 - exp(-K_e(t)*t))`.
  - `estimate_slick_age(sigma0_damping_db, wind_speed, thickness_um)` inverts the coupled ODEs backward for exposure time using radar backscatter damping + wind, returning `{ageHours, confidence, evaporationPct, emulsificationPct}`.
- Data model: add `ageEstimate` to `SarIncident` (`lib/types.ts`), `sample_scenes.py`, `mockData.ts`.
- Include `ageEstimate` in `build_evidence_hashes` so the sealed ledger covers it.
- UI: age panel on the SAR page and a "Slick age & weathering" section in the dossier.
- Tests: `tests/test_weathering.py` (monotonic evaporation, emulsification cap, age-inversion sanity).

## Phase 3 - Forward Drift Prediction

The PS asks to "predict the future flow of the slick".

- Add `rk4_advect()` beside `rk4_backtrack` in `core/drift/rk4.py`: same RK4 integrator, positive time, forward MetOcean fields.
- Add a forecast-mode flag to the metocean provider (`get_mock_metocean(forecast=True)` returning a time-forward series; real provider in Phase 6).
- Add `/api/v1/drift/forecast` returning a forward trajectory (e.g. T+12h) with uncertainty growth.
- UI: dedicated "FORECAST T+12h" tab in the drift console alongside backtrack.
- Tests: forward advection must equal negative of backward under steady fields.

## Phase 4 - Data Provenance Foundation

- Add provider records for Sentinel, AIS, wind, current, and analyst-generated artifacts.
- Store source URI, acquisition time, checksum, processing version, and ingestion time for every artifact.
- Keep raw source payloads immutable and derive processed products from them.

## Phase 5 - Evidence Manifest MVP

- Generate a JSON evidence manifest containing artifact IDs, SHA-256 hashes, timestamps, source metadata, and processing versions.
- Build a backend export endpoint for evidence packages.
- Add schema tests and stable-hash tests (extend to cover the new age/EO artifacts).
- Keep the current UI flow intact while exposing the manifest for download.

## Phase 6 - Real Provider Integration

- Integrate Copernicus Data Space Ecosystem OData for Sentinel-1 GRD products.
- Integrate Sentinel-2 MSI (EO) alongside, switching on cloud cover < 20%.
- Integrate one AIS provider behind a provider interface.
- Integrate one wind/current provider behind a metocean interface, including forecast slots for forward drift.
- Preserve the existing sample provider as a fallback for demos and tests.

## Phase 7 - Real RK4 And Attribution Hardening

- Drive reverse (and forward) drift with real metocean grids and uncertainty ensembles.
- Persist origin probability heatmaps and confidence ellipses.
- Score vessel candidates from real AIS tracks using closest approach, blackout gaps, heading deviation, speed anomaly, cargo type, and temporal overlap.
- Keep attribution language probabilistic and auditable.

### Phase 7A - Port SkyTruth Cerulean Source Association (Apache-2.0)

Source repos (cloned, licenses verified Apache-2.0):
`github.com/SkyTruth/cerulean-cloud` (`cerulean_cloud/cloud_function_asa/`) and
`github.com/SkyTruth/ceruleanserver` (`ceruleanserver/associate/`, `ceruleanserver/ais.py`).

1. **New module `core/correlation/source_association.py`** (self-contained, numpy-only; no geopandas/shapely/sklearn deps so it runs in the existing API image and CI):
   - Constants dataclass mirroring Cerulean `constants.py`:
     - Vessel: `AIS_WINDOW = (-8h, +6h)` relative to scene time (reconstruction window), `SPREAD_RATE = 3000 m/hr`, `GRACE_DISTANCE = 500 m`, `AIS_SLICK_BUFFER = 9 km` (3h max slick age x spread), weights `w_temporal=1.0 / w_proximity=2.0 / w_parity=1.0`, sharpness `parity=5.77 / prox=5 / temp=2`, reference times `over=600 s / under=10000 s`, collation means/stds `(0.8968, 0.1996)`.
     - Infrastructure: closing buffer 500 m, 10 extrema vertices, cutoff 3000 m, decay radius 1500 m, decay `theta=0.5`, min-area fraction 0.1, collation `(0.3797, 0.1899)`.
     - Dark vessel: closing buffer 500 m, 2 endpoint vertices, cutoff 50000 m, decay radius 19200 m, decay `theta=6.4`, collation `(0.6329, 0.2911)`.
   - Geometry helpers (flat-earth meters, matching Cerulean's meters-CRS behavior, documented as operating on projected coordinates): point-to-segment distance, polyline length, ring area (shoelace), ring offset (approx. buffer/erode along vertex normals).
   - **Vessel scoring** — exact port of `scoring.py` + `analyzer.py`:
     - `closest_point_near_timestamp(target, ts, xy, t_image=None, n_points=10)` (turning-point heuristic).
     - `head_tail_mapping(centerline, ts, xy, t_image)` = `get_closest_centerline_points` (head = newer endpoint; tail re-projected time-independent).
     - `compute_proximity_score` = `sqrt(P_tail * P_head)`, each `exp(-(d/d_ref)^sharpness)` with `d_ref = max(spread_rate*delta, grace)`, special grace handling when head is ahead of image time.
     - `compute_parity_score` = `exp(-(ln(L_centerline / L_track_substring))^2 * sharpness_parity)` (substring between tail/head timestamps inclusive).
     - `compute_temporal_score` = `exp(-((t_image - t_head)/ref_time)^sharpness_temp)`, `ref_time = ref_over` if head is ahead of image, else `ref_under`.
     - `vessel_total_score` = weight-normalized weighted sum (prox w=2, temporal w=1, parity w=1).
     - `bezier_extrapolate(...)` (piecewise cubic-Bezier interpolation + linear extrapolation from COG/SOG) for filling/sparse AIS gaps before mapping.
   - **Infrastructure terminus scoring** — port of `PointAnalyzer`: slick polygon extrema selection (greedy furthest-from-reference, area-fraction weighting `sqrt(area/largest)`, centroid-distance weights), `scaled_inner_angles` (angle-at-vertex normalized 0..1), `points_to_extrema_scores` (`clip(max(w * exp(-angle*theta) * exp(-dist/decay_radius)), 0, 1)`), `collate(score) = (score - mean)/std` per source type.
   - **Dark-vessel scoring** — same PointAnalyzer path but on centerline endpoint pairs (`get_endpoint_pairs` with offset/gap 0.05) with dark constants; input is SAR dark-object detections (>30 m, high confidence, infra excluded), not AIS.
   - **Geometric slick confidence** — port the concept of Cerulean's RF geometry features (area, perimeter, compactness, elongation, multipart) via `slick_geometry_features(ring)` + logistic score; the trained `.joblib` weights are a SkyTruth artifact (not in repo), so the classifier uses documented, feature-identical coefficients (flagged as "concept adaptation, not the trained model").
2. **Integration adapter** in the same module: `associate_sources(...)` returning a dict of `{parityScore, proximityScore, temporalScore, associationScore, collatedScore}` per source, in the same camelCase shape the API/frontend expects from `core/correlation/attribution.py`, so the Bayesian 5-factor engine can consume them as additive evidence (`f6 = associationScore`).
3. **New tests `tests/test_source_association.py`**: bounds in [0,1]; identity cases (perfectly parallel track → parity 1; coincident head-at-image → prox 1; head-at-image timestamp → temporal 1); monotonicity (farther/crooked tracks score lower); synthetic vessel/centerline fixtures in projected meters; AIS window slicing; bezier extrapolation matches constant-velocity linear extrapolation for a straight track; infra/dark coincidence returns 0 beyond cutoff and >0 within decay radius; collate normalization sanity.
4. **Licensing**: Apache-2.0 header + function-level docstrings citing upstream file/line, plus `THIRD_PARTY_NOTICES.md` at repo root with attribution and licence links. Coordinates in the port are documented as projected meters (Cerulean reprojects to a meters CRS before scoring).
5. **Deferred (not ported)**: AWS/GCP data retrieval (GFW BigQuery/MVT, Spire AIS) — lives behind our existing provider interface in Phase 6; `reschedule_for_later` backoff; GFW dark-object and SAR-infrastructure datasets (we feed our own infra list); the trained RF weights.

## Phase 8 - CI / CD And Hosted Deployments

- Add GitHub Actions CI: `pytest` (backend), `tsc --noEmit` + `eslint` + `next build` (frontend), and the Playwright smoke suite with the FastAPI service scoped on.
- Enable branch protection on `main` requiring CI status checks.
- Render: enable auto-deploy on `main`; add `preDeployCommand: alembic upgrade head` to `render.yaml`; set env secrets once (`DATABASE_URL`, `NODE_SIGNING_KEY`, `API_KEY`, `CORS_ORIGINS`, `API_ENV`).
- Vercel: connect repo, production branch `main`, auto-deploy with PR previews; set `NEXT_PUBLIC_API_URL` / `NEXT_PUBLIC_API_KEY`.
- Optional deploy-hook control: expose Render + Vercel webhooks and trigger from CI after tests pass.
- Keep Neon (or equivalent) outside Render's 30-day-expiry managed Postgres.

## Phase 9 - Architecture Consolidation

- Make `core/` the single source of truth; turn `main.py`, `api/`, and the legacy Streamlit `dashboard/` into thin wrappers (deduplicate the RK4/attribution/ledger logic that is currently copied across three call sites).
- Split `RealMaritimeMap.tsx` (~1,500 lines) and the WebGL `living.ts` engine into focused modules (layer config, interactions, hooks).
- Remove the accidental duplicate `gl.drawArrays(..., count)` calls in `living.ts` layers (each render draws geometry twice).
- Retire `dashboard/process.py` (duplicated pipeline) or repoint it at the FastAPI endpoints.

## Phase 10 - Production Security And Deployment

- Add authentication and role-based access control.
- Protect evidence export and signing routes.
- Move signing keys to host secrets or KMS/HSM-backed custody.
- Deploy behind HTTPS with monitoring, backups, and structured audit logs.
- Enforce `ALLOW_PUBLIC_EVIDENCE_EXPORT=false` in `forensics.py` and the `RATE_LIMIT` middleware (currently documented but unverified).

## Phase 11 - Visual And Operator Polish

- Add 3D-style ship and Sentinel glyph overlays as isolated, tested components.
- Add mission replay only after the underlying data/events are persisted and replayable.
- Keep all visual additions optional so they cannot break the scientific workflow.

## Reference Systems - Validated Adoptions

Two production systems prove this architecture: SkyTruth Cerulean (open-source, Sentinel-1 VV U-Net + AIS correlation) and EMSA CleanSeaNet (operational drift forecasting/backtracking + optical-on-request + operator review). Concrete adoptions:

- **Detection** (Phase 6): keep the U-Net/FPN S1 design; follow Cerulean's known-good recipe - scale to 80 m, 512x512 overlapping inference tiles, average confidence on overlap, filter to ocean-intersecting scenes only. Prefer the free AWS Open Data Registry for S1 GRD over account-gated CDSE for the MVP ingest.
- **Attribution** (Phase 7A): ported verbatim from the open-source Cerulean source-association code - parity / proximity / temporality scoring (AIS window -8h..+6h relative to scene time), infrastructure terminus distance-decay, and dark-vessel association (>30 m, <=50 km, path-fit). Details + licensing in Phase 7A above.
- **EO corroboration** (Phase 1): rationale upgraded - NDVI/MNDWI is also a false-positive discriminator (SkyTruth uses NDVI to exclude algal blooms/bioslicks that mimic oil in SAR; CleanSeaNet acquires optical on request).
- **Forward drift** (Phase 3): CleanSeaNet ships drift forecasting + backtracking as an added-value service - mirror this framing in the pitch.
- **Impartial validation** (new, low effort): query Cerulean's public OGC tipg API (`api.cerulean.skytruth.org`, collection `public.slick_plus`, CQL-2 bbox/date filters) over the Arabian Sea / Indian Ocean as a free expert-labeled sanity-check set for Deep-SAR on real data.
- **Ops** (Phase 8): adopt the event-triggered pipeline + human-in-the-loop feedback loop pattern; IaC (Pulumi/Terraform) is a stretch goal, default stays Render/Vercel/Actions.
- **Export** (stretch): make the evidence export OGC-compliant (tipg-style) for interoperability claims.

## PS Mandate Coverage Map

| Mandate | Phase |
|---|---|
| SAR + EO imagery (+ detection/characterisation) | 1, 6 |
| Backward drift to origin/time | 7 (existing RK4) |
| Forward flow prediction | 3, 6 |
| Slick age estimation | 2 |
| AIS attribution, traffic filtering, suspect scoring (incl. dark vessels) | 7, 7A (existing Bayesian engine + Cerulean port) |
| Visual interface | 11 + current console |
| Production-grade deployment | 8, 10 |
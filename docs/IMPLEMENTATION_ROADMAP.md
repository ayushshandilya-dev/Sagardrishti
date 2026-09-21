# Sagar-Drishti Implementation Roadmap

This roadmap converts the current tested demonstration platform into a real-data, production-deployable maritime investigation system.

## Phase 0 - Keep The Green Demo Stable

- Preserve the existing smoke/e2e gate before any production work.
- Run frontend typecheck/build and backend tests after every functional change.
- Keep demo-only visual upgrades isolated from core data and API routes.

## Phase 1 - Data Provenance Foundation

- Add provider records for Sentinel, AIS, wind, current, and analyst-generated artifacts.
- Store source URI, acquisition time, checksum, processing version, and ingestion time for every artifact.
- Keep raw source payloads immutable and derive processed products from them.

## Phase 2 - Evidence Manifest MVP

- Generate a JSON evidence manifest containing artifact IDs, SHA-256 hashes, timestamps, source metadata, and processing versions.
- Build a backend export endpoint for evidence packages.
- Add schema tests and stable-hash tests.
- Keep the current UI flow intact while exposing the manifest for download.

## Phase 3 - Real Provider Integration

- Integrate Copernicus Data Space Ecosystem OData for Sentinel-1 GRD products.
- Integrate one AIS provider behind a provider interface.
- Integrate one wind/current provider behind a metocean interface.
- Preserve the existing sample provider as a fallback for demos and tests.

## Phase 4 - Real RK4 And Attribution Hardening

- Drive reverse drift with real metocean grids and uncertainty ensembles.
- Persist origin probability heatmaps and confidence ellipses.
- Score vessel candidates from real AIS tracks using closest approach, blackout gaps, heading deviation, speed anomaly, cargo type, and temporal overlap.
- Keep attribution language probabilistic and auditable.

## Phase 5 - Production Security And Deployment

- Add authentication and role-based access control.
- Protect evidence export and signing routes.
- Move signing keys to host secrets or KMS/HSM-backed custody.
- Deploy behind HTTPS with monitoring, backups, and structured audit logs.

## Phase 6 - Visual And Operator Polish

- Add 3D-style ship and Sentinel glyph overlays as isolated, tested components.
- Add mission replay only after the underlying data/events are persisted and replayable.
- Keep all visual additions optional so they cannot break the scientific workflow.

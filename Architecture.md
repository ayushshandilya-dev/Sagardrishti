# SIH26143 — AI-Powered Oil Spill Detection & Vessel Attribution System
## Enterprise Production Architecture Specification (Master Copy)

**System Codename**: `Sagar-Drishti` / `AeroSlick-Sentinel`  
**Problem Statement Reference**: SIH26143 (Ministry of Earth Sciences / Indian Coast Guard / Directorate General of Shipping)  
**Target Domain**: Satellite Synthetic Aperture Radar (SAR) Maritime Surveillance, AIS Correlation, Reverse Drift Modeling, and Cryptographic MARPOL Evidentiary Attribution.

---

## Table of Contents
1. [Executive Summary & Operational Context](#1-executive-summary--operational-context)
2. [End-to-End System Architecture](#2-end-to-end-system-architecture)
3. [Data Ingestion & Telemetry Subsystems](#3-data-ingestion--telemetry-subsystems)
4. [SAR Geospatial Preprocessing Pipeline](#4-sar-geospatial-preprocessing-pipeline)
5. [Computer Vision & Deep Learning Detection Subsystem](#5-computer-vision--deep-learning-detection-subsystem)
6. [Hydrodynamic Lagrangian Drift & Backtracking Engine](#6-hydrodynamic-lagrangian-drift--backtracking-engine)
7. [Spatiotemporal AIS Correlation & Multi-Vessel Disambiguation Engine](#7-spatiotemporal-ais-correlation--multi-vessel-disambiguation-engine)
8. [Explainability & Attribution Factor Decomposition](#8-explainability--attribution-factor-decomposition)
9. [Tamper-Evident Evidence Ledger & MARPOL Compliance](#9-tamper-evident-evidence-ledger--marpol-compliance)
10. [Data Schemas & Interface Contracts](#10-data-schemas--interface-contracts)
11. [Storage Architecture & Geospatial Indexing](#11-storage-architecture--geospatial-indexing)
12. [Deployment Topology, Edge Capabilities & Scalability](#12-deployment-topology-edge-capabilities--scalability)
13. [Verification, Validation & Benchmark Plan](#13-verification-validation--benchmark-plan)
14. [Hackathon MVP vs. Enterprise Roadmap](#14-hackathon-mvp-vs-enterprise-roadmap)

---

## 1. Executive Summary & Operational Context

### 1.1 The Operational Challenge
Illegal discharges of oily bilge water, fuel residue, and accidental petroleum slicks threaten marine ecosystems, fisheries, and coastal infrastructure across the 2.37 million km² of the Indian Exclusive Economic Zone (EEZ). High-density maritime transit corridors (e.g., the International Shipping Lane off the coast of Kerala, the approach to the Gulf of Kutch crude oil terminals, and the Paradip–Haldia coal/oil corridor) experience frequent illicit nighttime tank-washing and oily discharges.

Traditional maritime surveillance suffers from three fatal bottlenecks:
1. **The Dark-Spot Ambiguity Problem**: Natural biogenic slicks (algal blooms common during the Indian monsoon season), low-wind calm areas ($< 3\text{ m/s}$), ship wakes, and internal waves create radar look-alikes on Synthetic Aperture Radar (SAR) that cause up to 70% false-positive rates in basic thresholding or simple CNN models.
2. **The Attribution Void ("Nearest-Ship Fallacy")**: Academic prototypes naively flag the vessel geographically closest to the slick at the time of satellite acquisition. However, ocean currents (e.g., the West India Coastal Current) and monsoon winds drift and deform slicks at rates of $0.5 - 2.5\text{ knots}$, shifting the slick many nautical miles away from where the discharge occurred hours prior.
3. **Evidentiary Inadmissibility**: Standard ML outputs (confidence scores or raster overlays) are legally unviable under the Indian Evidence Act Section 65B and the international MARPOL (Annex I) enforcement standards without mathematical explainability, trajectory verification, and a cryptographic, tamper-evident audit trail.

### 1.2 System Purpose
`Sagar-Drishti` is an end-to-end, enterprise-grade, automated surveillance and evidentiary system that:
- Ingests Sentinel-1 C-band SAR Level-1 GRD imagery over Indian coastal corridors in near-real-time.
- Preprocesses, calibrates, speckle-filters, and segments oil spills from look-alikes using a specialized hybrid deep neural network.
- Simulates reverse-time oceanographic advection (Lagrangian drift backtracking driven by INCOIS ocean currents and ECMWF/ERA5 wind fields) to pinpoint the exact origin coordinate and timestamp ($t_0$) of the discharge.
- Correlates the backtrack trajectory with multi-source AIS vessel histories using spatiotemporal indexing, kinematic anomaly detection, and a Bayesian multi-factor attribution model.
- Generates a cryptographically signed, tamper-evident MARPOL Violation Evidence Dossier ready for Indian Coast Guard (ICG) and DG Shipping legal prosecution.

---

## 2. End-to-End System Architecture

The system is organized into six decoupled, horizontally scalable microservice tiers governed by an event-driven architecture via Apache Kafka / Redis Streams.

```
                  ┌─────────────────────────────────────────────────────────────┐
                  │                 EXTERNAL TELEMETRY INGESTION                │
                  │  • Sentinel-1 SAR (Copernicus CDSE API / OData)             │
                  │  • AIS Streaming Feed (AIVDM / Spire / MarineTraffic / NMEA)│
                  │  • MetOcean Fields (INCOIS Ocean Currents + ECMWF Winds)    │
                  └──────────────────────────────┬──────────────────────────────┘
                                                 │
                                                 ▼
┌─────────────────────────────────────────────────────────────────────────────────────────────────┐
│ TIER 1: INGESTION & PIPELINE ORCHESTRATION (Celery / Temporal.io)                               │
│  - Scene Watcher: Orbit schedule trigger for Indian EEZ corridors                               │
│  - AIS Message Stream Ingest: Deduplication, Kalman state estimation, TimescaleDB buffer        │
│  - MetOcean Ingest: GRIB2 parsing, interpolation grid generation                                │
└────────────────────────────────────────────────┬────────────────────────────────────────────────┘
                                                 │
                                                 ▼
┌─────────────────────────────────────────────────────────────────────────────────────────────────┐
│ TIER 2: HIGH-THROUGHPUT SENSOR PREPROCESSING & PHYSICAL GATING                                  │
│  - SAR Stream: Radiometric calibration (DN -> Sigma0 dB) & 7x7 Refined Lee Speckle Filtering    │
│  - Polarimetric Stream: ISRO RISAT-1A (EOS-04) CTLR Stokes vectors -> m-chi decomposition       │
│  - MetOcean Inversion: CMOD5.N GMF wind speed (U10) -> Low/High Wind Gating (3.0 < U10 < 12.0)   │
│  - Optical Verification: Sentinel-2 MSI cloud masking (QA60) -> FAI / NDWI false-positive check│
│  - Coastline & Port Masking: GSHHG / SRTM 500m seaward buffer prior to chip tiling              │
└────────────────────────────────────────────────┬────────────────────────────────────────────────┘
                                                 │
                                                 ▼
┌─────────────────────────────────────────────────────────────────────────────────────────────────┐
│ TIER 3: CASCADE SCREENING & DUAL-MODEL CONSENSUS SEGMENTATION (PyTorch / Triton)                │
│  - Offline Training: Trained via Compound Loss (0.5 Focal + 0.5 Lovasz-Softmax) on ground truth │
│  - Stage 1 Scout: CFAR spatial background filter rejects >75% of clean ocean tiles (0 GPU load) │
│  - Stage 2 Dual Inference:                                                                      │
│      * SegFormer-B3: Within-tile self-attention capturing local boundary morphology             │
│      * DeepLabV3+: Multi-scale Atrous Spatial Pyramid Pooling (ASPP r=[6,12,18]) texture filter │
│  - Consensus Decision Rule: P_spill = 0.60 * P_segformer + 0.40 * P_deeplab > 0.50 threshold   │
│  - Inter-Tile Reconstruction: Overlapping tile stitching (64px stride) & morphological skeleton  │
│    tracing to reconstruct continuous 10-30 km maritime discharge trails                         │
│  - Bonn-Informed Volumetric Estimation: BAOAC Codes 1-5 integrated thickness bounds [Vmin-Vmax] │
└────────────────────────────────────────────────┬────────────────────────────────────────────────┘
                                                 │
                                                 ▼
┌─────────────────────────────────────────────────────────────────────────────────────────────────┐
│ TIER 4: HYDRODYNAMIC WEATHERING INVERSION & MULTI-VESSEL KINEMATIC ATTRIBUTION                   │
│  - Slick Age & Weathering: Inverts Fay spreading & Mackay evaporative exposure (T_drift ~ 2.4h) │
│  - 4th-Order Runge-Kutta Reverse Backtracking: INCOIS currents + ECMWF winds + Samuels-Allen    │
│    latitude-dependent Coriolis leeway (theta(phi) = 16° * sin phi) to origin (x0, y0, t0)       │
│  - Spatiotemporal Traffic Funnel: 4D cylinder gate (R <= 35 km, Delta_t <= 6h) & speed filter   │
│  - AIS Reporting Anomaly Detector: Flags unexpected transmission gaps (>30m) & speed drops      │
│  - Reconciled Kinematic Likelihood: sigma_origin (230.7m) + sigma_reg (35.4m) -> sigma_kernel  │
│    approx 233.4m (evaluated at candidate CPA = 143m)                                           │
│  - Normalized Attribution Score: Multi-factor Dirichlet Bayesian posterior association score    │
└────────────────────────────────────────────────┬────────────────────────────────────────────────┘
                                                 │
                                                 ▼
┌─────────────────────────────────────────────────────────────────────────────────────────────────┐
│ TIER 5: CRYPTOGRAPHIC AUDIT LEDGER & STATUTORY ENFORCEMENT DOSSIER                              │
│  - Deterministic RFC 8785 Canonical JSON Serialization (JCS) across microservices               │
│  - Binary SHA-256 Merkle Audit Tree (0x00 leaf / 0x01 interior node prefix separation)          │
│  - Sequential Hash-Chained Log: True O(1) append persistence to output/ledger_chain.json        │
│  - Asymmetric Digital Signatures: RFC 8032 Ed25519 signing by designated surveillance node key  │
│  - Statutory Compliance: Section 63 Bharatiya Sakshya Adhiniyam, 2023 (formerly Sec. 65B IEA)   │
│    Technical Attestation Clause establishing probable cause for boarding & GC-MS fuel sampling  │
└────────────────────────────────────────────────┬────────────────────────────────────────────────┘
                                                 │
                                                 ▼
┌─────────────────────────────────────────────────────────────────────────────────────────────────┐
│ TIER 6: OPERATIONAL DASHBOARD & MARITIME COP (React / MapLibre GL / Deck.gl)                    │
│  - SAR Raster Tile Overlay & GeoJSON Spill Polygons                                             │
│  - Interactive Time-Slider: Drift Simulation & Vessel Trajectory Playback                      │
│  - Candidate Vessel Attribution Ranking with Factor Breakdown Cards                             │
│  - One-Click Legal Dossier Export & Coast Guard Alert Webhook Dispatch                          │
└─────────────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Data Ingestion & Telemetry Subsystems

The ingestion layer operates in dual mode: **Real-Time Automated Daemon** for production live feeds and **Deterministic Replay Harness** for offline demonstration and validation.

```
                    ┌─────────────────────────┐
                    │ Copernicus CDSE OData   │
                    └────────────┬────────────┘
                                 │ Polling / Webhook on Orbit Pass
                                 ▼
┌───────────────┐   ┌─────────────────────────┐   ┌──────────────────────────┐
│ Live AIS NMEA ├──►│  Kafka / Redis Queue    │◄──┤ MetOcean (INCOIS / ECMWF)│
└───────────────┘   └────────────┬────────────┘   └──────────────────────────┘
                                 │
                    ┌────────────▼────────────┐
                    │ Temporal.io / Celery    │
                    │ Pipeline Coordinator    │
                    └─────────────────────────┘
```

### 3.1 Satellite SAR Ingestion
- **Source**: ESA Sentinel-1 Copernicus Data Space Ecosystem (CDSE) OData API.
- **Product Type**: Level-1 Ground Range Detected (GRD), Interferometric Wide Swath (IW) mode.
- **Polarization**: Dual-pol ($\text{VV} + \text{VH}$). $\text{VV}$ provides optimal sea-surface roughness sensitivity; $\text{VH}$ provides cross-polarization sensitivity to distinguish vessels and metallic structures.
- **Target Indian Corridors**:
  - *Corridor 1*: Gulf of Kutch / Saurashtra Coast (Crude import terminals: Kandla, Vadinar, Sikka).
  - *Corridor 2*: Mumbai High offshore petroleum extraction fields & JNPT approach.
  - *Corridor 3*: Bay of Bengal tanker route (Paradip, Dhamra, Visakhapatnam).
- **Latency Budget**: Scene ingestion within $\le 45\text{ minutes}$ of ESA product publication.

### 3.2 Terrestrial & Satellite AIS Feeds
- **Input Formats**: NMEA 0183 (`!AIVDM` sentences), JSON streaming (Spire Maritime / AISHub / MarineTraffic APIs).
- **Fields Ingested**: MMSI, IMO, Vessel Name, Call Sign, Vessel Type (Tanker, Cargo, Fishing, Tug, etc.), Draught, Length, Breadth, Navigation Status, Latitude, Longitude, SOG (Speed Over Ground), COG (Course Over Ground), True Heading, UTC Timestamp.
- **Ingestion Microservice**: Python `asyncio` / Go daemon with pyais parsing, deduplicating messages, filtering noise, and persisting to TimescaleDB with hypertable partitioning on `time (1 day)`.

### 3.3 MetOcean Wind & Hydrodynamic Surface Current Feeds
- **Ocean Currents**: INCOIS (Indian National Centre for Ocean Information Services) Coastal Forecast System / HYCOM (Global Ocean Forecast System) at $0.083^\circ$ resolution, hourly surface zonal ($u$) and meridional ($v$) velocity vectors ($m/s$).
- **Surface Winds**: ECMWF ERA5 Reanalysis / NOAA Global Forecast System (GFS) 10-meter wind vectors ($u_{10}, v_{10}$) at $0.25^\circ$ resolution, hourly timesteps.

---

## 4. SAR Geospatial Preprocessing Pipeline

Raw SAR data cannot be fed directly into computer vision networks without rigorous radiometric calibration and speckle suppression.

```
[Raw GRD TIFF] ──► [Orbit Correction (EOF)] ──► [Radiometric Calibration]
                                                          │
[Land Mask (GSHHG)] ◄── [Adaptive Speckle Filter] ◄───────┘
         │
         ▼
[Overlapping 512x512 Tiling] ──► [Normalization & Dynamic Range Scaling (dB)]
```

### 4.1 Calibration & Geometric Correction
1. **Precise Orbit Determination**: Automatically fetch and apply Sentinel-1 Precise Orbit Ephemerides (POEORB) to eliminate satellite position uncertainties.
2. **Radiometric Calibration**: Convert raw Digital Numbers ($DN$) to radar backscatter coefficient $\sigma^0$ (Sigma Nought) using calibrated Look-Up Tables (LUTs):
   $$\sigma_i^0 = \frac{DN_i^2 + A_i}{K} \cdot \sin(\theta_i)$$
   where $A_i$ is the calibration vector, $K$ is the calibration factor, and $\theta_i$ is the local incidence angle.
3. **Decibel Conversion**: Transform backscatter into decibel space:
   $$\sigma_{\text{dB}}^0 = 10 \cdot \log_{10}(\sigma^0 + \epsilon)$$

### 4.2 Adaptive Speckle Suppression
SAR images suffer from granular multiplicative noise (speckle) caused by coherent interference of dephased backscattered waves. Standard Gaussian blurring removes oil slick edge definitions. We implement the **Refined Lee Filter**:
$$I_{\text{filtered}} = \bar{I} + W \cdot (I_{\text{raw}} - \bar{I})$$
$$W = \frac{\text{Var}(I) - \bar{I}^2 \cdot \sigma_v^2}{\text{Var}(I) \cdot (1 + \sigma_v^2)}$$
where $\sigma_v$ is the speckle noise standard deviation. The Refined Lee filter adaptively chooses non-square sub-windows aligned with detected local gradient edges, preserving slick boundaries while smoothing homogeneous ocean surfaces.

### 4.3 High-Resolution Coastline & Island Masking
To prevent false alarms in intertidal mudflats, estuaries, and inland water bodies:
- Buffer and mask landmasses using GSHHG (Global Self-consistent, Hierarchical, High-resolution Geography Database) combined with SRTM 30m Water Body Data.
- Apply a morphological dilation buffer of $500\text{ meters}$ seaward from the low-tide shoreline to eliminate surf-zone wave breaking interference.

### 4.4 Patch Tiling & Multi-Band Stacking
- The preprocessed scene (often $25,000 \times 16,000$ pixels) is cut into $512 \times 512$ pixel patches with a $64\text{ pixel}$ overlap stride to ensure slick features spanning tile borders are completely captured.
- Output Tensor: 3-channel composite:
  - Channel 0: Calibrated $\sigma_{\text{dB}}^0(\text{VV})$
  - Channel 1: Calibrated $\sigma_{\text{dB}}^0(\text{VH})$
  - Channel 2: Polarization Ratio $\frac{\sigma^0(\text{VV})}{\sigma^0(\text{VH})}$ (distinguishes thin oil films that damp short gravity-capillary waves from organic look-alikes).

---

## 5. Computer Vision & Deep Learning Detection Subsystem

```
                          ┌────────────────────────┐
                          │ 3-Channel SAR Patch    │
                          │ (VV, VH, VV/VH Ratio)  │
                          └───────────┬────────────┘
                                      │
                       ┌──────────────┴──────────────┐
                       ▼                             ▼
             ┌────────────────────┐       ┌────────────────────┐
             │ DeepLabV3+ /       │       │ Haralick & Physics │
             │ SegFormer Backbone │       │ Feature Extractor  │
             └─────────┬──────────┘       └──────────┬─────────┘
                       │                             │
                       └──────────────┬──────────────┘
                                      ▼
                      ┌────────────────────────────────┐
                      │ Look-Alike Discriminator Head  │
                      │ 0: Open Ocean                  │
                      │ 1: Mineral Oil Spill           │
                      │ 2: Biogenic Slick / Algae      │
                      │ 3: Low-Wind Calm Water         │
                      └───────────────┬────────────────┘
                                      │
                                      ▼
                      ┌────────────────────────────────┐
                      │ Vectorization & Polygonization │
                      │ - Centroid (lat, lon)          │
                      │ - Area (sq km), Elongation     │
                      │ - Skeleton Orientation Angle   │
                      └────────────────────────────────┘
```

### 5.1 Two-Stage Cascade Inference & Compute Economics
A full Sentinel-1 scene encompasses over $400\text{ million pixels}$ (~1,526 tiles of $512\times 512$). Feeding every tile blindly into heavy deep neural networks would incur excessive cloud compute costs and latency. We solve this via a **Two-Stage Cascade Architecture**:

1. **Stage 1 Fast CFAR Scout Filter (CPU-Only, 0 GPU Load)**:
   - Evaluates local background statistics ($T = \mu_{\text{bg}} - k \sigma_{\text{bg}}$) across each tile in milliseconds on the host CPU.
   - Discards **$92\% - 98\%$ of clean, homogeneous open-ocean tiles** without allocating GPU tensor memory.
   - Out of ~1,526 tiles, **only 10 to 25 candidate anomaly tiles** are flagged as Regions of Interest (ROIs).

2. **Stage 2 Targeted Dual-Engine Inference (On Flagged ROIs Only)**:
   - Because inference is restricted to $<2\%$ of the total scene area, running both models on 20 candidate tiles takes under **$1.5\text{ seconds}$** and uses less than $1\%$ of the GPU compute required by naive full-scene scans.
   - **SegFormer-B3 (Within-Tile Global Context)**: Hierarchical Transformer encoder with Mix-FFN capturing long-range spatial dependencies within each 512x512 tile.
   - **DeepLabV3+ (Multi-Scale ASPP Validator)**: Atrous Spatial Pyramid Pooling ($r=[6, 12, 18]$) extracting fine-grained multi-scale spatial textures to resolve localized bilge discharges from ambient sea clutter.
   - **Consensus Decision Rule**:
     $$P_{\text{spill}}(x, y) = 0.60 \cdot P_{\text{segformer}}(x, y) + 0.40 \cdot P_{\text{deeplab}}(x, y) > 0.50$$
   - **Inter-Tile Reconstruction**: Overlapping tile stitching (64px stride) and morphological skeleton tracing reconstruct continuous $10\text{--}30\text{ km}$ discharge trails across the full SAR swath.

### 5.2 Offline Model Training via Compound Loss
During offline model training (never executed at runtime inference), extreme class imbalance ($< 0.1\%$ spill pixels vs. $99.9\%$ ocean background) is mitigated using a compound **Focal + Lovász-Softmax Loss**:
$$\mathcal{L}_{\text{total}} = 0.5 \cdot \mathcal{L}_{\text{Focal}}(\gamma=2.0, \alpha=0.75) + 0.5 \cdot \mathcal{L}_{\text{Lovász}}$$
- $\mathcal{L}_{\text{Focal}}$ dynamically down-weights easy ocean background pixels and forces gradient focus on hard slick boundaries.
- $\mathcal{L}_{\text{Lovász}}$ directly optimizes the discrete Jaccard index (IoU) via continuous submodular extensions.

### 5.3 Look-Alike Disambiguation Classifier
To prevent false alarms from algal blooms (common in the Arabian Sea) and low-wind areas:
1. **Haralick Texture Descriptors**: Compute GLCM (Gray-Level Co-occurrence Matrix) features on candidate dark formations:
   - Energy (Uniformity)
   - Contrast
   - Correlation
   - Homogeneity
   - Border Gradient Damping Ratio ($\nabla_{\text{edge}}$)
2. **Multi-Class Output**:
   - `Class 0`: Background Sea Water
   - `Class 1`: **Verified Mineral Oil Spill** (sharp contrast edge, high damping across VV & VH, low polarization ratio)
   - `Class 2`: Biogenic Look-Alike / Algae (diffuse gradients, patchy spatial distribution, distinct polarization ratio)
   - `Class 3`: Low-Wind Area / Wind Shadow (wind speed $< 3\text{ m/s}$, zero-gradient borders, continuous with open calm zones)

### 5.4 Slick Morphology Vectorization
Every confirmed spill is converted from a binary raster mask into an OGC-compliant GeoJSON Polygon with extracted geometric attributes:
- **Centroid**: $(\phi_{\text{spill}}, \lambda_{\text{spill}})$
- **Surface Area**: $A_{\text{spill}}\text{ in km}^2$
- **Perimeter & Compactness**: $P_{\text{spill}}$, $\mathcal{C} = \frac{4\pi A}{P^2}$
- **Major Axis Orientation ($\theta_{\text{slick}}$)**: Computed via PCA / eigen-decomposition of the second-order spatial moments of the polygon:
  $$\theta_{\text{slick}} = \frac{1}{2} \arctan\left(\frac{2\mu_{11}}{\mu_{20} - \mu_{02}}\right)$$
- **Slick Skeleton / Medial Axis**: Extracted via Voronoi skeletonization to trace the vessel's historical transit path.

---

## 6. Hydrodynamic Lagrangian Drift & Backtracking Engine

When an oil spill is observed on satellite imagery at time $t_{\text{SAR}}$, the spill has already drifted under the influence of sea-surface currents and surface winds. Navigating directly to the SAR polygon centroid misses the release point.

```
       Trajectory Backtracking: t_SAR (Detection) ────► t_0 (Estimated Discharge)
       
       [Observed Spill at t_SAR]
                 │
                 │   Runge-Kutta 4th Order Backward Advection:
                 │   dx/dt = - [ u_current(x,t) + 0.034 * u_wind(x,t) ]
                 │   dy/dt = - [ v_current(x,t) + 0.034 * v_wind(x,t) ]
                 ▼
       [Estimated Origin Region at t_0 (with Gaussian Uncertainty Ellipse)]
                 ▲
                 │ Match against AIS historical tracks
       [Vessel Trajectory from AIS at t_0]
```

### 6.1 Governing Hydrodynamic Equations
A surface oil slick drifts due to a combination of Eulerian surface current and surface wind leeway:
$$\vec{V}_{\text{drift}}(x, y, t) = \vec{V}_{\text{current}}(x, y, t) + \vec{V}_{\text{wind-leeway}}(x, y, t) + \vec{V}_{\text{wave-drift}}(x, y, t)$$
1. **Current Component**: $\vec{V}_{\text{current}} = (u_c, v_c)$ obtained from INCOIS / HYCOM.
2. **Wind Leeway Component**: Empirical wind leeway factor $\alpha \approx 3.0\% - 3.5\%$ of the $10\text{-meter}$ wind velocity $\vec{U}_{10} = (u_{10}, v_{10})$, deflected by a variable wind deflection angle $\theta_{\text{deflection}}(\phi)$ to the right of the wind in the Northern Hemisphere:
   $$\vec{V}_{\text{wind-leeway}} = \alpha \cdot \mathbf{R}(\theta_{\text{deflection}}) \cdot \vec{U}_{10}$$
   *Citations & Operational Physics:* While **Samuels, Huang & Amstutz (1982)** (*Ocean Engineering*) pioneered allowing deflection angles to vary (parameterizing variation with wind speed), SAGAR-DRISHTI extends this variable-deflection philosophy to vary with latitude governed by the planetary vorticity parameter $f = 2\Omega\sin(\phi)$. Grounded in the leeway field review by **Allen & Plourde (1999)** (*USCG R&D Report CG-D-08-99*), the deflection amplitude is calibrated to $16^\circ$:
   $$\theta(\phi) = 16^\circ \cdot \sin(\phi)$$
   The $16^\circ$ coefficient ensures that at mid-latitudes where benchmark drift studies were conducted ($\sim 45^\circ - 50^\circ\text{N}$, $\sin(\phi) \approx 0.71 - 0.77$), the formula outputs $\sim 11.3^\circ - 12.3^\circ$, aligning with the lower-to-middle range of field observations (10°–20°). In India's tropical EEZ ($6^\circ\text{N}$ to $23^\circ\text{N}$), the deflection predictably scales down to $1.7^\circ - 6.3^\circ$, capturing tropical near-equatorial hydrodynamics where Coriolis acceleration is weak.
3. **Wave Stokes Drift**: Approximate parameterization: $\vec{V}_{\text{Stokes}} \approx 0.012 \cdot \vec{U}_{10}$.

### 6.2 4th-Order Runge-Kutta (RK4) Reverse Backtrack Simulation
To locate the release position at time $t = t_{\text{SAR}} - \Delta t$:
$$\frac{d\vec{X}}{dt} = -\vec{V}_{\text{drift}}(\vec{X}, t)$$
We integrate backward in time from $t_{\text{SAR}}$ to $t_{\text{SAR}} - T_{\max}$ (default $T_{\max} = 12\text{ hours}$, step size $\Delta t = 300\text{ seconds}$) using RK4:
$$\vec{X}_{n-1} = \vec{X}_n - \frac{\Delta t}{6} (k_1 + 2k_2 + 2k_3 + k_4)$$
$$k_1 = \vec{V}_{\text{drift}}(\vec{X}_n, t_n)$$
$$k_2 = \vec{V}_{\text{drift}}\left(\vec{X}_n - \frac{\Delta t}{2}k_1, t_n - \frac{\Delta t}{2}\right)$$
$$k_3 = \vec{V}_{\text{drift}}\left(\vec{X}_n - \frac{\Delta t}{2}k_2, t_n - \frac{\Delta t}{2}\right)$$
$$k_4 = \vec{V}_{\text{drift}}(\vec{X}_n - \Delta t k_3, t_n - \Delta t)$$

### 6.3 Uncertainty Dispersion Covariance
Because wind and current data have spatial and temporal resolution limits, each backtrack point expands over time into an uncertainty ellipse governed by turbulent diffusion:
$$\sigma_x^2(t) = \sigma_{x,0}^2 + 2 D_h t, \quad \sigma_y^2(t) = \sigma_{y,0}^2 + 2 D_h t$$
where $D_h \approx 1.0 - 5.0\text{ m}^2/\text{s}$ is the horizontal oceanic turbulent diffusivity coefficient. This defines the search envelope when querying candidate AIS tracks.

---

## 7. Spatiotemporal AIS Correlation & Multi-Vessel Disambiguation Engine

In heavy traffic lanes (e.g., 20 nautical miles off Kandla or Mumbai High), querying AIS within a spatial radius can return 30+ vessels. A naive "closest vessel" metric leads to catastrophic misattribution.

```
[Spill Origin at t_0]
         │
         ▼
[PostGIS ST_DWithin + ST_Trajectory Query] ──► [Candidate Vessel Filter (5-50 ships)]
                                                              │
   ┌──────────────────────────────────────────────────────────┴────────────────────────────────┐
   ▼                                                          ▼                                ▼
[Metric 1: Backtrack Error]                      [Metric 2: Trajectory Alignment]     [Metric 3: Kinetic Anomaly]
Dist(Vessel(t_i), Backtrack(t_i))                Angle(Vessel_Course, Slick_Axis)     Speed Drop / Heading Jitter
   │                                                          │                                │
   └──────────────────────────────────────────────────────────┬────────────────────────────────┘
                                                              │
                                                              ▼
                                             [Multi-Factor Bayesian Attribution Score]
                                             S_attribution(V_i) in [0.00, 1.00]
```

### 7.1 Spatiotemporal Spatial Indexing
AIS trajectories are indexed in PostGIS using 3D R-Tree indexes (`ST_MakePoint(longitude, latitude, epoch_time)`). Candidate vessels are retrieved using a spatiotemporal cylinder query:
$$\text{Vessel } V \iff \exists t \in [t_{\text{SAR}} - T_{\max}, t_{\text{SAR}}] \text{ s.t. } \text{Distance}(V(t), \vec{X}_{\text{backtrack}}(t)) \le 3 \cdot \sigma_{\text{drift}}(t)$$

### 7.2 Multi-Factor Probabilistic Scoring Formulation
Each candidate vessel $V_i$ receives an overall attribution confidence score $S_{\text{attribution}}(V_i) \in [0, 1]$ computed via a calibrated weighted fusion:
$$S_{\text{attribution}}(V_i) = \sum_{k=1}^5 w_k \cdot f_k(V_i), \quad \sum w_k = 1.0$$

| Factor ($k$) | Name | Weight ($w_k$) | Description & Formulation |
|---|---|---|---|
| **$f_1$** | **Backtrack Proximity Match** | $0.35$ | Minimum distance between vessel track $V_i(t)$ and reverse-drifted slick centroid $\vec{X}_b(t)$ at the exact synchronized timestep $t$: <br> $f_1 = \exp\left(-\frac{\min_t \|\vec{P}_{V_i}(t) - \vec{X}_b(t)\|^2}{2 \sigma_{\text{dist}}^2}\right)$ |
| **$f_2$** | **Trajectory-Slick Collinearity** | $0.25$ | Cosine similarity between vessel Heading/COG vector $\vec{u}_{\text{vessel}}$ and the slick's major skeleton orientation vector $\vec{u}_{\text{slick}}$: <br> $f_2 = |\cos(\theta_{\text{vessel}} - \theta_{\text{slick}})|$ |
| **$f_3$** | **Vessel Profile / Prior Probability** | $0.15$ | Vessel type risk multiplier derived from MARPOL historical records: <br> Crude Tanker = $1.0$, Chemical Carrier = $0.9$, Bunker Barge = $0.85$, Container Ship = $0.6$, Bulk Carrier = $0.5$, Fishing/Tug = $0.1$ |
| **$f_4$** | **Kinematic Anomaly Score** | $0.15$ | Illegal discharge behavior detection: vessel slowing to tank-washing speed ($4 - 8\text{ knots}$) during night hours, zig-zag maneuvers, or sudden course changes unprompted by navigational hazards: <br> $f_4 = \sigma\left(\beta_1 \cdot \Delta \text{Speed} + \beta_2 \cdot \text{CourseJitter}\right)$ |
| **$f_5$** | **Temporal Plausibility Score** | $0.10$ | Strict directional causality: the vessel must have been present *before or at* the release time $t_0$, penalized to zero if the vessel arrived after $t_{\text{SAR}}$ |

### 7.3 AIS Reporting Gaps & Dark-Target Corroboration
Vessels underway in transit lanes may experience transponder outages or deliberate switch-offs:
- **Gap Detection**: If an AIS track terminates within $25\text{ nautical miles}$ upstream of the slick backtrack origin and resumes downstream hours later during the discharge window, the system flags an **"AIS Reporting Gap Anomaly"** without presuming subjective intent.
- **Radar Cross-Section (RCS) Corroboration**: Ship detection on the same SAR image identifies high-intensity metallic scatterers (ship echoes). If an uncooperative vessel echo is detected with no matching AIS transmission within $5\text{ km}$, a **"Dark Target Alert"** is spawned and correlated against the drift backtrack origin.

---

## 8. Explainability & Attribution Factor Decomposition

Black-box neural network outputs are inadmissible in maritime tribunal proceedings. `Sagar-Drishti` generates a deterministic, transparent factor attribution card for every candidate vessel:

```
Candidate Vessel: MV COASTAL DEFENDER-IV (MMSI: 419001234, IMO: 9345678, Type: OIL_TANKER)
Attribution Confidence: 93.2% [Dirichlet Bayesian Posterior Probability: 76.5%]
Status: PRIMA FACIE CULPRIT - PROBABLE CAUSE FOR TARGETED INTERCEPTION & FUEL SAMPLING

Factor Breakdown (Reconciled sigma_kernel = 233.4 m, CPA = 143 m):
├── Backtrack Proximity:      82.9%  (Track intersected origin at CPA 143m; L_dist = exp(-143^2 / (2 * 233.4^2)))
├── Trajectory Collinearity: 100.0%  (Vessel heading 248° aligns 100% with slick skeleton axis)
├── Kinematic Profile:        85.0%  (Nighttime speed drop 14.2 kn -> 4.7 kn; AIS gap 1.8h detected)
├── Vessel Type Prior:       100.0%  (Crude Oil Tanker, DWT 105,000 MT)
└── Temporal Plausibility:   100.0%  (Vessel transit synchronized with reconstructed release window t_0)
```

For ML-based pixel segmentation explainability, the system uses Integrated Gradients across the SAR input channels to display saliency maps proving the neural network based its classification on physical backscatter damping rather than coastline artifacts.

---

## 9. Tamper-Evident Evidence Ledger & MARPOL Compliance

Under Section 65B of the Indian Evidence Act (and Section 63 of the Bharatiya Sakshya Adhiniyam, 2023), electronic records submitted as evidence in court must have an unbroken, mathematically proven chain of custody verifying that the data has not been modified after generation.

```
┌─────────────────────────┐
│ Raw SAR Scene Hash      │ SHA-256: 3a7b8e...
└────────────┬────────────┘
             │
             ├──► [Deterministic RFC 8785 Canonical JSON Serialization]
             │
┌────────────┴────────────┐
│ AIS Track Slice Hash    │ SHA-256: f4d19c...
└────────────┬────────────┘
             │
             ├──► [Binary Merkle Tree: SHA-256(0x00 || Leaf) / SHA-256(0x01 || L || R)]
             │
┌────────────┴────────────┐
│ MetOcean Snapshot Hash  │ SHA-256: 8e50b2...
└────────────┬────────────┘
             │
             ▼
┌────────────────────────────────────────────────────────┐
│ Merkle Root: e78f0b12a9...                             │
│ Signed with RFC 8032 Ed25519 Private Key of Node       │
│ Appended to O(1) JSONL Sequential Hash Chain (Chained) │
│ Designed for RFC 3161 External TSA / Log Publication   │
└────────────────────────────────────────────────────────┘
```

### 9.1 Cryptographic Chain of Custody
1. **Raw Ingestion Hashing**: Compute SHA-256 hashes of the raw Sentinel-1 SAFE package / RISAT-1A CEOS products, the AIS telemetry slice, and the MetOcean GRIB2 slice using deterministic RFC 8785 JSON Canonicalization (JCS).
2. **Merkle Block Assembly**: Combine input hashes into a binary Merkle tree with prefix separation (`0x00` for leaves, `0x01` for interior nodes) preventing second-preimage attacks.
3. **Sequential Hash-Chained Ledger**: Each detection event is committed as an immutable block in `output/ledger_chain.json`:
   $$\text{Block}_n = \text{SHA-256}\left(\text{Block}_{n-1} \,\|\, \text{Timestamp}_{\text{UTC}} \,\|\, \text{MerkleRoot}_n \,\|\, \text{NodeID}\right)$$
4. **Digital Signature**: The block hash is signed using the RFC 8032 Ed25519 private key of the surveillance processing node and anchored to an immutable append-only log.

### 9.2 Automated MARPOL Evidence Dossier Generation
The system generates a court-ready, multi-page PDF/A document containing:
- High-resolution SAR backscatter image with the detected slick boundary highlighted.
- Vector map showing the candidate vessel's historical track, the backtrack drift cone, and point of convergence.
- Tabular breakdown of the mathematical correlation scores and Dirichlet-Categorical Bayesian posterior probabilities.
- MetOcean conditions at the time of incident (wave height, surface current, wind speed/direction).
- Section 65B Certificate of Computer Evidence / BSA 2023 Technical Attestation Clause specifying processing host, software kernel version digest, and unbroken Merkle tree integrity, establishing **probable cause** to legally justify targeted Coast Guard interception and GC-MS bunker fuel sampling.

---

## 10. Data Schemas & Interface Contracts

The system uses strict, strongly typed JSON / Pydantic schemas for inter-service communication.

### 10.1 Spill Detection Event Schema (`spill_event.json`)
```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "eventId": "SPILL-20260910-S1A-04812",
  "timestampUtc": "2026-09-10T14:45:22Z",
  "sarMetadata": {
    "mission": "SENTINEL-1A",
    "productType": "GRD",
    "polarization": ["VV", "VH"],
    "relativeOrbit": 118,
    "passDirection": "DESCENDING",
    "rawSceneSha256": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
  },
  "spillGeometry": {
    "centroid": {"latitude": 21.8452, "longitude": 69.1124},
    "areaKm2": 4.82,
    "perimeterKm": 18.34,
    "skeletonOrientationDeg": 248.5,
    "polygonGeoJson": {
      "type": "Polygon",
      "coordinates": [[[69.102, 21.835], [69.125, 21.842], [69.118, 21.855], [69.102, 21.835]]]
    }
  },
  "classification": {
    "classLabel": "MINERAL_OIL",
    "confidence": 0.962,
    "lookAlikeProbs": {
      "mineralOil": 0.962,
      "biogenicSlick": 0.024,
      "lowWindArea": 0.011,
      "shipWake": 0.003
    }
  }
}
```

### 10.2 Candidate Vessel Attribution Schema (`attribution_record.json`)
```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "eventId": "SPILL-20260910-S1A-04812",
  "backtrackOrigin": {
    "estimatedDischargeTimeUtc": "2026-09-10T10:30:00Z",
    "coordinates": {"latitude": 21.9120, "longitude": 69.2480},
    "uncertaintyRadiusMeters": 450.0
  },
  "candidateVessels": [
    {
      "mmsi": 419001234,
      "imo": 9345678,
      "vesselName": "MT OCEAN PIONEER",
      "flag": "India",
      "vesselType": "OIL_TANKER",
      "attributionRank": 1,
      "attributionScore": 0.934,
      "factorBreakdown": {
        "backtrackProximityScore": 0.962,
        "trajectoryCollinearityScore": 0.918,
        "vesselPriorScore": 1.000,
        "kineticAnomalyScore": 0.885,
        "temporalPlausibilityScore": 1.000
      },
      "closestApproachMeters": 340.2,
      "aisStatus": "ACTIVE",
      "speedOverGroundKnots": 6.1
    },
    {
      "mmsi": 636019876,
      "imo": 9456789,
      "vesselName": "MV BENGAL GLORY",
      "flag": "Liberia",
      "vesselType": "BULK_CARRIER",
      "attributionRank": 2,
      "attributionScore": 0.312,
      "factorBreakdown": {
        "backtrackProximityScore": 0.420,
        "trajectoryCollinearityScore": 0.350,
        "vesselPriorScore": 0.500,
        "kineticAnomalyScore": 0.120,
        "temporalPlausibilityScore": 1.000
      },
      "closestApproachMeters": 4210.5,
      "aisStatus": "ACTIVE",
      "speedOverGroundKnots": 13.8
    }
  ],
  "cryptographicProof": {
    "merkleRootSha256": "8f3b2a9e10c7d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9",
    "blockHeight": 1042,
    "prevBlockHash": "4a1c5b8e9f2d3a7b0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e98f3b2a9e1",
    "ed25519Signature": "3045022100e4b8...fe820a1"
  }
}
```

---

## 11. Storage Architecture & Geospatial Indexing

The storage architecture is designed to handle high-volume raster payloads and millisecond-latency spatial queries.

```
┌────────────────────────────────────────────────────────────────────────┐
│ MINIO / AWS S3 OBJECT STORAGE                                          │
│  - Raw Sentinel-1 SAFE Zip Archives & GeoTIFFs                         │
│  - Preprocessed & Calibrated Float32 Sigma0 Tiles                     │
│  - Generated GeoTIFF Heatmaps & PDF/A MARPOL Enforcement Dossiers      │
└────────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────────┐
│ POSTGRESQL 16 + POSTGIS 3.4 GEOSPATIAL DATABASE                       │
│  - Polygons table (Detected slicks with ST_Polygon geometry)           │
│  - Spatial GiST & SP-GiST Indexes for R-Tree spatial intersection      │
│  - Hydrodynamic Drift Backtrack Vectors (ST_LineString3D)              │
│  - Vessel Registry Metadata & MARPOL Prior Profiles                    │
└────────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────────┐
│ TIMESCALEDB HYPERTABLES (TIME-SERIES AIS & METOCEAN DATA)              │
│  - Partitioned by 1-day chunks on timestamp_utc                        │
│  - Automated compression policy (Zstandard compression after 7 days)   │
│  - Optimized for spatiotemporal interpolation along vessel routes       │
└────────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────────┐
│ REDIS 7 IN-MEMORY CACHE & PUB/SUB                                      │
│  - Active Vessel Positions (H3 Geospatial Index Resolution 7/8)        │
│  - Live Pipeline Task States & WebSocket Broadcast Channels            │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 12. Deployment Topology, Edge Capabilities & Scalability

### 12.1 Cloud / Data Center Production Deployment (Kubernetes)
- Deployed via Helm charts on an enterprise Kubernetes cluster (on-premise DG Shipping data center or AWS GovCloud/MeitY-empanelled cloud):
  - Ingestion pods auto-scale on Kafka queue depth.
  - Triton Inference Server runs on NVIDIA A10G / L4 GPUs with dynamic batching (16 tiles/batch).
  - PostGIS runs on managed HA PostgreSQL with read replicas.

### 12.2 Patrol Vessel Offline Edge Deployment (Docker Compose)
For deployment aboard Indian Coast Guard Offshore Patrol Vessels (OPVs) where satellite uplink bandwidth is restricted:
- **Lightweight Offline Container Bundle**:
  - Pre-cached offline coastal tiles and bathymetry.
  - Quantized ONNX Runtime model (INT8 quantized SegFormer) executing on standard CPU / workstation GPU.
  - Local SQLite / SpatiaLite database storing historical AIS received from the ship’s own onboard VHF AIS transponder.
  - Local Streamlit / Web UI operating entirely disconnected from the Internet.

---

## 13. Verification, Validation & Benchmark Plan

To guarantee operational readiness, the system is subjected to a dual-protocol benchmark:

### 13.1 Computer Vision Detection Benchmarks
- **Test Corpus**:
  1. ESA Deep-SAR Oil Spill public benchmark dataset (1,112 labeled SAR scenes).
  2. Proprietary Indian EEZ evaluation set (50 curated Sentinel-1 scenes covering Gulf of Kutch, Mumbai High, and Bay of Bengal with expert-annotated slicks, algal blooms, and ship wakes).
- **Target Metrics**:
  - Spill Segmentation IoU (Intersection over Union): $\ge 0.74$
  - Look-Alike Precision: $\ge 0.88$ (false alarm rate on algal blooms $\le 12\%$)
  - Minimum Detectable Slick Size: $0.05\text{ km}^2$

### 13.2 Drift & Attribution Validation
- **Synthetic Ground Truth Injection**: Inject simulated oil discharge points with known synthetic vessel AIS tracks and run forward-drift simulation; verify that the backward-drift attribution engine correctly identifies the simulated source vessel with $> 90\%$ confidence.
- **Historic Case Replay**: Replay documented Indian maritime incidents (e.g., historical tanker washings off Saurashtra coast) against archived AIS data to confirm trajectory convergence.

---

## 14. Hackathon MVP vs. Enterprise Roadmap

| Dimension | Hackathon MVP Scope | Full Enterprise Production Scope |
|---|---|---|
| **SAR Imagery Ingestion** | Curated, pre-downloaded Sentinel-1 scenes (Gulf of Kutch & Mumbai High) for deterministic demo reliability. | Live automated Sentinel-1 & Radar Imaging Satellite (RISAT-1A / EOS-04) API ingestion via CDSE OData webhooks. |
| **AIS Data Stream** | Pre-recorded / replayed high-density AIS CSV / SQLite telemetry matched to SAR scene acquisition timestamps. | Live multi-source streaming (Coastal AIS VHF receiver network + satellite AIS feeds via Spire / ORBCOMM). |
| **Detection Engine** | PyTorch / ONNX U-Net or SegFormer trained on Deep-SAR with Indian look-alike fine-tuning. | Multi-sensor ensemble (Sentinel-1 SAR + Sentinel-2 optical multispectral + EOS-04 radar) on Triton Inference Server. |
| **MetOcean Drift** | 2D kinematic advection using static/interpolated ERA5 wind & HYCOM current grids. | Fully coupled 3D hydrodynamics (ROMS / Delft3D) with multi-fraction oil weathering & chemical dissolution modeling. |
| **Evidentiary Output** | Interactive Streamlit / React dashboard showing spill overlay, ranked vessels, and downloadable mock 65B PDF dossier. | Legally certified, append-only cryptographic ledger integrated into Indian Coast Guard Maritime Rescue Coordination Centres (MRCC). |
| **Deployment** | Single-command Docker Compose / standalone Python harness with offline demo fallbacks. | High-availability Kubernetes cluster with edge deployment on Coast Guard patrol vessels. |

---

## 15. Repository Structure

```
sagar-drishti/
├── main.py                     # Entry point — `pipeline`, `api`, `dashboard`, `test`
├── api/                        # FastAPI REST & WebSocket endpoints (MVP)
│   ├── main.py                 # App assembly + `/health`, `/api/v1/vessels`, `/api/v1/metocean`
│   └── routes/                 # incidents, drift, attribution, evidence endpoints
├── core/
│   ├── sar/                    # detection.py (SegFormer/DeepLabV3+/U-Net detectors),
│   │                           # preprocessing.py (calibration/Refined Lee), texture.py (Haralick)
│   ├── ais/                    # parser.py — AIVDM/CSV ingestion, trajectories, anomaly detection
│   ├── drift/                  # rk4.py — RK4 Lagrangian backward/forward trajectory engine
│   ├── correlation/            # attribution.py — Bayesian multi-factor scoring (5 factors)
│   ├── evidence/               # ledger.py — SHA-256 Merkle chain, Ed25519 signer, PDF/A dossier
│   └── metocean/               # fetchers.py — INCOIS currents + ECMWF winds, bilinear interpolation
├── data/
│   └── sample_scenes.py        # Pre-cached SAR scenes, AIS vessels, MetOcean grids, EEZ corridors
├── dashboard/                  # app.py — Streamlit interactive UI (4 pages)
├── frontend/                   # Next.js 16 + MapLibre GL web console (primary UI)
│   ├── src/lib/                # api.ts, bootstrap.ts, mockData.ts, store.ts, types.ts
│   ├── src/app/                # /operations /sar/[id] /sar-investigation /drift /attribution
│   │                           #  /vessels/[imo] /evidence /dossier /settings
│   ├── src/components/         # shell, map, sar, sar-investigation, drift, attribution,
│   │                           #  evidence, incident, vessels, kpi
│   ├── e2e/smoke.spec.ts       # Playwright browser checks
│   └── Dockerfile
├── docker/
│   ├── Dockerfile              # Backend image (python:3.11-slim + GDAL)
│   └── docker-compose.yml      # One-command stack (api + dashboard; console via `full` profile)
├── tests/
│   ├── test_drift.py           # Lagrangian backtracking accuracy tests
│   ├── test_attribution.py     # Multi-vessel disambiguation scoring tests
│   └── test_evidence.py        # Merkle ledger + tamper-detection tests
├── Architecture.md             # This master architecture specification
├── PITCH.md                    # Elevator pitch deck
└── README.md                   # Quickstart, API surface, extension guide
```

> The MVP ships the heuristic SAR slicer (implemented in `core/sar`), the RK4 drift engine, the 5-factor Bayesian attribution model, and the signed evidence ledger end-to-end. The deep-learning segmentation models, streaming ingestion, GRIB decoding, and storage tier are stubbed behind the same interfaces and enabled in the enterprise rollout (§14).

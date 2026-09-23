# Sagar-Drishti — Elevator Pitch

**Two-minute pitch. One page. Deployable today.**

---

## The problem

Illegal tank-washing releases of bilge and oily residue are invisible at night and in monsoon cloud. By the time the slick is spotted from a conventional patrol, the ship that left it is gone — and a prosecution collapses for lack of evidence.

## What we built

A **Satellite SAR → forensic attribution** pipeline that closes exactly that gap:

1. **Detect.** Sentinel-1 C-Band SAR sees the slick in any weather, at any hour — automatically discriminated from algal look-alikes and low-wind calms.
2. **Reconstruct.** A 4th-order Runge–Kutta Lagrangian backtracker, driven by INCOIS currents and ECMWF winds, recovers where and when the discharge happened.
3. **Attribute.** A 5-factor Bayesian score fuses the reconstructed origin with AIS trajectories — proximity, heading collinearity, vessel-type prior, tank-washing kinematic anomaly, temporal causality — to rank suspects.
4. **Prove.** Every artefact is hash-linked in an unbroken SHA-256 Merkle chain, signed with Ed25519, and sealed with a Section 65B technical attestation establishing **probable cause** under the **Indian Evidence Act** / **Section 63 BSA 2023** for targeted vessel boarding and GC-MS fuel sampling.

It is wrapped in a working command center (Next.js 14 + Deck.gl / MapLibre) that streams live from a FastAPI backend — **no Docker, no GPU, no cloud needed to demo it end-to-end**.

## Why it wins a demo, not just a deck

- **It runs.** Two commands (`python main.py api`, `npm run dev`) — the DATA LIVE chip flips green as the console hydrates from the live API. Kill the API and it degrades gracefully to cached scenes.
- **It's testable.** 69 pytest cases across all 6 stages (CMOD5.N, compact polarimetry, cascade CFAR, SegFormer/DeepLab, RK4, attribution, and ledger), all green.
- **It's forgery-proof.** Tamper with one block or byte and the evidence page immediately flags chain invalidity. That's the whole legal argument, demonstrated live.
- **It's extensible.** Open Sentinel-1 baseline is coupled with an ISRO RISAT-1A (EOS-04) sovereign dual-use adapter ($m\text{--}\chi$ polarimetry).

## Numbers we stand behind (measured in-repo)

| Claim | Value |
|---|---|
| Attribution top-candidate | MV COASTAL DEFENDER-IV (MMSI: 419001234) |
| Bayesian Dirichlet Posterior | 76.5 % (Linear Confidence: 93.2%) |
| Physical Reconciled Kernel | $\sigma_{\text{kernel}} \approx 233.4\text{ m}$ (CPA = 143 m) |
| Meaningful cell size at 150 m | RK4 step = 300 s, backtrack to 12 h |
| Evidence chain | 5 blocks, sequential SHA-256 hash-chained, Ed25519-signed |
| Test coverage | 69 Python automated tests, all green |

## Single next step for production

Connect the live Copernicus CDSE OData stream and INCOIS real-time coastal radar feeds — the data ingestion schemas and adapters are already wired.

---

*Sagar-Drishti · SIH26143 · Indian Coast Guard / MoES / DGS*
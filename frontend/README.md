# Sagar-Drishti Web Console

React + MapLibre GL command center for the SIH26143 oil-spill detection and forensic vessel attribution platform. It visualizes live SAR incidents, reverse-drift reconstruction, AIS trajectories, ranked suspects, and the tamper-evident evidence ledger — all streamed from the FastAPI backend.

## Stack

- **Next.js 16** (App Router) + **React 19** + **TypeScript**
- **MapLibre GL** for the maritime map layers
- **Zustand** for client state, **Recharts** for attribution/forensics charts, **Three.js** for the 3D exercising-view, **Framer Motion** for the investigation animations
- **Tailwind CSS v4**

## Getting Started

```bash
npm install
npm run dev
```

Open <http://localhost:3000>. The landing route (`/`) redirects to `/operations`.

### Live vs. simulated data

The console hydrates from the backend on load (`Bootstrap` → `store` → `api`).

- If the API is reachable, the **DATA LIVE** chip in the top bar turns green and map/drift/attribution/ledger views stream live responses.
- If it is not, every request falls back to the offline cached dataset in `src/lib/mockData.ts` and the chip shows **DATA SIMULATED** (amber). Clicking the chip re-syncs.

The API base URL defaults to `http://localhost:8000`, overridable via `NEXT_PUBLIC_API_URL`. Configure the URL before building: `NEXT_PUBLIC_API_URL` is inlined at build time.

## Routes

| Route | Page |
|---|---|
| `/operations` | Live maritime map with SAR scenes, AIS traffic, and slick overlays |
| `/sar/[id]` | Per-incident SAR analysis (scene metadata, detection layers) |
| `/sar-investigation` | Investigation workbench — walkthrough of a detection vs. emitting vessel |
| `/drift` | Animated RK4 reverse-drift reconstruction and origin estimation |
| `/attribution` | 5-factor Bayesian ranking of suspect vessels |
| `/vessels/[imo]` | Per-vessel profile with trajectory and anomaly history |
| `/evidence` | Live verifier of the SHA-256 Merkle chain / Ed25519 signatures |
| `/dossier` | Court-ready MARPOL evidence dossier view |
| `/settings` | Console configuration and data-source status |

## Source Layout

```
src/
├── app/                  # App Router pages (routes above)
├── components/
│   ├── shell/            # TopBar, CommandRail, StatusStrip, Bootstrap
│   ├── map/              # MapLibre map + layers
│   ├── sar/              # Detection overlays, texture cards
│   ├── sar-investigation/# Investigation workbench components
│   ├── drift/            # Trajectory reconstruction panels
│   ├── attribution/      # Factor bars, ranking table
│   ├── evidence/         # Ledger blocks + verify sequence
│   ├── incident/         # Incident cards / list
│   ├── vessels/          # Vessel profile components
│   └── kpi/              # Metric chips
└── lib/
    ├── types.ts          # Domain types (scene, vessel, metOcean, block…)
    ├── api.ts            # Fetch client against the FastAPI backend
    ├── bootstrap.ts      # Hydrates the store from the live API (with fallback)
    ├── mockData.ts       # Offline cached sample dataset
    └── store.ts          # Zustand store
```

## Testing

End-to-end browser checks use Playwright:

```bash
npm run test:e2e            # playwright test
npx playwright test --ui    # interactive UI runner
```

`e2e/smoke.spec.ts` exercises every console route plus DATA LIVE / SIMULATED wiring. Note: `AGENTS.md` and `CLAUDE.md` are dev-agent guides — `AGENTS.md` is written and re-added by `next dev`, so leave it to the framework.

## Deployment

The console ships as a self-contained image (`Dockerfile`, ~1.2 GB with Next.js + chromium-based E2E tooling). It is excluded from the default compose stack; start it with:

```bash
docker compose --profile full up -d
```
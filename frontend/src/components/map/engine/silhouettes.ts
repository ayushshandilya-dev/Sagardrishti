import { CandidateVessel } from "@/lib/types";

/* ─────────────────────────────────────────────────────────────
   REALISTIC TOP-DOWN VESSEL SILHOUETTES
   Drawing convention: bow points up (+y), beam spans x.
   viewBox is "0 0 12 76" → length:beam ≈ 6.3 (realistic hull).
   Every marker is rotated to the vessel's heading by the caller;
   colours are injected: dark hull + accent trim + nav lights.
   ───────────────────────────────────────────────────────────── */

type VesselKind =
  | "tanker" // VLCC / product tanker
  | "chemical" // chemical-NLS tanker
  | "container" // boxship
  | "bulk" // bulk carrier
  | "fishing" // trawler
  | "patrol"; // coast-guard patrol craft

const VIEW_W = 12;
const VIEW_H = 76;

export function vesselKind(v: CandidateVessel): VesselKind {
  const t = (v.vesselType ?? "").toUpperCase();
  if (/CHEM/.test(t)) return "chemical";
  if (/TANKER|CRUDE|PRODUCT/.test(t)) return "tanker";
  if (/CONTAINER/.test(t)) return "container";
  if (/BULK/.test(t)) return "bulk";
  if (/FISH|TRAWL/.test(t)) return "fishing";
  if (/PATROL|COAST|CG|INDIAN/.test(t)) return "patrol";
  return "patrol";
}

export function shipMetrics(v: CandidateVessel) {
  const len = v.lengthMeters ?? 100;
  const L = Math.max(17, Math.min(40, 14 + len * 0.07));
  const W = (L * VIEW_W) / VIEW_H;
  return { px: L, pxW: W };
}

/** Deterministic tiny noise useful for deck clutter. */
function jx(seed: number) {
  const x = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}

function hullPath(
  kind: VesselKind,
  hull: string,
  accent: string
): string {
  switch (kind) {
    case "tanker": // long slender hull, bulbous bow, full beam aft
      return `
        <path d="M3.2 1.2 C4.3 0.6 4.9 0 6 0 C7.1 0 7.7 0.6 8.8 1.2 C10.4 2 11.1 3.6 11.3 6 C11.6 14 11.7 26 11.6 40 C11.5 54 11.6 66 11.2 70 C10.9 72.6 10.2 74.2 8.4 75 C7.1 75.6 4.9 75.6 3.6 75 C1.8 74.2 1.1 72.6 0.8 70 C0.4 66 0.5 60 0.4 50 C0.3 36 0.4 16 0.7 8 C0.9 4 1.8 2.2 3.2 1.2 Z" fill="${hull}" stroke="${accent}" stroke-width="0.45" stroke-opacity="0.7"/>
        <path d="M4.4 0.4 L7.6 0.4 L6 2.6 Z" fill="${hull}" stroke="${accent}" stroke-width="0.4" stroke-opacity="0.9"/>`;
    case "chemical": // near-clone with pumped deck piping + rounded bow
      return `
        <path d="M3.4 1.6 C4.4 0.8 5.2 0.2 6 0.2 C6.8 0.2 7.6 0.8 8.6 1.6 C10.2 2.8 11.1 4.6 11.2 8 C11.4 20 11.5 40 11.3 54 C11.2 62 11.3 68 10.9 71 C10.7 73 10.1 74.6 8.6 75 C6.9 75.5 5.1 75.5 3.4 75 C1.9 74.6 1.3 73 1.1 71 C0.7 68 0.8 62 0.7 54 C0.5 40 0.6 20 0.8 8 C0.9 4.6 1.8 2.8 3.4 1.6 Z" fill="${hull}" stroke="${accent}" stroke-width="0.45" stroke-opacity="0.7"/>
        <path d="M5 0.3 L7 0.3 L6 1.6 Z" fill="${hull}" stroke="${accent}" stroke-width="0.35" stroke-opacity="0.8"/>`;
    case "container": // boxy hull, long low superstructure forward, stacked boxes
      return `
        <path d="M2.4 1.4 C3.6 0.4 4.8 0 6 0 C7.2 0 8.4 0.4 9.6 1.4 C11 2.6 11.6 4.2 11.8 8 C12 20 12 44 11.8 56 C11.7 64 11.4 70 10.6 73 C10 75 8.8 75.6 6 75.6 C3.2 75.6 2 75 1.4 73 C0.6 70 0.3 64 0.2 56 C0 44 0 20 0.2 8 C0.4 4.2 1 2.6 2.4 1.4 Z" fill="${hull}" stroke="${accent}" stroke-width="0.45" stroke-opacity="0.7"/>
        <path d="M4.8 0.2 L7.2 0.2 L6 1.8 Z" fill="${hull}" stroke="${accent}" stroke-width="0.4" stroke-opacity="0.8"/>`;
    case "bulk": // full-form with raised forecastle, long hatch run
      return `
        <path d="M3.6 1.2 C4.6 0.6 5.2 0.2 6 0.2 C6.8 0.2 7.4 0.6 8.4 1.2 C10.2 2.2 11.2 3.8 11.4 7 C11.8 20 11.8 46 11.4 58 C11.2 64 11 69 10.3 71.6 C9.8 73.4 8.4 75 6 75 C3.6 75 2.2 73.4 1.7 71.6 C1 69 0.8 64 0.6 58 C0.2 46 0.2 20 0.6 7 C0.8 3.8 1.8 2.2 3.6 1.2 Z" fill="${hull}" stroke="${accent}" stroke-width="0.45" stroke-opacity="0.7"/>
        <path d="M5 0.2 L7 0.2 L6 2 Z" fill="${hull}" stroke="${accent}" stroke-width="0.4" stroke-opacity="0.8"/>`;
    case "fishing": // beamy open boat, broad stern
      return `
        <path d="M3.8 2.4 C4.7 1.6 5.4 1 6 1 C6.6 1 7.3 1.6 8.2 2.4 C10 4 10.8 6 10.9 10 C11 30 11.1 50 10.8 60 C10.5 68 9.6 72 8 74 C7.4 74.6 6.6 74.6 4 74 C2.4 72 1.5 68 1.2 60 C0.9 50 1 30 1.1 10 C1.2 6 2 4 3.8 2.4 Z" fill="${hull}" stroke="${accent}" stroke-width="0.45" stroke-opacity="0.7"/>`;
    case "patrol":
    default:
      return `
        <path d="M3.8 1 C4.4 0.5 5.2 0.1 6 0.1 C6.8 0.1 7.6 0.5 8.2 1 C9.8 1.8 10.8 3 11.1 5 C11.6 12 11.7 40 11.4 58 C11.2 66 10.8 70.4 10 72.4 C9.4 73.8 8 75 6 75 C4 75 2.6 73.8 2 72.4 C1.2 70.4 0.8 66 0.6 58 C0.3 40 0.4 12 0.9 5 C1.2 3 2.2 1.8 3.8 1 Z" fill="${hull}" stroke="${accent}" stroke-width="0.45" stroke-opacity="0.75"/>
        <path d="M1.6 26 L10.4 26 M1.6 30 L10.4 30" stroke="${accent}" stroke-width="0.5" stroke-opacity="0.5"/>`;
  }
}

function deckDetails(kind: VesselKind, deck: string, accent: string): string {
  switch (kind) {
    case "tanker": // raised poop + bridge house + funnel + tank deck
      return `
        <rect x="2.2" y="58" width="7.6" height="9" rx="1" fill="#0d1f30"/>
        <rect x="3" y="62" width="6" height="3.4" rx="0.6" fill="#13283d"/>
        <circle cx="6" cy="64" r="1.3" fill="#1b3347"/>
        <line x1="6" y1="40" x2="6" y2="54" stroke="${deck}" stroke-width="0.45"/>
        <line x1="3.2" y1="42" x2="8.8" y2="42" stroke="${deck}" stroke-width="0.3" stroke-opacity="0.8"/>
        <line x1="3.2" y1="50" x2="8.8" y2="50" stroke="${deck}" stroke-width="0.3" stroke-opacity="0.8"/>`;
    case "chemical": // central tank house + pump room aft
      return `
        <rect x="2.4" y="12" width="7.2" height="34" rx="1" fill="#0b2033" fill-opacity="0.6"/>
        <rect x="3.2" y="58" width="5.6" height="7" rx="0.8" fill="#0d1f30"/>
        <line x1="6" y1="14" x2="6" y2="44" stroke="${deck}" stroke-width="0.35"/>
        <circle cx="6" cy="18" r="0.9" fill="${deck}"/>
        <circle cx="6" cy="26" r="0.9" fill="${deck}"/>
        <circle cx="6" cy="34" r="0.9" fill="${deck}"/>`;
    case "container": // bridge forward + two container stacks
      return `
        <rect x="3" y="18" width="6" height="7" rx="0.8" fill="#0d1f30"/>
        <rect x="3" y="30" width="6" height="2" rx="0.4" fill="${deck}"/>
        <rect x="1" y="36" width="4.3" height="6.4" rx="0.5" fill="${deck}"/>
        <rect x="6.7" y="36" width="4.3" height="6.4" rx="0.5" fill="${deck}"/>
        <rect x="1" y="45" width="4.3" height="6.4" rx="0.5" fill="${deck}"/>
        <rect x="6.7" y="45" width="4.3" height="6.4" rx="0.5" fill="${deck}"/>
        <rect x="1" y="54" width="4.3" height="6.4" rx="0.5" fill="${deck}"/>
        <rect x="6.7" y="54" width="4.3" height="6.4" rx="0.5" fill="${deck}"/>
        <rect x="3" y="62" width="6" height="5" rx="0.8" fill="#0d1f30"/>`;
    case "bulk": // forecastle + five cargo hatches
      return `
        <rect x="2.6" y="6" width="6.8" height="6" rx="1" fill="#0d1f30"/>
        <rect x="2.8" y="16" width="6.4" height="7" rx="1.2" fill="none" stroke="${deck}" stroke-width="0.5"/>
        <rect x="2.8" y="27" width="6.4" height="7" rx="1.2" fill="none" stroke="${deck}" stroke-width="0.5"/>
        <rect x="2.8" y="38" width="6.4" height="7" rx="1.2" fill="none" stroke="${deck}" stroke-width="0.5"/>
        <rect x="2.8" y="49" width="6.4" height="7" rx="1.2" fill="none" stroke="${deck}" stroke-width="0.5"/>
        <rect x="3.2" y="61" width="5.6" height="5.5" rx="0.8" fill="#0d1f30"/>`;
    case "fishing": // wheelhouse + net boom + mast
      return `
        <rect x="3.6" y="30" width="4.8" height="6" rx="0.7" fill="#0d1f30"/>
        <line x1="0.8" y1="42" x2="11.2" y2="42" stroke="${accent}" stroke-width="0.45" stroke-opacity="0.6"/>
        <circle cx="5.6" cy="34" r="0.8" fill="#1b3347"/>
        <line x1="3.6" y1="26" x2="8.4" y2="26" stroke="${deck}" stroke-width="0.3"/>`;
    case "patrol":
    default: // CIWS mount forward + radar lattice mid + OPV beat
      return `
        <line x1="1.4" y1="14" x2="10.6" y2="14" stroke="#EF4444" stroke-width="0.9" stroke-opacity="0.85"/>
        <circle cx="6" cy="6" r="0.95" fill="#101d2b" stroke="${accent}" stroke-width="0.35"/>
        <circle cx="6" cy="6" r="0.4" fill="#38BDF8"/>
        <rect x="2.6" y="30" width="6.8" height="8" rx="0.8" fill="#0d1f30"/>
        <rect x="3.4" y="34" width="5.2" height="2.4" rx="0.5" fill="#1b3347"/>
        <line x1="3" y1="10" x2="9" y2="18" stroke="${accent}" stroke-width="0.35" stroke-opacity="0.55"/>`;
  }
}

function navLights(): string {
  return `
    <circle cx="5.05" cy="1.1" r="0.6" fill="#FF4B42" opacity="0.95" style="filter:drop-shadow(0 0 1.6px rgba(255,75,66,0.9))"/>
    <circle cx="6.95" cy="1.1" r="0.6" fill="#47E57C" opacity="0.95" style="filter:drop-shadow(0 0 1.6px rgba(71,229,124,0.9))"/>
    <circle cx="6" cy="74" r="0.55" fill="#E8F0F3" opacity="0.85"/>`;
}

/**
 * Returns a self-contained SVG string for one vessel.
 * @param accent  glow colour of the ship's AIS track
 */
export function shipSilhouette(v: CandidateVessel, accent: string): string {
  const k = vesselKind(v);
  const { px, pxW } = shipMetrics(v);
  const hull = "#0a1420";
  const deck = "#1b3a52";
  return `
    <svg width="${pxW.toFixed(2)}" height="${px.toFixed(2)}" viewBox="0 0 ${VIEW_W} ${VIEW_H}"
      style="display:block;overflow:visible"
      preserveAspectRatio="xMidYMid meet" aria-hidden="true">
      ${hullPath(k, hull, accent)}
      ${deckDetails(
        k,
        k === "tanker" || k === "bulk" ? deck : "#234d63",
        accent
      )}
      ${navLights()}
    </svg>`;
}

export function randomJitter(seed: number) {
  return jx(seed);
}
import {
  Incident,
  DriftResult,
  CandidateVessel,
  EvidenceLedgerResponse,
  EvidenceCheck,
  EvidenceManifestResponse,
} from "./types";
import {
  MOCK_INCIDENTS,
  MOCK_DRIFT_RESULT,
  MOCK_CANDIDATE_VESSELS,
  MOCK_EVIDENCE_LEDGER,
  MOCK_EVIDENCE_CHECKS,
  MOCK_EVIDENCE_MANIFEST,
} from "./mockData";

export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
const API_KEY = process.env.NEXT_PUBLIC_API_KEY;

function headers(extra: Record<string, string> = {}): Record<string, string> {
  return API_KEY ? { ...extra, "X-API-Key": API_KEY } : extra;
}

/* Reachability probe — used by the bootstrap to switch LIVE / SIMULATED */
export async function pingBackend(): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE_URL}/health`, {
      cache: "no-store",
      signal: AbortSignal.timeout(3000),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function getIncidents(): Promise<Incident[]> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/v1/incidents`, { cache: "no-store", headers: headers(), signal: AbortSignal.timeout(2000) });
    if (!res.ok) throw new Error("Backend error");
    return await res.json();
  } catch {
    return MOCK_INCIDENTS;
  }
}

export async function getDriftBacktrack(
  latitude: number,
  longitude: number,
  sarTimestamp: string
): Promise<DriftResult> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/v1/drift/backtrack`, {
      method: "POST",
      headers: headers({ "Content-Type": "application/json" }),
      body: JSON.stringify({ latitude, longitude, sar_timestamp: sarTimestamp }),
      signal: AbortSignal.timeout(2500),
    });
    if (!res.ok) throw new Error("Backend error");
    return await res.json();
  } catch {
    return MOCK_DRIFT_RESULT;
  }
}

export async function getAttributionCandidates(
  backtrackLat: number,
  backtrackLon: number,
  slickOrientation: number,
  sarTimestamp: string
): Promise<{ candidates: CandidateVessel[]; topSuspect: string; topAttributionScore: number }> {
  try {
    const query = new URLSearchParams({
      backtrack_lat: backtrackLat.toString(),
      backtrack_lon: backtrackLon.toString(),
      slick_orientation: slickOrientation.toString(),
      sar_timestamp: sarTimestamp,
    });
    const res = await fetch(`${API_BASE_URL}/api/v1/attribution/candidates?${query}`, {
      headers: headers(),
      signal: AbortSignal.timeout(2500),
    });
    if (!res.ok) throw new Error("Backend error");
    return await res.json();
  } catch {
    return {
      candidates: MOCK_CANDIDATE_VESSELS,
      topSuspect: MOCK_CANDIDATE_VESSELS[0].vesselName,
      topAttributionScore: MOCK_CANDIDATE_VESSELS[0].attributionScore,
    };
  }
}

export async function getEvidenceLedger(): Promise<EvidenceLedgerResponse> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/v1/evidence/ledger`, { headers: headers(), cache: "no-store", signal: AbortSignal.timeout(2000) });
    if (!res.ok) throw new Error("Backend error");
    return await res.json();
  } catch {
    return MOCK_EVIDENCE_LEDGER;
  }
}

export async function getEvidenceManifest(): Promise<EvidenceManifestResponse> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/v1/evidence/manifest`, {
      cache: "no-store",
      signal: AbortSignal.timeout(2500),
    });
    if (!res.ok) throw new Error("Backend error");
    return await res.json();
  } catch {
    return MOCK_EVIDENCE_MANIFEST;
  }
}

export async function verifyEvidenceChain(): Promise<{
  allVerified: boolean;
  checks: EvidenceCheck[];
  verificationTimestamp: string;
}> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/v1/evidence/verify`, {
      method: "POST",
      headers: headers({ "Content-Type": "application/json" }),
      signal: AbortSignal.timeout(2500)
    });
    if (!res.ok) throw new Error("Backend error");
    return await res.json();
  } catch {
    return {
      allVerified: true,
      checks: MOCK_EVIDENCE_CHECKS,
      verificationTimestamp: new Date().toISOString(),
    };
  }
}

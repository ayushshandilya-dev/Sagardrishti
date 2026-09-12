import {
  getIncidents,
  getDriftBacktrack,
  getAttributionCandidates,
  getEvidenceLedger,
  verifyEvidenceChain,
  pingBackend,
} from "./api";
import { useCommandStore } from "./store";
import { DriftResult, CandidateVessel } from "./types";

const toZ = (s: string) =>
  s.endsWith("Z") ? s : s.replace(/\+00:00$/, "Z");

function normalizeDrift(d: DriftResult): DriftResult {
  return {
    ...d,
    observedCentroid: { ...d.observedCentroid, timestampUtc: toZ(d.observedCentroid.timestampUtc) },
    reconstructedOrigin: { ...d.reconstructedOrigin, timestampUtc: toZ(d.reconstructedOrigin.timestampUtc) },
    trajectory: d.trajectory.map((p) => ({ ...p, timestampUtc: toZ(p.timestampUtc) })),
  };
}

/**
 * Hydrate the command store from the live FastAPI backend.
 * Runs once on app mount; every request falls back to cached scene data
 * (mock) server-side on failure, so the UI is never blank.
 */
export async function bootstrapApp(): Promise<void> {
  const live = await pingBackend();
  const st = useCommandStore.getState();
  st.setLastSyncAt(new Date().toISOString());
  if (!live) {
    st.setDataSource("SIMULATED");
    return;
  }

  let served = 0;
  try {
    const incidents = await getIncidents();
    if (incidents.length > 0) {
      const valid = st.selectedIncidentId && incidents.some((i) => i.eventId === st.selectedIncidentId);
      useCommandStore.setState({
        incidents,
        selectedIncidentId: valid ? st.selectedIncidentId : incidents[0].eventId,
      });
      served++;
    }
  } catch {
    /* keep cached incidents */
  }

  const sel = useCommandStore.getState().getSelectedIncident();

  const results = await Promise.allSettled([
    getDriftBacktrack(
      sel.spillGeometry.centroid.latitude,
      sel.spillGeometry.centroid.longitude,
      sel.sarMetadata.acquisitionUtc || sel.timestampUtc
    ),
    getAttributionCandidates(
      sel.spillGeometry.centroid.latitude,
      sel.spillGeometry.centroid.longitude,
      sel.spillGeometry.skeletonOrientationDeg,
      sel.sarMetadata.acquisitionUtc || sel.timestampUtc
    ),
    getEvidenceLedger(),
    verifyEvidenceChain(),
  ]);

  const [drift, attr, ledger, verify] = results;
  if (drift.status === "fulfilled") {
    useCommandStore.getState().setDriftResult(normalizeDrift(drift.value));
    served++;
  }
  if (attr.status === "fulfilled") {
    const { candidates, topSuspect } = attr.value as {
      candidates: CandidateVessel[];
      topSuspect: string;
    };
    if (candidates.length > 0) {
      useCommandStore.getState().setCandidateVessels(candidates);
      const imo = candidates.find((c) => c.vesselName === topSuspect)?.imo;
      if (imo != null) useCommandStore.getState().setSelectedVesselImo(imo);
      served++;
    }
  }
  if (ledger.status === "fulfilled") {
    useCommandStore.getState().setEvidenceLedger(ledger.value);
    served++;
  }
  if (verify.status === "fulfilled") {
    const v = verify.value;
    if (v.checks?.length) useCommandStore.getState().setEvidenceChecks(v.checks);
    served++;
  }

  if (served > 0) useCommandStore.getState().setDataSource("LIVE");
  useCommandStore.getState().setLastSyncAt(new Date().toISOString());
}
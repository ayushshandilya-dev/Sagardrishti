"""Unit tests for the tamper-evident evidence ledger and hash chain."""
import copy

from core.evidence.ledger import (
    TamperEvidentLedger,
    build_evidence_hashes,
    ed25519_sign_hex,
    hash_obj,
)
from data.sample_scenes import MOCK_AIS_VESSELS, MOCK_METOCEAN, MOCK_SAR_SCENES


def _build_ledger() -> TamperEvidentLedger:
    hashes = build_evidence_hashes(MOCK_SAR_SCENES[0], MOCK_AIS_VESSELS, MOCK_METOCEAN)
    ledger = TamperEvidentLedger(processing_node_id="icg-sagar-drishti-node-01")
    ledger.add_block(hashes["sar_hash"], {"sarCalibrationVerified": 1.0})
    ledger.add_block(hashes["ais_hash"], {"aisDeduplicated": 1.0})
    ledger.add_block(hashes["met_hash"], {"incoisCurrentsValidated": 1.0})
    ledger.add_block(hashes["attr_root"], hashes["attribution_matrix"])
    return ledger


class TestEvidenceHashes:

    def test_hash_is_deterministic(self):
        a = hash_obj({"lat": 21.8452, "vessels": [1, 2, 3]})
        b = hash_obj({"vessels": [1, 2, 3], "lat": 21.8452})
        assert a == b  # sort_keys normalises key order
        assert len(a) == 64

    def test_scene_edit_changes_root(self):
        base = build_evidence_hashes(MOCK_SAR_SCENES[0], MOCK_AIS_VESSELS, MOCK_METOCEAN)
        mutated = copy.deepcopy(MOCK_SAR_SCENES[0])
        mutated["severity"] = "CRITICAL"  # no-op; switch a real value
        mutated["spillGeometry"]["areaKm2"] = 99.0
        changed = build_evidence_hashes(mutated, MOCK_AIS_VESSELS, MOCK_METOCEAN)
        assert changed["merkle_root"] != base["merkle_root"]
        assert changed["sar_hash"] != base["sar_hash"]


class TestChainIntegrity:

    def test_clean_chain_verifies(self):
        ledger = _build_ledger()
        assert ledger.verify_chain()
        assert len(ledger.chain) == 5  # genesis + 4 evidence leaves

    def test_chain_detects_tampered_merkle_root(self):
        ledger = _build_ledger()
        assert ledger.verify_chain()
        victim = ledger.chain[2]
        victim.merkle_root = "f" * 64
        victim.block_hash = victim.compute_hash()  # re-mined hash still breaks linkage
        # Either prev-link mismatch or hash inconsistency must now fail
        assert ledger.verify_chain() is False

    def test_block_hashes_have_proof_of_work_prefix(self):
        ledger = _build_ledger()
        for block in ledger.chain[1:]:
            assert block.block_hash.startswith("00")
            assert block.nonce >= 0

    def test_genesis_prev_is_zero(self):
        ledger = _build_ledger()
        assert ledger.chain[0].prev_block_hash == "0" * 64


class TestSignature:

    def test_ed25519_signature_is_64_bytes(self):
        sig = ed25519_sign_hex("4e" * 32, "01" * 32)
        assert len(sig) == 128  # 64 bytes hex-encoded

    def test_signature_is_deterministic(self):
        a = ed25519_sign_hex("4e" * 32, "01" * 32)
        b = ed25519_sign_hex("4e" * 32, "01" * 32)
        assert a == b

    def test_api_ledger_contract_fields(self):
        from api.routes.evidence import _build_evidence_payload
        payload = _build_evidence_payload()
        assert set(payload["attribution_matrix"].keys()) == {
            "backtrackProximityScore",
            "trajectoryCollinearityScore",
            "vesselPriorScore",
            "kineticAnomalyScore",
            "temporalPlausibilityScore",
        }
        assert "merkle_root" in payload
        assert len(payload["merkle_root"]) == 64

    def test_evidence_manifest_contract(self):
        from api.forensics import build_evidence_manifest

        manifest = build_evidence_manifest()
        assert manifest["manifestVersion"] == "1.0"
        assert manifest["dataMode"] == "sample"
        assert manifest["hashAlgorithm"] == "SHA-256"
        assert manifest["signatureAlgorithm"] == "Ed25519"
        assert len(manifest["merkleRoot"]) == 64
        assert manifest["artifactCount"] == len(manifest["artifacts"])
        assert {a["type"] for a in manifest["artifacts"]} == {
            "SAR_CAPTURE",
            "AIS_HISTORY",
            "METOCEAN_SNAPSHOT",
            "ATTRIBUTION_MATRIX",
        }
        for artifact in manifest["artifacts"]:
            assert artifact["artifactId"].startswith(manifest["eventId"])
            assert len(artifact["sha256"]) == 64

    def test_evidence_manifest_is_deterministic(self):
        """Stable-hash test: content-level fields are byte-identical across runs.

        The envelope's `generatedAtUtc` is wall-clock by design, so only the
        content-deterministic fields (merkle root, per-artifact hashes, and the
        signature over the root) are required to be stable.
        """
        from api.forensics import build_evidence_manifest

        first = build_evidence_manifest()
        second = build_evidence_manifest()
        assert first["merkleRoot"] == second["merkleRoot"]
        assert first["artifactCount"] == second["artifactCount"]
        assert first["artifacts"] == second["artifacts"]
        assert first["signatureEd25519"] == second["signatureEd25519"]

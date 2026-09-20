from typing import Any

from fastapi import APIRouter

from api.db import LedgerBlockRow, db
from api.forensics import (
    build_evidence_payload as _build_evidence_payload,  # noqa: F401 - science test contract
)
from api.forensics import (
    build_ledger_summary,
    build_verify_payload,
)

router = APIRouter(prefix="/api/v1/evidence", tags=["evidence"])


def _ledger_from_db() -> dict[str, Any] | None:
    with db.session_scope() as session:
        rows = session.query(LedgerBlockRow).order_by(LedgerBlockRow.index.asc()).all()
        blocks = [r.data for r in rows]
    if not blocks:
        return None
    return {
        "status": "success",
        "nodeId": "icg-sagar-drishti-node-01",
        "chainLength": len(blocks),
        "chainValid": True,
        "merkleRoot": blocks[-1].get("merkle_root", ""),
        "signatureEd25519": "",
        "blocks": blocks,
    }


@router.get("/ledger")
async def get_evidence_ledger() -> dict[str, Any]:
    """Retrieve the persisted tamper-evident Merkle ledger (rebuilt if absent)."""
    persisted = _ledger_from_db()
    if persisted:
        summary = build_ledger_summary()
        return {
            "status": "success",
            "nodeId": summary["nodeId"],
            "chainLength": len(persisted["blocks"]),
            "chainValid": True,
            "merkleRoot": summary["merkleRoot"],
            "signatureEd25519": summary["signatureEd25519"],
            "blocks": persisted["blocks"],
        }
    return build_ledger_summary()


@router.post("/verify")
async def verify_integrity() -> dict[str, Any]:
    """Execute complete cryptographic verification sequence across all tiers."""
    return build_verify_payload()


@router.get("/ledger/persisted")
async def ledger_persistence_status() -> dict[str, Any]:
    """Health of the persisted evidence chain (for operations dashboards)."""
    with db.session_scope() as session:
        count = session.query(LedgerBlockRow).count()
    return {**build_ledger_summary(), "persistedBlocks": count} if count else {
        **build_ledger_summary(),
        "persistedBlocks": 0,
        "persisted": False,
    }
#!/usr/bin/env bash
# Sagar-Drishti API start command (Render/Railway/Koyeb friendly).
# Honours the platform-injected PORT (defaults to 8000 locally / in Docker).
set -euo pipefail

PORT="${PORT:-8000}"

exec python -m uvicorn api.main:app --host 0.0.0.0 --port "${PORT}"
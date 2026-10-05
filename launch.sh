#!/usr/bin/env bash
set -e

echo "======================================================================"
echo "  ORBITAL TWIN — Spacecraft Digital Twin Launch Sequence"
echo "======================================================================"

python3 -m uvicorn backend.api.main:app --host 0.0.0.0 --port 8000 --reload &
BACKEND_PID=$!

(cd frontend && npm run dev) &
FRONTEND_PID=$!

cleanup() {
    echo "Stopping Orbital Twin services..."
    kill $BACKEND_PID $FRONTEND_PID 2>/dev/null || true
}
trap cleanup EXIT INT TERM

echo ""
echo "Orbital Twin running:"
echo "- Backend:  http://localhost:8000"
echo "- Frontend: http://localhost:5173"
echo "Press Ctrl+C to terminate."

wait

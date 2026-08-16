#!/bin/bash
# Arrêt complet des services ZenAssist (FastAPI + PostgreSQL)

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ZEN_DIR="$ROOT_DIR/zenassist-app"
PGDATA="$ZEN_DIR/pgdata"

echo "=========================================="
echo "    Arrêt des services ZenAssist          "
echo "=========================================="

# 1. Arrêt de FastAPI
if [ -f "$ZEN_DIR/fastapi.pid" ]; then
    PID=$(cat "$ZEN_DIR/fastapi.pid")
    echo "1. Arrêt de l'API FastAPI (PID: $PID)..."
    kill "$PID" 2>/dev/null || true
    rm -f "$ZEN_DIR/fastapi.pid"
fi

# 2. Arrêt de PostgreSQL
echo "2. Arrêt de PostgreSQL..."
/usr/lib/postgresql/16/bin/pg_ctl -D "$PGDATA" stop 2>/dev/null || true

echo "✅ Tous les services sont arrêtés."

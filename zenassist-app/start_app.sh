#!/bin/bash
# Démarrage complet de la plateforme ZenAssist (PostgreSQL + API FastAPI + Next.js)

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ZEN_DIR="$ROOT_DIR/zenassist-app"
PGDATA="$ZEN_DIR/pgdata"

echo "=========================================="
echo "  Démarrage de la plateforme ZenAssist    "
echo "=========================================="

# 1. Démarrage de PostgreSQL
echo "1. Démarrage de PostgreSQL sur le port 5433..."
/usr/lib/postgresql/16/bin/pg_ctl -D "$PGDATA" -o "-p 5433 -k /tmp" -l "$ZEN_DIR/pg.log" start

# 2. Démarrage de l'API Python FastAPI (Port 8000)
echo "2. Démarrage de l'API FastAPI (Modèle ML) sur le port 8000..."
"$ROOT_DIR/.venv/bin/uvicorn" ml_api:app --host 0.0.0.0 --port 8000 > "$ZEN_DIR/fastapi.log" 2>&1 &
echo $! > "$ZEN_DIR/fastapi.pid"
echo "-> API FastAPI lancée (PID: $(cat "$ZEN_DIR/fastapi.pid"))"
echo "-> Documentation Swagger : http://localhost:8000/docs"

# 3. Démarrage de Next.js
echo "3. Lancement du serveur Next.js sur http://localhost:3000..."
echo "-> Appuyez sur Ctrl+C pour arrêter le serveur web"
cd "$ZEN_DIR/javascript" && npm run dev

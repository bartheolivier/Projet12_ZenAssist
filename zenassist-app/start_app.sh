#!/bin/bash
# Démarrage de PostgreSQL et Next.js pour ZenAssist

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PGDATA="$DIR/pgdata"

echo "=========================================="
echo "  Démarrage de la plateforme ZenAssist    "
echo "=========================================="

# 1. Démarrage de PostgreSQL
echo "1. Démarrage de PostgreSQL sur le port 5433..."
/usr/lib/postgresql/16/bin/pg_ctl -D "$PGDATA" -o "-p 5433 -k /tmp" -l "$DIR/pg.log" start

# 2. Démarrage de Next.js
echo "2. Lancement du serveur Next.js..."
echo "-> Rendez-vous sur : http://localhost:3000"
echo "-> Appuyez sur Ctrl+C pour arrêter le serveur Next.js"
cd "$DIR/javascript" && npm run dev

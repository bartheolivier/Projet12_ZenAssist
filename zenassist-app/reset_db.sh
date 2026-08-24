#!/bin/bash
# Réinitialisation de la base de données ZenAssist avec les 100 réclamations vierges

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ZEN_DIR="$ROOT_DIR/zenassist-app"
PGDATA="$ZEN_DIR/pgdata"

echo "=========================================="
echo "  Réinitialisation de la base ZenAssist   "
echo "=========================================="

# 1. Vérifier et nettoyer un éventuel postmaster.pid orphelin après un crash/redémarrage
if [ -f "$PGDATA/postmaster.pid" ]; then
    PID=$(head -n 1 "$PGDATA/postmaster.pid")
    if ! kill -0 "$PID" 2>/dev/null; then
        echo "-> Nettoyage du fichier postmaster.pid obsolète..."
        rm -f "$PGDATA/postmaster.pid"
    fi
fi

# 2. Vérifier si PostgreSQL tourne, sinon le démarrer
if ! /usr/lib/postgresql/16/bin/pg_ctl -D "$PGDATA" status 2>&1 | grep -q "server is running"; then
    echo "-> PostgreSQL n'était pas démarré. Lancement sur le port 5433..."
    /usr/lib/postgresql/16/bin/pg_ctl -D "$PGDATA" -o "-p 5433 -k /tmp" -l "$ZEN_DIR/pg.log" start
    sleep 1
else
    echo "-> PostgreSQL est déjà actif sur le port 5433."
fi

# 3. Exécution du reset SQL
echo "-> Réinitialisation des 100 réclamations en base de données..."
cd "$ZEN_DIR/javascript" && npm run db:reset

echo "=========================================="
echo "✅ Base de données réinitialisée avec succès !"
echo "-> Rafraîchissez votre page web (F5 / Ctrl+R) pour voir toutes les réclamations dans 'Untagged Claims'."
echo "=========================================="

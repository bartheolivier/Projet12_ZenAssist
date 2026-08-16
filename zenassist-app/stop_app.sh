#!/bin/bash
# Arrêt de PostgreSQL pour ZenAssist

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PGDATA="$DIR/pgdata"

echo "Arrêt de PostgreSQL..."
/usr/lib/postgresql/16/bin/pg_ctl -D "$PGDATA" stop
echo "PostgreSQL arrêté avec succès."

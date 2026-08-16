#!/bin/bash
# Réinitialisation de la base de données ZenAssist avec les 10 réclamations vierges

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$DIR/javascript" && npm run db:reset

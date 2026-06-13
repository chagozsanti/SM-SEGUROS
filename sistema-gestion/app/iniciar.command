#!/bin/bash
# Doble clic para iniciar SM Gestión en el Mac
cd "$(dirname "$0")"
export PATH="$HOME/.local/node/bin:$PATH"
echo "Iniciando SM Gestión…"
(sleep 2 && open http://localhost:3477) &
node server.js

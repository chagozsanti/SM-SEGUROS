#!/bin/bash
# Copia el código (sin node_modules ni datos) al disco externo para llevarlo al PC
DESTINO="/Volumes/Extreme SSD/CLAUDE CODE/cotizador-autos/sistema-gestion/app"
mkdir -p "$DESTINO"
rsync -av --delete --exclude node_modules --exclude datos --exclude .git \
  "$HOME/Projects/sm-gestion/" "$DESTINO/"
echo "Sincronizado a $DESTINO"

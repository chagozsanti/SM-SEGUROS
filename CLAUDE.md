# SM Seguros — guía para Claude

Proyecto de una agencia de seguros en Colombia (SM Seguros, Marinilla). Dos frentes:
1. **Sistema de gestión "SM Gestión"** (lo principal hoy): app local Node.js + SQLite que reemplaza a SOFTseguros. Código en `sistema-gestion/app/`.
2. **Cotizador automático** de pólizas de auto vía portales de aseguradoras (`portales/`, `clientes/`, `informes/`).

## ⚠️ Lee esto al iniciar cada sesión

**El estado y la trazabilidad del proyecto viven en [`ESTADO-DEL-PROYECTO.md`](ESTADO-DEL-PROYECTO.md).**
- **Al empezar:** léelo para saber en qué quedó el proyecto.
- **Al terminar un trabajo:** añade una entrada con fecha (sección nueva arriba) describiendo qué se hizo. Es el diario del proyecto y debe quedar al día. Hay un comando `/handoff` que hace exactamente esto — sugiérelo al cerrar la sesión.

## Cómo correr la app

```bash
cd sistema-gestion/app
node server.js     # o doble clic en iniciar.command
```
Abre http://localhost:3477. Node está en `~/.local/node/bin` (no hay Homebrew en este Mac).

## Dónde está cada cosa

- Código del sistema: `sistema-gestion/app/` (server.js + `src/` + `public/`).
- Base de datos real y sesión de WhatsApp: `sistema-gestion/app/datos/` — **en .gitignore, no se versiona** (solo se versiona el código).
- `node_modules/` también en .gitignore (instalar con `npm ci` en `sistema-gestion/app`).
- Mapa funcional de SOFTseguros y plan de IA: `sistema-gestion/`.

## Convenciones de trabajo

- **Correr/editar SIEMPRE desde este repo** (`~/Documents/cotizador-autos`). La antigua copia `~/Projects/sm-gestion` quedó solo como respaldo; no se usa.
- **Flujo git:** ramas + PR a `main` (no push directo a `main`). `gh` está en `~/.local/bin/gh`, autenticado como `chagozsanti`. Remoto: `chagozsanti/SM-SEGUROS`.
- Las páginas de login de portales externos las hace el usuario; Claude no guarda contraseñas.

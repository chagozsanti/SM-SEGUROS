@echo off
rem Doble clic para iniciar SM Gestion en Windows (requiere Node.js instalado: nodejs.org)
cd /d "%~dp0"
start "" "http://localhost:3477"
node server.js
pause

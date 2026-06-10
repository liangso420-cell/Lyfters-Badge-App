#!/usr/bin/env bash
# ============================================================
#  Lyfter Badge App - Arranque local (Git Bash / macOS / Linux)
#  Levanta backend y frontend; Ctrl+C detiene ambos.
# ============================================================
set -e
cd "$(dirname "$0")"

if [ ! -d "backend/.venv" ]; then
  echo "[ERROR] No existe backend/.venv. Ejecuta primero ./setup.sh"
  exit 1
fi
if [ ! -f "backend/.env" ]; then
  echo "[ERROR] Falta backend/.env. Copialo de .env.example y configuralo."
  exit 1
fi

# Detener ambos procesos al salir
trap 'kill 0' EXIT

echo "Iniciando BACKEND  -> http://localhost:5000"
(
  cd backend
  if [ -f ".venv/Scripts/activate" ]; then source .venv/Scripts/activate; else source .venv/bin/activate; fi
  python app.py
) &

echo "Iniciando FRONTEND -> http://localhost:5173"
(
  cd frontend
  NODE_OPTIONS=--use-system-ca npm run dev
) &

wait

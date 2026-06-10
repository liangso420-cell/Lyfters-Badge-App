#!/usr/bin/env bash
# ============================================================
#  Lyfter Badge App - Setup automatico (Git Bash / macOS / Linux)
# ============================================================
set -e
cd "$(dirname "$0")"

echo "=== Verificando Python ==="
if ! command -v python >/dev/null 2>&1; then
  echo "[ERROR] Python no esta instalado o no esta en el PATH."
  echo "        Instalalo con: winget install -e --id Python.Python.3.12"
  exit 1
fi
python --version

echo "=== Backend: entorno virtual + dependencias ==="
cd backend
[ -d ".venv" ] || python -m venv .venv
# Activacion segun plataforma
if [ -f ".venv/Scripts/activate" ]; then source .venv/Scripts/activate; else source .venv/bin/activate; fi
python -m pip install --upgrade pip
pip install -r requirements.txt
if [ ! -f ".env" ]; then
  cp .env.example .env
  echo "[AVISO] Se creo backend/.env desde el ejemplo. EDITALO con tu MONGO_URI y JWT_SECRET."
fi
deactivate
cd ..

echo "=== Frontend: dependencias npm ==="
cd frontend
NODE_OPTIONS=--use-system-ca npm install
[ -f ".env" ] || cp .env.example .env
cd ..

echo ""
echo "=== Setup completo ==="
echo " 1) Edita backend/.env con tu MONGO_URI y JWT_SECRET."
echo " 2) (Opcional) datos demo:  cd backend && source .venv/Scripts/activate && python seed.py"
echo " 3) Arranca todo con:  ./run-local.sh"

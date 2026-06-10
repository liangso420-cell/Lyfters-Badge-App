@echo off
REM ============================================================
REM  Lyfter Badge App - Setup automatico (Windows)
REM  Crea venv, instala dependencias y copia los .env
REM ============================================================
setlocal
cd /d "%~dp0"

echo.
echo === Verificando Python ===
python --version >nul 2>&1
if errorlevel 1 (
  echo [ERROR] Python no esta instalado o no esta en el PATH.
  echo         Instalalo con: winget install -e --id Python.Python.3.12
  echo         Luego reabre esta terminal y vuelve a ejecutar setup.bat
  pause
  exit /b 1
)

echo.
echo === Backend: entorno virtual + dependencias ===
cd backend
if not exist ".venv" (
  python -m venv .venv
)
call .venv\Scripts\activate.bat
python -m pip install --upgrade pip
pip install -r requirements.txt
if not exist ".env" (
  copy .env.example .env >nul
  echo [AVISO] Se creo backend\.env desde el ejemplo. EDITALO con tu MONGO_URI y JWT_SECRET.
)
call deactivate
cd ..

echo.
echo === Frontend: dependencias npm ===
cd frontend
set NODE_OPTIONS=--use-system-ca
call npm install
if not exist ".env" (
  copy .env.example .env >nul
  echo [AVISO] Se creo frontend\.env desde el ejemplo.
)
cd ..

echo.
echo === Setup completo ===
echo  1) Edita backend\.env con tu MONGO_URI (MongoDB Atlas) y JWT_SECRET.
echo  2) (Opcional) Carga datos demo:  cd backend ^&^& .venv\Scripts\activate ^&^& python seed.py
echo  3) Arranca todo con:  run-local.bat
echo.
pause
endlocal

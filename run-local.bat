@echo off
REM ============================================================
REM  Lyfter Badge App - Arranque local (Windows)
REM  Levanta backend (Flask) y frontend (Vite) en ventanas separadas
REM ============================================================
setlocal
cd /d "%~dp0"

if not exist "backend\.venv" (
  echo [ERROR] No existe backend\.venv. Ejecuta primero setup.bat
  pause
  exit /b 1
)
if not exist "backend\.env" (
  echo [ERROR] Falta backend\.env. Copialo de .env.example y configuralo.
  pause
  exit /b 1
)

echo Iniciando BACKEND (http://localhost:5000)...
start "Lyfter Backend" cmd /k "cd /d %~dp0backend && call .venv\Scripts\activate.bat && python app.py"

echo Iniciando FRONTEND (http://localhost:5173)...
start "Lyfter Frontend" cmd /k "cd /d %~dp0frontend && set NODE_OPTIONS=--use-system-ca && npm run dev"

echo.
echo Ambos servicios arrancando en ventanas separadas.
echo  - API:      http://localhost:5000
echo  - Frontend: http://localhost:5173
echo.
echo Cierra las ventanas "Lyfter Backend" / "Lyfter Frontend" para detenerlos.
endlocal

# Guía de instalación y ejecución local (Windows)

Esta guía te lleva de cero a tener la **Lyfter Badge App** corriendo en tu PC.
Tiempo estimado: 20–30 min.

---

## 0. Resumen de lo que instalaremos
| Componente | Para qué | Cómo |
|------------|----------|------|
| Python 3.10+ | Correr el backend Flask | python.org o `winget` |
| Node.js 18+ | Correr el frontend Vue | Ya lo tienes (v24) ✅ |
| MongoDB | Base de datos | **Atlas (nube, recomendado)** o local |

---

## 1. Instalar Python

### Opción A — winget (rápida, recomendada)
Abre **PowerShell** y ejecuta:
```powershell
winget install -e --id Python.Python.3.12
```
Cierra y vuelve a abrir la terminal. Verifica:
```bash
python --version    # debe mostrar Python 3.12.x
```

### Opción B — instalador manual
1. Descarga desde https://www.python.org/downloads/windows/
2. **IMPORTANTE:** en el instalador marca ✅ **"Add python.exe to PATH"**.
3. Instala y reabre la terminal.

> Si `python` sigue abriendo la Microsoft Store: ve a *Configuración → Aplicaciones
> → Configuración avanzada → Alias de ejecución de aplicaciones* y **desactiva**
> los alias `python.exe` / `python3.exe`.

---

## 2. Configurar MongoDB

### Opción A — MongoDB Atlas (nube, gratis, recomendada)
1. Crea una cuenta en https://www.mongodb.com/cloud/atlas/register
2. Crea un **cluster gratuito (M0)**.
3. En **Database Access** → crea un usuario/contraseña.
4. En **Network Access** → *Add IP Address* → **Allow access from anywhere**
   (`0.0.0.0/0`) para desarrollo.
5. En **Connect → Drivers** copia la cadena de conexión, queda como:
   ```
   mongodb+srv://USUARIO:PASSWORD@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
   ```
   Esa cadena es tu `MONGO_URI`.

### Opción B — MongoDB local
```powershell
winget install -e --id MongoDB.Server
```
Tu `MONGO_URI` será: `mongodb://localhost:27017/`

---

## 3. Configurar y correr el BACKEND

```bash
cd C:/Users/javie/lyfter-badge-app/backend

# 1. Crear entorno virtual
python -m venv .venv

# 2. Activarlo (Git Bash)
source .venv/Scripts/activate
#   (PowerShell:  .venv\Scripts\Activate.ps1 )
#   (CMD:         .venv\Scripts\activate.bat )

# 3. Instalar dependencias
pip install -r requirements.txt

# 4. Crear el archivo .env a partir del ejemplo
cp .env.example .env
```

Edita `backend/.env` y completa al menos:
```
MONGO_URI=<tu cadena de conexión del paso 2>
JWT_SECRET=<una frase larga y aleatoria>
FRONTEND_URL=http://localhost:5173
CORS_ORIGINS=http://localhost:5173
```

Carga datos de prueba y arranca:
```bash
python seed.py     # crea admin@lyfter.cc / admin123 + evento + 8 badges
python app.py      # API en http://localhost:5000
```
Deja esta terminal abierta.

---

## 4. Configurar y correr el FRONTEND

Abre **otra** terminal:
```bash
cd C:/Users/javie/lyfter-badge-app/frontend

# Instalar dependencias
#  ⚠️ Si tu red usa inspección SSL (error UNABLE_TO_VERIFY_LEAF_SIGNATURE),
#     antepón NODE_OPTIONS=--use-system-ca como abajo:
NODE_OPTIONS=--use-system-ca npm install

# Crear .env
cp .env.example .env      # VITE_API_URL=http://localhost:5000

# Arrancar
npm run dev               # App en http://localhost:5173
```

---

## 5. Probar el flujo completo (E2E)
1. Abre http://localhost:5173 → entra como **admin@lyfter.cc / admin123**.
2. Como admin verás los eventos → entra a **Badges** → cada badge tiene su QR
   (botón "Descargar QR").
3. En otra ventana (o incógnito) **regístrate como participante**.
4. Abre el QR de un badge (o navega a la URL `/redeem/<event>/<token>` que muestra
   el panel) → deberías ver el **modal de celebración** y el badge en tu perfil.
5. Repite hasta completar los 8 → se **revela el premio** 🎉.
6. Vuelve al panel admin → **Seguimiento** muestra los canjeados por badge.

---

## 6. Problemas frecuentes
| Síntoma | Solución |
|---------|----------|
| `python` abre la Store | Desactiva los alias de ejecución (ver paso 1). |
| `npm install` falla con certificado | Usa `NODE_OPTIONS=--use-system-ca npm install`. |
| `pymongo … ServerSelectionTimeoutError` | Revisa `MONGO_URI` y que tu IP esté permitida en Atlas (Network Access). |
| CORS bloqueado en el navegador | Asegúrate que `CORS_ORIGINS` incluya `http://localhost:5173`. |
| La cámara no abre el escáner | El navegador exige HTTPS o `localhost`; usa `localhost`, no la IP. |

---

## 7. Atajos con scripts
En la raíz del proyecto hay scripts que automatizan los pasos 3 y 4:
- `setup.bat` — crea el venv, instala dependencias de backend y frontend, copia los `.env`.
- `run-local.bat` — levanta backend y frontend a la vez.

Ejecuta desde la carpeta raíz (doble clic o en terminal):
```bash
./setup.bat
./run-local.bat
```

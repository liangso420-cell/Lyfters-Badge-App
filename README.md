# Lyfter Badge App

App de gamificación con badges para eventos. Los participantes escanean QRs para coleccionar badges y desbloquear premios sorpresa.

- **Backend**: Python (Flask) + MongoDB — deployado en [Render](https://render.com)
- **Frontend**: HTML + CSS + JS puro — deployado en [Vercel](https://vercel.com)

## Estructura del repositorio

```
lyfters-badge-app/
├── backend/
│   ├── app.py              API Flask (auth, eventos, badges, redención)
│   ├── db.py               Conexión MongoDB (patrón singleton)
│   ├── requirements.txt    Dependencias Python
│   ├── Procfile            Comando de arranque para Render (gunicorn)
│   └── .env.example        Plantilla de variables de entorno
├── db/
│   └── seed.js             Script MongoDB Shell para inicializar la BD
├── docs/
│   ├── 01-prd.md
│   ├── 02-diseno-tecnico.md
│   └── 03-tareas.md
├── css/styles.css          Estilos propios del frontend
├── js/
│   ├── config.js           Modo de datos y URL del backend
│   ├── api.js              Capa de datos (mock localStorage + cliente Flask)
│   └── app.js              Router + vistas + interactividad
├── assets/                 Recursos estáticos
├── index.html              SPA principal + CDNs (Tailwind, DaisyUI, Poppins)
├── vercel.json             Rewrite para SPA en Vercel
├── render.yaml             Configuración de deploy del backend en Render
└── .gitignore
```

## Cómo correr localmente

### Backend (Flask)

```bash
cd backend
python -m venv .venv
source .venv/bin/activate      # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env           # completar con valores reales
python app.py                  # API en http://localhost:5000
```

### Frontend

Sirve la raíz del repositorio por HTTP (no `file://` para que CORS funcione):

```bash
python -m http.server 5500     # abre http://localhost:5500
```

O con Live Server de VS Code apuntando a la raíz del repo.

### Modo mock (sin backend)

Cambia `mode` en `js/config.js` a `'mock'`. La app funciona en el navegador con datos simulados en `localStorage`, sin necesidad de servidor.

Cuentas de demo en modo mock:

| Rol | Email | Contraseña |
|-----|-------|------------|
| Admin | `admin@lyfter.cc` | `admin123` |
| Participante | `ana@correo.com` | `ana123` |

## Variables de entorno (backend)

Copia `backend/.env.example` a `backend/.env` y completa los valores:

| Variable | Descripción | Ejemplo local |
|----------|-------------|---------------|
| `MONGO_URI` | URI de conexión a MongoDB | `mongodb://localhost:27017` |
| `JWT_SECRET` | Clave secreta para firmar tokens JWT | cadena aleatoria larga |
| `PORT` | Puerto del servidor (Render lo inyecta automáticamente) | `5000` |
| `FLASK_ENV` | `development` activa debug; `production` lo desactiva | `development` |
| `CORS_ORIGINS` | Orígenes permitidos separados por coma | `http://localhost:5500` |
| `APP_BASE_URL` | URL base del backend (se usa para generar los QR) | `http://localhost:5000` |

**Nunca comitas el archivo `.env` — solo `.env.example`.**

## URLs de producción

| Servicio | URL |
|----------|-----|
| Backend (Render) | `https://lyfters-badge-app.onrender.com` |
| Frontend (Vercel) | raíz del repositorio (sin subdirectorio) |

## Deployment

### 1 — MongoDB Atlas

1. Crear cluster gratuito en [cloud.mongodb.com](https://cloud.mongodb.com).
2. En **Database Access** crear un usuario con contraseña.
3. En **Network Access** agregar `0.0.0.0/0` (o el IP de Render).
4. Copiar el **Connection String** (formato `mongodb+srv://user:pass@cluster.mongodb.net/lyfter_db`).

### 2 — Backend en Render

1. Crear un nuevo **Web Service** apuntando a este repositorio.
2. Configurar:
   - **Root Directory**: `backend`
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `gunicorn app:app`
3. En **Environment Variables** agregar:

   | Variable | Valor |
   |----------|-------|
   | `MONGO_URI` | Connection string de Atlas |
   | `MONGO_DB_NAME` | `lyfter_db` |
   | `JWT_SECRET` | Cadena aleatoria larga (ej: `openssl rand -hex 32`) |
   | `CORS_ORIGINS` | URL de Vercel (ej: `https://tu-app.vercel.app`) |
   | `APP_BASE_URL` | URL de Vercel (misma que CORS_ORIGINS) |

4. Deployar. La URL del servicio queda como `https://tu-backend.onrender.com`.

### 3 — Frontend en Vercel

1. Importar el repositorio en [vercel.com](https://vercel.com).
2. Dejar la configuración por defecto (directorio raíz `/`).
3. Vercel detecta automáticamente el `vercel.json`.
4. En `js/config.js` verificar que `apiBaseUrl` apunte al backend de Render.
5. Deployar.

### 4 — Verificar en producción

```bash
# Health check del backend
curl https://tu-backend.onrender.com/health

# Debería retornar: {"service":"lyfter-badge-api","status":"ok"}
```

Luego ejecutar el flujo completo: registro → login → escanear QR → ver perfil.

---

### Deploy — Render (archivo render.yaml)

El archivo `render.yaml` configura el servicio con `rootDir: backend`. Variables como `MONGO_URI` y `CORS_ORIGINS` se ingresan manualmente en el dashboard de Render.

### Deploy — Vercel

Vercel despliega desde la raíz del repositorio. El archivo `vercel.json` incluye el rewrite necesario para la SPA (`/* → /index.html`).

## Inicializar la base de datos (opcional)

El script `db/seed.js` es para MongoDB Shell (`mongosh`) y crea colecciones con validación de esquema, índices y datos de prueba:

```bash
mongosh "tu-mongo-uri" db/seed.js
```

## Vistas de la app

| Hash | Vista |
|------|-------|
| `#/login` | Login |
| `#/register` | Registro |
| `#/profile` | Perfil del participante (progreso + badges) |
| `#/scan` | Escáner QR |
| `#/admin/event` | Crear evento (admin) |
| `#/admin/badges` | Gestión de badges + QR (admin) |
| `#/admin/participation` | Seguimiento de participación (admin) |

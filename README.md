# 🏆 Lyfter Badge App

App de gamificación para eventos presenciales: los asistentes escanean códigos
QR físicos repartidos por el evento, coleccionan badges y, al completarlos todos,
desbloquean un premio sorpresa. Los administradores crean eventos, generan los QR
y monitorean la participación.

## Stack
- **Backend:** Flask + JWT + MongoDB (PyMongo) + qrcode
- **Frontend:** Vue 3 + Vue Router + Pinia + Tailwind CSS + DaisyUI + html5-qrcode
- **Deploy:** Render (backend) · Vercel (frontend) · MongoDB Atlas (BD)

## Estructura
```
lyfter-badge-app/
├── backend/      API REST Flask
├── frontend/     SPA Vue
├── documentos/   PRD, diseño técnico y tareas
└── diseño-previo.html   Prototipo visual de referencia
```

## Requisitos
- Python 3.10+
- Node.js 18+
- Una base de datos MongoDB (local o MongoDB Atlas)

## Setup local

### 1. Backend
```bash
cd backend
python -m venv .venv
# Windows: .venv\Scripts\activate   |   macOS/Linux: source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env        # completa MONGO_URI, JWT_SECRET, FRONTEND_URL, CORS_ORIGINS
python seed.py              # (opcional) carga admin + evento + badges de prueba
python app.py               # API en http://localhost:5000
```

Credenciales de prueba tras `seed.py`: **admin@lyfter.cc** / **admin123**

### 2. Frontend
```bash
cd frontend
npm install
cp .env.example .env        # VITE_API_URL=http://localhost:5000
npm run dev                 # App en http://localhost:5173
```

## Flujo de uso
1. **Admin** inicia sesión → crea un evento → agrega badges (se genera UUID + QR
   descargable) → imprime y coloca los QR en el evento.
2. **Participante** se registra/inicia sesión → escanea un QR → recibe el badge
   (modal de celebración) → al completar todos, se revela el premio.
3. Si el participante escanea sin sesión, se le redirige a login y la redención
   continúa automáticamente tras autenticarse.

## Endpoints principales
| Método | Ruta | Acceso |
|--------|------|--------|
| POST | `/auth/register` | público |
| POST | `/auth/login` | público |
| POST | `/redeem/<event_id>/<token>` | participante |
| GET | `/events/` · `/events/<id>` | participante |
| GET | `/me/badges` | participante |
| POST | `/admin/event` | admin |
| POST | `/admin/events/<id>/badge` | admin |
| GET | `/admin/events/<id>/badges` | admin |

## Deploy

### Backend → Render
- Crea un *Web Service* apuntando a la carpeta `backend/` (incluye `render.yaml`).
- Build: `pip install -r requirements.txt` · Start: `gunicorn app:app`.
- Variables de entorno: `MONGO_URI`, `MONGO_DB`, `JWT_SECRET`, `JWT_EXP_HOURS`,
  `FRONTEND_URL` (dominio de Vercel), `CORS_ORIGINS` (dominio de Vercel).

### Frontend → Vercel
- Importa la carpeta `frontend/`. Build: `npm run build` · Output: `dist`.
- Variable de entorno: `VITE_API_URL` = dominio del backend en Render.
- `vercel.json` ya reescribe todas las rutas a `index.html` (SPA history mode),
  necesario para que `/redeem/...` y `/profile` funcionen al recargar.

> ⚠️ El contenido del QR usa `FRONTEND_URL`. Tras desplegar, verifica que los QR
> generados apunten al dominio de producción de Vercel.

## Documentación
- `documentos/01-prd.md` — requisitos del producto
- `documentos/02-diseno-tecnico.md` — arquitectura, modelo de datos, endpoints
- `documentos/03-tareas.md` — desglose de tareas T01–T57

# Lyfter Badge App

App de gamificación con badges para eventos. Los participantes escanean QRs para coleccionar badges, ganar XP, desbloquear logros y competir en el ranking.

- **Backend**: Python (Flask 3) + MongoDB — deployado en [Render](https://render.com)
- **Frontend**: HTML + CSS + JS vanilla (Tailwind, DaisyUI) — deployado en [GitHub Pages](https://pages.github.com)
- **Auth**: JWT (sesión) + Firebase/Google OAuth (login social)
- **Email**: Resend (reset de contraseña), SendGrid (invitaciones de workspace)

## URLs de producción

| Servicio | URL |
|----------|-----|
| Frontend (GitHub Pages) | `https://liangso420-cell.github.io/Lyfters-Badge-App` |
| Backend (Render) | `https://lyfters-badge-app.onrender.com` |
| DB (MongoDB Atlas) | cluster `lyfter_db` |

## Estructura del repositorio

```
lyfters-badge-app/
├── backend/
│   ├── app.py                  Entrada Flask: blueprints, CORS, JWTManager
│   ├── db.py                   Conexión PyMongo + init_indexes()
│   ├── utils.py                Helpers compartidos (serialize, QR, decoradores)
│   ├── routes/
│   │   ├── auth.py             /auth/* — registro, login, perfil, Google OAuth
│   │   ├── events.py           /events/* y /leaderboard
│   │   ├── admin.py            /admin/* — gestión de eventos, badges, usuarios
│   │   ├── redeem.py           /redeem/<event_id>/<token>
│   │   ├── xp.py               /profile/xp y /profile/achievements
│   │   └── workspaces.py       /workspaces/* — sistema multi-tenant
│   ├── services/
│   │   ├── achievements.py     Evaluación y grant de logros
│   │   └── xp.py               Cálculo de nivel y progreso
│   ├── security/
│   │   ├── limiter.py          Rate limiting (flask-limiter + Redis)
│   │   ├── ip_guard.py         Validación de IP por cuenta
│   │   └── middleware.py       init_security()
│   ├── requirements.txt
│   ├── Procfile                gunicorn app:app
│   └── .env.example
├── frontend/
│   ├── index.html              Hub del participante
│   ├── landing.html            Página de inicio pública
│   ├── login.html / register.html / reset-password.html
│   ├── profile.html            Perfil del participante (explorar)
│   ├── profile-new.html        Mi perfil (detalle)
│   ├── profile-achievements.html / profile-activity.html
│   ├── profile-reviews.html / profile-stats.html
│   ├── events.html             Lista de eventos
│   ├── event-detail.html       Detalle de evento + badges
│   ├── event-stats.html        Estadísticas del evento
│   ├── scan.html               Escáner QR (cámara)
│   ├── redeem.html             Canjeo de badge por URL
│   ├── join.html               Unirse a evento por QR de acceso
│   ├── leaderboard.html        Ranking global
│   ├── reviews.html / stats.html
│   ├── workspace.html / workspace-create.html
│   ├── workspace-edit.html / workspace-select.html
│   ├── admin-event.html        Lista de eventos (admin)
│   ├── admin-event-create.html / admin-event-detail.html
│   ├── admin-participation.html  Dashboard admin
│   ├── admin-leaderboard.html / admin-reviews.html
│   ├── gestion-usuarios.html   Gestión de usuarios (superadmin)
│   ├── user-achievements.html / user-events.html / user-ranking.html
│   ├── privacy.html / terms.html
│   ├── js/
│   │   ├── config.js           mode ('mock'|'backend') + URLs
│   │   ├── api.js              window.LyfterAPI — cliente HTTP + mock
│   │   ├── utils.js            window.LyfterUtils — UI helpers, i18n, toasts
│   │   ├── pato-celebrate.js   Animación Lottie de celebración
│   │   └── stars.js / particles.js
│   ├── locales/                Traducciones: es, en, de, fr, pt
│   └── assets/
│       └── icons/              Iconos UI y badges de logros
├── db/
│   └── seed.js                 Script MongoDB Shell (datos de prueba)
├── docs/
│   ├── 01-prd.md
│   ├── 02-diseno-tecnico.md
│   ├── 03-tareas.md
│   └── 04-resumen-implementacion.md
├── .github/
│   └── workflows/deploy.yml    CI/CD → GitHub Pages
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

Sirve la carpeta `frontend/` por HTTP (no `file://` para que CORS funcione):

```bash
python -m http.server 5500 --directory frontend
# abre http://localhost:5500
```

O con Live Server de VS Code apuntando a `frontend/`.

### Modo mock (sin backend)

Cambia `mode` en `frontend/js/config.js` a `'mock'`. La app funciona en el navegador con datos simulados en `localStorage`, sin necesidad de servidor.

Cuentas de demo en modo mock:

| Rol | Email | Contraseña |
|-----|-------|------------|
| Admin | `admin@lyfter.cc` | `admin123` |
| Participante | `ana@correo.com` | `ana123` |

## Variables de entorno (backend)

Copia `backend/.env.example` a `backend/.env` y completa los valores:

| Variable | Descripción |
|----------|-------------|
| `MONGO_URI` | URI de conexión a MongoDB Atlas |
| `JWT_SECRET` | Clave secreta para firmar tokens JWT (mín. 32 chars) |
| `PORT` | Puerto del servidor (Render lo inyecta automáticamente) |
| `FLASK_ENV` | `development` desactiva rate limiting e IP guard; `production` los activa |
| `CORS_ORIGINS` | Orígenes permitidos separados por coma |
| `REDIS_URL` | URL Redis para rate limiting en producción (Upstash recomendado) |
| `APP_BASE_URL` | URL base del **frontend** (los QR apuntan aquí) |
| `FRONTEND_URL` | URL del frontend para links en emails |
| `RESEND_API_KEY` | Key de Resend para reset de contraseña |
| `SENDGRID_API_KEY` | Key de SendGrid para invitaciones de workspace |
| `FROM_EMAIL` | Remitente de emails (`noreply@lyfter.app`) |
| `FIREBASE_CLIENT_ID` | Web Client ID de Google OAuth para verificar idTokens de Firebase |

**Nunca comitas el archivo `.env` — solo `.env.example`.**

## Deployment

### 1 — MongoDB Atlas

1. Crear cluster gratuito en [cloud.mongodb.com](https://cloud.mongodb.com).
2. En **Database Access** crear un usuario con contraseña.
3. En **Network Access** agregar `0.0.0.0/0` (o el IP de Render).
4. Copiar el **Connection String** (`mongodb+srv://user:pass@cluster.mongodb.net/lyfter_db`).

### 2 — Redis (rate limiting en producción)

Crear una instancia gratuita en [Upstash](https://upstash.com) y copiar la URL Redis. Sin Redis, el rate limiting usa memoria local (no persiste entre workers).

### 3 — Backend en Render

1. Crear un nuevo **Web Service** apuntando a este repositorio.
2. Configurar:
   - **Root Directory**: `backend`
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `gunicorn app:app`
3. En **Environment Variables** agregar todas las variables del `.env.example`.
4. Deployar. La URL queda como `https://tu-backend.onrender.com`.

### 4 — Frontend en GitHub Pages

El workflow `.github/workflows/deploy.yml` despliega automáticamente la carpeta `frontend/` a GitHub Pages en cada push a `main`.

Para configurar manualmente:
1. Ir a **Settings → Pages** del repositorio.
2. Source: **GitHub Actions**.
3. Verificar que `frontend/js/config.js` tenga `apiBaseUrl` apuntando al backend de Render.

### 5 — Verificar en producción

```bash
# Health check del backend
curl https://lyfters-badge-app.onrender.com/health
# Debería retornar: {"service":"lyfter-badge-api","status":"ok"}
```

Luego ejecutar el flujo completo: registro → login → unirse a evento → escanear QR → ver perfil.

## Inicializar la base de datos (opcional)

El script `db/seed.js` es para MongoDB Shell (`mongosh`) y crea datos de prueba:

```bash
mongosh "tu-mongo-uri" db/seed.js
```

## Seguridad — Firebase API Key

Las Firebase Web API Keys son **públicas por diseño** — la seguridad real opera en dos capas:

**1. Firebase Security Rules** — acceso a Firestore bloqueado completamente (la app usa MongoDB, no Firestore).

**2. Restricción de API Key por HTTP referrer** (Google Cloud Console → APIs & Services → Credentials):

| Configuración | Valor |
|---------------|-------|
| Application restrictions | HTTP referrers |
| Dominios autorizados | `https://liangso420-cell.github.io/*` |
| | `https://lyfters-badge-app.vercel.app/*` |
| | `http://localhost:*` |
| API restrictions | Identity Toolkit API |

## Roles de usuario

| Rol | Descripción |
|-----|-------------|
| `participant` | Participante de eventos — escanea QRs, gana XP, ve ranking |
| `admin` | Gestiona eventos y badges de su workspace |
| `superadmin` | Admin con acceso a gestión de usuarios del workspace |
| `god_admin` | Acceso total a todos los workspaces y la plataforma |

## Sistema de XP y logros

Los participantes ganan XP al canjear badges. Cada evento puede configurar:
- `xp_first_scan` — XP por el primer badge del evento
- `xp_rare_bonus` — XP extra por badges raros (`is_rare: true`)
- `xp_completion_bonus` — XP por completar todos los badges del evento

**Niveles:** Explorador (0 XP) → Coleccionista (100) → Maestro badge (300) → Leyenda Lyfter (600)

**Logros:** 10 logros implementados (Primer paso, Coleccionista, Gran Coleccionista, Vértigo, Completista, Perfeccionista, Viajero, Veterano, Ojo de halcón, Leyenda).

## Internacionalización

La UI soporta 5 idiomas: español (default), inglés, alemán, francés, portugués. Los archivos de traducción están en `frontend/locales/`.

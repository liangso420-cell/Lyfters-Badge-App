# Diseño Técnico — Lyfter Badge App
**Versión:** 3.0
**Última actualización:** Junio 2026

---

## 1. Arquitectura general

```
┌──────────────────────────────────────────────────────────────┐
│        Frontend (HTML + JS vanilla + Tailwind + DaisyUI)     │
│  Auth | Perfil | Eventos | Scan | Admin | Workspaces | XP    │
├──────────────────────────────────────────────────────────────┤
│           API REST (Flask 3 + flask-jwt-extended)            │
│  Auth | Events | Badges | Redeem | Admin | XP | Workspaces   │
├──────────────────────────────────────────────────────────────┤
│              Base de datos (MongoDB Atlas — lyfter_db)        │
│  users | events | badges | scans | event_joins | achievements │
│  user_achievements | xp_log | workspaces | workspace_members  │
│  invitations | reviews                                        │
└──────────────────────────────────────────────────────────────┘
```

**Deploy:**
- Frontend → GitHub Pages (`.github/workflows/deploy.yml` despliega `frontend/`)
- Backend  → Render (`backend/`, start: `gunicorn app:app`)
- DB       → MongoDB Atlas
- Rate limiting → Redis (Upstash en producción)

El frontend (HTML + JS vanilla) consume la API REST de Flask vía HTTP con un
token JWT en el header `Authorization: Bearer <token>`. Flask valida el token y
el rol usando `flask-jwt-extended`, opera sobre MongoDB mediante PyMongo y
responde JSON. Auth social usa Firebase SDK en el cliente; el backend verifica
el idToken con `google-auth`.

---

## 2. Estructura de carpetas

```
lyfter-badge-app/
├── backend/
│   ├── app.py               ← entrada Flask: blueprints, CORS, JWTManager, ProxyFix
│   ├── db.py                ← conexión PyMongo + init_indexes() (12 colecciones)
│   ├── utils.py             ← helpers: serialize_doc, generate_qr_base64, require_admin, fmt_*
│   ├── routes/
│   │   ├── auth.py          ← /auth/* (registro, login, Google OAuth, perfil, reset-password)
│   │   ├── events.py        ← /events/* + /leaderboard (blueprint separado)
│   │   ├── admin.py         ← /admin/* (eventos, badges, usuarios, dashboard, stats)
│   │   ├── redeem.py        ← /redeem/<event_id>/<token>
│   │   ├── xp.py            ← /profile/xp y /profile/achievements
│   │   └── workspaces.py   ← /workspaces/* (multi-tenant, invitaciones, bans)
│   ├── services/
│   │   ├── achievements.py  ← evaluación y grant de logros
│   │   └── xp.py            ← cálculo de nivel y progreso
│   ├── security/
│   │   ├── limiter.py       ← rate limits por ruta (flask-limiter + Redis)
│   │   ├── ip_guard.py      ← validación de IP anclada por cuenta
│   │   └── middleware.py    ← init_security() — no-op en development
│   ├── requirements.txt
│   ├── Procfile             ← gunicorn app:app
│   └── .env.example
├── frontend/
│   ├── *.html               ← 38 páginas HTML independientes
│   ├── js/
│   │   ├── config.js        ← mode ('mock'|'backend') + apiBaseUrl + Firebase config
│   │   ├── api.js           ← window.LyfterAPI (mock + backend para todos los métodos)
│   │   ├── utils.js         ← window.LyfterUtils (toast, confirm, i18n, XP, badges)
│   │   ├── pato-celebrate.js← animación Lottie del pato celebrando
│   │   └── stars.js / particles.js
│   ├── locales/             ← i18n: es.json, en.json, de.json, fr.json, pt.json
│   └── assets/
│       └── icons/           ← iconos UI + imágenes de logros (PNG/WebP)
├── db/
│   └── seed.js              ← MongoDB Shell: 1 admin, 3 participantes, 2 eventos, 5 badges
├── docs/
└── .github/
    └── workflows/deploy.yml ← push a main → GitHub Pages desde frontend/
```

---

## 3. Decisiones de tecnología

- **Flask 3 + flask-jwt-extended**: blueprints por dominio, decoradores JWT con claims de rol y workspace, re-emisión limpia del token via `/auth/refresh-token`.
- **JWT con claims extendidos**: el token lleva `role`, `name`, `workspace_id`, `workspace_role` para evitar consultas a la BD en cada request.
- **MongoDB**: documentos flexibles; cada evento define sus propios badges, XP config y tags sin schema rígido.
- **PyMongo**: operaciones CRUD directas; índices únicos compuestos como barrera real contra race conditions.
- **HTML + JS vanilla**: sin framework — cada página es un HTML independiente que importa `api.js` y `utils.js`. Más simple de mantener para un equipo pequeño y se despliega directo a GitHub Pages sin build step.
- **Tailwind + DaisyUI vía CDN**: estilos utilitarios + componentes listos; sin proceso de compilación.
- **Firebase SDK en el cliente + google-auth en el backend**: el flujo Google OAuth no requiere ningún servidor de auth propio — el idToken de Firebase se verifica en el backend y se intercambia por un JWT propio.
- **flask-limiter + Redis**: rate limiting persistente entre workers de gunicorn; degradación elegante a memoria local si Redis no está disponible.
- **qrcode[pil]**: genera PNG del QR en el backend → guardado como base64 en MongoDB. El QR apunta a `APP_BASE_URL/redeem/<event_id>/<token>`.
- **jsQR**: escaneo de cámara en el cliente (`getUserMedia` + canvas oculto para que funcione en móvil).
- **Resend + SendGrid**: emails de reset de contraseña e invitaciones de workspace respectivamente.

---

## 4. Modelo de datos (MongoDB)

### Colecciones y campos principales

```js
// users
{
  _id: ObjectId,
  name: "string",
  email: "string",            // único
  password: "bcrypt hash",    // null si registro con Google
  role: "participant" | "admin" | "superadmin" | "god_admin",
  avatar: "base64 string",    // opcional
  interests: ["tag"],         // para recomendaciones
  privacy: { show_in_leaderboard: bool, show_badges: bool },
  banned_until: Date,         // null = no baneado; año >= 9999 = permanente
  ban_reason: "string",
  anchored_ip: "string",      // IP de registro (IP guard)
  reset_token: "string",      // token reset-password (TTL 1h)
  reset_token_exp: Date,
  createdAt: Date
}

// events
{
  _id: ObjectId,
  nombre: "string",
  descripcion: "string",
  fecha_inicio: Date,
  fecha_fin: Date,
  premio: "string",
  admin_id: ObjectId,         // ref users
  workspace_id: ObjectId,     // ref workspaces
  active: bool,
  location: "string",         // texto libre
  lat: Number, lng: Number,   // geofencing (radio máx 1 km para join)
  photo: "base64 string",
  tags: ["string"],           // hasta 20
  xp_first_scan: Number,
  xp_rare_bonus: Number,
  xp_completion_bonus: Number,
  createdAt: Date
}

// badges
{
  _id: ObjectId,
  event_id: ObjectId,
  nombre: "string",
  descripcion: "string",
  token: "UUID string",       // único — clave de redención
  qr_image: "base64 string",  // PNG del QR para descarga
  qr_url: "string",           // URL completa codificada en el QR
  xp: Number,
  is_rare: bool,
  icon_url: "string",         // URL o base64 del icono del badge
  createdAt: Date
}

// scans
{
  _id: ObjectId,
  user_id: ObjectId,
  badge_id: ObjectId,
  event_id: ObjectId,         // denormalizado para consultas rápidas
  xp_earned: Number,
  redeemedAt: Date
}

// event_joins — join previo al scan (puede exigir geolocalización)
{
  _id: ObjectId,
  user_id: ObjectId,
  event_id: ObjectId,
  joined_at: Date
}

// achievements — definiciones globales (seed de la app)
{
  _id: ObjectId,
  slug: "string",             // único
  name: "string",
  description: "string",
  rarity: "common" | "rare" | "epic" | "legendary",
  xp_reward: Number,
  icon: "filename.png"
}

// user_achievements — logros desbloqueados
{
  _id: ObjectId,
  user_id: ObjectId,
  achievement_id: ObjectId,   // índice único compuesto con user_id
  unlocked_at: Date
}

// xp_log — auditoría de XP
{
  _id: ObjectId,
  user_id: ObjectId,
  amount: Number,
  reason: "string",           // "badge_scan", "achievement", etc.
  created_at: Date
}

// workspaces
{
  _id: ObjectId,
  name: "string",
  slug: "string",             // único
  logo: "base64 string",
  active: bool,
  createdAt: Date
}

// workspace_members
{
  _id: ObjectId,
  workspace_id: ObjectId,
  user_id: ObjectId,          // índice único compuesto con workspace_id
  role: "admin" | "superadmin",
  joined_at: Date
}

// invitations
{
  _id: ObjectId,
  workspace_id: ObjectId,
  email: "string",            // opcional (invitación por email)
  token: "string",            // único — link de invitación
  code: "string",             // único — código de 6 chars
  expires_at: Date,           // TTL 7 días (índice TTL en MongoDB)
  used: bool
}

// reviews
{
  _id: ObjectId,
  user_id: ObjectId,
  event_id: ObjectId,
  rating: Number,             // 1–5
  recommend: bool,
  best_part: "string",
  created_at: Date
}
```

### Índices

```python
# db.py — init_indexes()
users.create_index("email", unique=True)
badges.create_index("token", unique=True)
badges.create_index("event_id")
scans.create_index([("user_id", 1), ("badge_id", 1)], unique=True)
event_joins.create_index([("user_id", 1), ("event_id", 1)], unique=True)
achievements.create_index("slug", unique=True)
user_achievements.create_index([("user_id", 1), ("achievement_id", 1)], unique=True)
xp_log.create_index([("user_id", 1), ("created_at", -1)])
workspaces.create_index("slug", unique=True)
workspace_members.create_index([("workspace_id", 1), ("user_id", 1)], unique=True)
invitations.create_index("token", unique=True)
invitations.create_index("code", unique=True, sparse=True)
invitations.create_index("expires_at", expireAfterSeconds=0)  # TTL index
```

---

## 5. Endpoints a implementar

Ver `docs/04-resumen-implementacion.md` — Sección "Endpoints implementados" para la lista completa.

Resumen de blueprints:
- `/auth` (17 rutas) — autenticación, perfil, Google OAuth, reset-password
- `/events` (8 rutas) + `/leaderboard` (3 rutas)
- `/redeem/<event_id>/<token>` (1 ruta)
- `/profile` (2 rutas) — XP y logros
- `/admin` (20+ rutas) — gestión completa
- `/workspaces` (20+ rutas) — multi-tenant, invitaciones, bans

---

## 6. Seguridad y autenticación

### 6.1 JWT con flask-jwt-extended

```python
# app.py
app.config["JWT_SECRET_KEY"] = os.getenv("JWT_SECRET")
app.config["JWT_ACCESS_TOKEN_EXPIRES"] = timedelta(hours=8)

# routes/auth.py — al generar el token
additional_claims = {
    "role":           user["role"],
    "name":           user["name"],
    "workspace_id":   str(member["workspace_id"]) if member else None,
    "workspace_role": member["role"] if member else None,
}
token = create_access_token(identity=str(user["_id"]),
                            additional_claims=additional_claims)
```

### 6.2 Almacenamiento del token en el frontend

El token JWT se guarda en `localStorage` bajo la clave `lyfter_token`.

```js
// js/api.js
window.LyfterAPI = {
  setToken(token) { localStorage.setItem('lyfter_token', token) },
  authHeaders() {
    const t = localStorage.getItem('lyfter_token')
    return t ? { Authorization: `Bearer ${t}` } : {}
  },
  logout() {
    localStorage.removeItem('lyfter_token')
    localStorage.removeItem('lyfter_user')
    window.location.href = '/Lyfters-Badge-App/login.html'
  }
}
```

**Cuándo hacer logout:**
- Cuando el backend responde `401` (interceptado en cada llamada de `api.js`).
- Cuando el usuario hace clic en "Cerrar sesión".

### 6.3 Manejo global del 401

Cada método de `api.js` que llama al backend verifica el status de la respuesta. Si es `401`, llama a `LyfterAPI.logout()` — no se repite en cada página.

### 6.4 Prevención de duplicados en scans

El índice único compuesto `{ user_id, badge_id }` en la colección `scans` garantiza a nivel de BD que no puede haber dos redenciones del mismo badge por el mismo usuario, incluso bajo carga concurrente. El backend también verifica explícitamente antes de insertar y retorna `409` con mensaje descriptivo.

### 6.5 Geofencing en join de evento

Si un evento tiene `lat`/`lng` configurados, el endpoint `/events/<id>/join` recibe las coordenadas del cliente y calcula la distancia con la fórmula de Haversine. Si supera 1 km, el join es rechazado.

### 6.6 Sistema de ban

El `god_admin` puede banear una cuenta temporalmente (fecha de expiración específica) o permanentemente (año 9999). El ban puede aplicarse también por IP. Se verifica en login, switch-workspace y refresh-token; la respuesta es `403` con `ban_reason`, `ban_until` y `ban_permanent`.

---

## 7. Flujo de redención de QR

### 7.1 Diagrama de flujo general

```
[Usuario escanea QR físico con cámara del SO]
        ↓
Navegador abre /redeem.html?event_id=<id>&token=<uuid>
        ↓
¿Hay JWT en localStorage?
  → No  → Guardar URL actual → redirect a /login.html?next=/redeem.html?...
           [Post-login: LyfterAPI lee ?next= y navega ahí]
  → Sí  → ¿Usuario se unió al evento? (event_joins)
              → No  → Redirigir a /join.html?event_id=<id>
              → Sí  → POST /redeem/<event_id>/<token>
                          ↓
                      ¿Respuesta?
                        → 200  → Modal de celebración + XP + logros nuevos
                        → 409  → "Ya tienes este badge"
                        → 404  → "QR inválido"
                        → 401  → Interceptor: logout + redirect a login
                        → 5xx  → "Error, intenta de nuevo"
```

### 7.2 Diagrama de secuencia — Caso A: participante CON sesión activa y JOIN hecho

```
Participante → Frontend → API Flask → MongoDB
     │            │           │           │
     │─ abre URL ►│           │           │
     │            │─ lee JWT  │           │
     │            │─ POST /redeem ───────►│
     │            │           │─ find badge + scan ─►│
     │            │           │─ insert scan ────────►│
     │            │           │─ grant XP + logros ──►│
     │            │◄─ 200 + badge + xp + achievements ┤
     │◄ modal celebración ────│           │           │
```

### 7.3 Parámetro `?next=` para el flujo sin sesión

```js
// En cualquier página que detecte 401 o falta de token:
const next = encodeURIComponent(window.location.href.replace(window.location.origin, ''))
window.location.href = `/Lyfters-Badge-App/login.html?next=${next}`

// En login.html, tras autenticarse exitosamente:
const params = new URLSearchParams(window.location.search)
const next = params.get('next')
if (next && next.startsWith('/')) {
  window.location.href = next   // ruta interna — previene open redirect
} else {
  window.location.href = user.role === 'admin'
    ? '/Lyfters-Badge-App/admin-event.html'
    : '/Lyfters-Badge-App/profile.html'
}
```

---

## 8. Manejo de errores

### 8.1 Patrón de respuesta JSON estándar

```json
// Éxito
{ "success": true, "data": { ... } }

// Error
{
  "success": false,
  "error": "error_code",
  "message": "Mensaje legible en español"
}
```

### 8.2 Tabla de códigos HTTP

| Código | Situación | `error` |
|--------|-----------|---------|
| `200` | OK | — |
| `201` | Recurso creado | — |
| `400` | Datos inválidos o faltantes | `"validation_error"` |
| `401` | Token ausente, inválido o expirado | `"unauthorized"` |
| `403` | Token válido pero rol insuficiente o cuenta baneada | `"forbidden"` / `"cuenta_baneada"` |
| `404` | Recurso no encontrado | `"not_found"` |
| `409` | Redención duplicada o email ya registrado | `"duplicate"` |
| `422` | Evento no unido (falta join previo) | `"not_joined"` |
| `429` | Rate limit excedido | `"rate_limit"` |
| `500` | Error interno | `"server_error"` |

---

## 9. Variables de entorno

### 9.1 Backend (`backend/.env`)

```bash
# Críticas para producción
JWT_SECRET=reemplazar_con_64_chars_aleatorios
MONGO_URI=mongodb+srv://<user>:<pass>@<cluster>.mongodb.net/lyfter_db
PORT=5000
FLASK_ENV=production        # 'development' desactiva rate limiting e IP guard

# CORS — orígenes permitidos separados por coma
CORS_ORIGINS=https://liangso420-cell.github.io,https://lyfters-badge-app.vercel.app

# Rate limiting (Redis)
REDIS_URL=rediss://<upstash-url>:6379

# URLs
APP_BASE_URL=https://liangso420-cell.github.io/Lyfters-Badge-App   # para QR URLs
FRONTEND_URL=https://liangso420-cell.github.io/Lyfters-Badge-App   # para links en emails

# Email
RESEND_API_KEY=re_xxxx
SENDGRID_API_KEY=SG.xxxx
FROM_EMAIL=noreply@lyfter.app

# Google OAuth (Firebase)
FIREBASE_CLIENT_ID=xxxx.apps.googleusercontent.com
```

### 9.2 Frontend (`frontend/js/config.js`)

```js
window.LYFTER_CONFIG = {
  mode: 'backend',    // 'mock' para desarrollo sin servidor
  apiBaseUrl: 'https://lyfters-badge-app.onrender.com',
}

window.FIREBASE_CONFIG = {
  apiKey: "...",      // restringida por HTTP referrer — segura en cliente
  authDomain: "lyfter-badge-app.firebaseapp.com",
  projectId: "lyfter-badge-app",
  // ...
}
```

### 9.3 Variables de entorno en los servicios de deploy

**Render (backend):** Dashboard → [servicio] → Environment → setear todas las variables críticas.

**GitHub Pages (frontend):** no requiere variables de entorno — `config.js` se edita directamente en el repo.

---

## 10. Rutas del frontend y navegación por rol

El frontend no usa un router — cada página es un HTML independiente. La protección por rol se implementa al inicio de cada página:

```js
// Patrón en páginas de admin
const user = JSON.parse(localStorage.getItem('lyfter_user') || 'null')
if (!user || !['admin','superadmin','god_admin'].includes(user.role)) {
  window.location.href = '/Lyfters-Badge-App/login.html'
}
```

**Rutas por rol:**

| Rol al hacer login | Destino |
|-------------------|---------|
| `participant` | `profile.html` |
| `admin` / `superadmin` / `god_admin` | `admin-event.html` |
| Con `?next=` | `?next=` (si empieza con `/`) |

---

## 11. Sistema de XP y logros

### 11.1 Flujo de grant de XP al redimir un badge

```
POST /redeem/<event_id>/<token>
  → insertar scan
  → calcular XP = badge.xp + (evento.xp_rare_bonus si is_rare)
  → si completó todos los badges → sumar evento.xp_completion_bonus
  → insertar en xp_log
  → llamar services/achievements.evaluate(user_id) → desbloquear logros
  → retornar { badge, xp_earned, new_achievements, completed, premio }
```

### 11.2 Niveles

| Nivel | Nombre | XP mínimo |
|-------|--------|-----------|
| 1 | Explorador | 0 |
| 2 | Coleccionista | 100 |
| 3 | Maestro badge | 300 |
| 4 | Leyenda Lyfter | 600 |

---

## 12. Plan de implementación (histórico)

Las fases 1–9 del `docs/03-tareas.md` están completas. La app está en producción con todas las funcionalidades P0, P2-A (dashboard), P2-B (leaderboard en tiempo real) y P2-C (historial de eventos) implementadas, más features adicionales fuera del scope original:
- Sistema de workspaces multi-tenant
- XP y niveles
- 10 logros con rareza
- Reviews de eventos
- Google OAuth
- Geofencing en join de evento
- Ban system
- i18n en 5 idiomas
- Reset de contraseña por email
- Perfiles públicos de usuario

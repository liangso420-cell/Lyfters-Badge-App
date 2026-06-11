# Diseño Técnico — Lyfter Badge App
**Versión:** 2.0  
**Última actualización:** Junio 2026
 
---
 
## 1. Arquitectura general
 
```
┌─────────────────────────────────────────────┐
│           Frontend (Vue + Tailwind)          │
│  Login | Registro | Perfil | Escáner | Admin │
├─────────────────────────────────────────────┤
│              API REST (Flask + JWT)          │
│    Auth | Events | Badges | Redeem | Admin   │
├─────────────────────────────────────────────┤
│           Base de datos (MongoDB)            │
│       Users | Events | Badges | Scans        │
└─────────────────────────────────────────────┘
```
 
**Deploy:**
- Frontend → Vercel
- Backend  → Render
- DB       → MongoDB Atlas
El frontend (SPA Vue) consume la API REST de Flask vía HTTP con un token JWT en
el header `Authorization: Bearer <token>`. Flask valida el token y el rol, opera
sobre MongoDB mediante PyMongo y responde JSON. El único endpoint pensado para
acceso directo desde el navegador (al abrir un QR físico) es la ruta de
redención, que decide entre redirigir a login o procesar el canje.
 
---
 
## 2. Estructura de carpetas
 
```
lyfter-badge-app/
├── backend/
│   ├── app.py               ← entrada principal Flask (app factory + registro de blueprints)
│   ├── config.py            ← carga de variables de entorno
│   ├── db.py                ← conexión PyMongo + acceso a colecciones
│   ├── models/              ← esquemas / helpers de documentos MongoDB
│   │   ├── user.py
│   │   ├── event.py
│   │   ├── badge.py
│   │   └── scan.py
│   ├── routes/              ← blueprints por dominio
│   │   ├── auth.py
│   │   ├── events.py
│   │   ├── badges.py
│   │   ├── redeem.py
│   │   └── admin.py
│   ├── middleware/          ← decoradores JWT y roles
│   │   └── auth_guard.py
│   ├── utils/
│   │   └── qr.py            ← generación de QR (librería qrcode)
│   ├── requirements.txt
│   └── .env
├── frontend/
│   ├── src/
│   │   ├── views/           ← páginas Vue
│   │   │   ├── Login.vue
│   │   │   ├── Register.vue
│   │   │   ├── Profile.vue
│   │   │   ├── Redeem.vue
│   │   │   └── admin/
│   │   │       ├── Events.vue
│   │   │       ├── Badges.vue
│   │   │       └── Dashboard.vue
│   │   ├── components/      ← componentes reutilizables
│   │   │   ├── BadgeCard.vue
│   │   │   ├── ProgressBar.vue
│   │   │   └── CelebrationModal.vue
│   │   ├── router/          ← Vue Router con guards por rol
│   │   │   └── index.js
│   │   ├── stores/          ← Pinia para estado global (auth, eventos)
│   │   │   ├── auth.js
│   │   │   └── events.js
│   │   ├── services/        ← cliente API (axios) con interceptor JWT
│   │   │   └── api.js
│   │   ├── App.vue
│   │   └── main.js
│   └── .env
└── documentos/
    ├── 01-prd.md
    ├── 02-diseno-tecnico.md
    └── 03-tareas.md
```
 
---
 
## 3. Decisiones de tecnología
 
- **Flask**: manejo de rutas REST, blueprints por dominio, decoradores JWT. App
  factory en `app.py` para configurar CORS y registrar blueprints.
- **JWT**: tokens con el rol embebido (`admin` / `participante`) en el claim,
  para proteger rutas y diferenciar permisos sin consultar la BD en cada request.
- **MongoDB**: documentos flexibles, ideal para badges variables por evento (cada
  evento define su propio conjunto de badges).
- **PyMongo**: conexión directa, operaciones CRUD sobre colecciones.
- **Vue.js**: SPA reactiva, **Vue Router** para navegación, **Pinia** para estado
  global (sesión, evento activo).
- **Tailwind + DaisyUI**: estilos utilitarios + componentes listos; el diseño
  final debe ser fiel al prototipo `diseño-previo.html`.
- **qrcode (Python)**: generar la imagen QR del token UUID en el backend y
  guardarla como base64.
- El QR apunta a: `https://[dominio-frontend]/redeem/<event_id>/<token>`.
---
 
## 4. Modelo de datos (MongoDB)
 
> **Nota sobre serialización de ObjectId en Flask/PyMongo:**  
> PyMongo devuelve los campos `_id` y cualquier referencia como objetos
> `ObjectId`, que no son serializables a JSON con `json.dumps` estándar.
> Solución recomendada: crear un helper `serialize_doc` que convierta `_id` y
> otros `ObjectId` a `str` antes de retornar la respuesta.
>
> ```python
> # utils/serializer.py
> from bson import ObjectId
>
> def serialize_doc(doc):
>     """Convierte ObjectId a str en un documento MongoDB."""
>     if doc is None:
>         return None
>     result = {}
>     for key, value in doc.items():
>         if isinstance(value, ObjectId):
>             result[key] = str(value)
>         elif isinstance(value, list):
>             result[key] = [serialize_doc(i) if isinstance(i, dict) else
>                            str(i) if isinstance(i, ObjectId) else i
>                            for i in value]
>         elif isinstance(value, dict):
>             result[key] = serialize_doc(value)
>         else:
>             result[key] = value
>     return result
> ```
>
> Usar `jsonify(serialize_doc(doc))` en todas las rutas que retornen documentos
> MongoDB. Alternativa: usar `flask-pymongo` con encoder personalizado o la
> librería `bson.json_util`.
 
```js
// Colección: users
// Campos requeridos: nombre, email, password, rol
// Campos opcionales: createdAt (se setea en la inserción)
{
  _id: ObjectId,
  nombre: "string",           // requerido
  email: "string",            // requerido, único
  password: "hashed string",  // requerido — bcrypt / werkzeug
  rol: "participante" | "admin", // requerido
  createdAt: Date             // opcional, auto-generado
}
 
// Colección: events
// Campos requeridos: nombre, fecha_inicio, fecha_fin, premio, admin_id
// Campos opcionales: descripcion, createdAt
{
  _id: ObjectId,
  nombre: "string",           // requerido
  descripcion: "string",      // opcional
  fecha_inicio: Date,         // requerido
  fecha_fin: Date,            // requerido
  premio: "string",           // requerido — texto o URL de imagen del premio
  admin_id: ObjectId,         // requerido — ref users
  createdAt: Date             // opcional, auto-generado
}
 
// Colección: badges
// Campos requeridos: event_id, nombre, token, qr_image, qr_url
// Campos opcionales: descripcion, createdAt
{
  _id: ObjectId,
  event_id: ObjectId,         // requerido — ref events
  nombre: "string",           // requerido
  descripcion: "string",      // opcional
  token: "UUID string",       // requerido, único — clave de redención
  qr_image: "base64 string",  // requerido — PNG en base64 para descarga
  qr_url: "string",           // requerido — URL completa codificada en el QR
                              // ej: "https://lyfter.vercel.app/redeem/<event_id>/<token>"
  createdAt: Date             // opcional, auto-generado
}
 
// Colección: scans (redenciones)
// Campos requeridos: user_id, badge_id, event_id, redeemedAt
// Sin campos opcionales — todos los campos son necesarios para consultas
{
  _id: ObjectId,
  user_id: ObjectId,          // requerido — ref users
  badge_id: ObjectId,         // requerido — ref badges
  event_id: ObjectId,         // requerido — ref events (denormalizado para consultas rápidas)
  redeemedAt: Date            // requerido, auto-generado al insertar
}
```
 
**Índices recomendados:**
- `users.email` → único.
- `badges.token` → único (búsqueda en redención).
- `scans` → índice compuesto único `{ user_id, badge_id }` para garantizar a
  nivel de BD la prevención de duplicados.
```python
# db.py — crear índices al inicializar la conexión
def init_indexes(db):
    db.users.create_index("email", unique=True)
    db.badges.create_index("token", unique=True)
    db.scans.create_index(
        [("user_id", 1), ("badge_id", 1)],
        unique=True
    )
```
 
---
 
## 5. Endpoints a implementar
 
### Públicos
| Método | Ruta | Descripción |
|--------|------|-------------|
| `POST` | `/auth/register` | Registro de participante |
| `POST` | `/auth/login` | Login, retorna JWT |
 
### Autenticados (participante)
| Método | Ruta | Descripción |
|--------|------|-------------|
| `POST` | `/redeem/<event_id>/<token>` | Registra badge para el usuario autenticado |
| `GET`  | `/events/` | Lista eventos activos |
| `GET`  | `/events/<id>` | Detalle del evento + badges + premio |
| `GET`  | `/me/badges` | Badges del usuario agrupados por evento |
 
### Admin
| Método | Ruta | Descripción |
|--------|------|-------------|
| `POST` | `/admin/event` | Crear evento |
| `POST` | `/admin/events/<id>/badge` | Agregar badge + generar UUID + QR |
| `GET`  | `/admin/events/<id>/badges` | Listar badges con estado de redención |
 
> **Nota sobre `/redeem`:** el QR físico apunta a la URL del **frontend**
> (`/redeem/<event_id>/<token>`). Esa vista Vue verifica si hay sesión activa
> y, si la hay, llama a `POST /redeem/<event_id>/<token>` en la API. La lógica
> de negocio (validar token, prevenir duplicados, insertar scan) vive únicamente
> en el backend.
 
---
 
## 6. Seguridad y autenticación
 
### 6.1 Tiempo de expiración del JWT
 
Configurar el tiempo de expiración a **8 horas** desde la emisión. Esto cubre
la duración de cualquier evento Lyfter estándar sin obligar a los participantes
a re-autenticarse durante el evento.
 
```python
# config.py
JWT_EXPIRATION_HOURS = 8
 
# routes/auth.py — al generar el token
import jwt
from datetime import datetime, timedelta
 
payload = {
    "user_id": str(user["_id"]),
    "rol": user["rol"],
    "exp": datetime.utcnow() + timedelta(hours=JWT_EXPIRATION_HOURS)
}
token = jwt.encode(payload, current_app.config["JWT_SECRET"], algorithm="HS256")
```
 
### 6.2 Almacenamiento del token en el frontend
 
El token JWT se guarda en `localStorage` bajo la clave `lyfter_token`. Es la
opción más simple para este contexto (SPA académica, sin requerimientos de
seguridad de nivel bancario).
 
```js
// stores/auth.js (Pinia)
import { defineStore } from 'pinia'
 
export const useAuthStore = defineStore('auth', {
  state: () => ({
    token: localStorage.getItem('lyfter_token') || null,
    user: JSON.parse(localStorage.getItem('lyfter_user') || 'null'),
  }),
 
  getters: {
    isAuthenticated: (state) => !!state.token,
    isAdmin: (state) => state.user?.rol === 'admin',
  },
 
  actions: {
    login(token, user) {
      this.token = token
      this.user = user
      localStorage.setItem('lyfter_token', token)
      localStorage.setItem('lyfter_user', JSON.stringify(user))
    },
 
    logout() {
      this.token = null
      this.user = null
      localStorage.removeItem('lyfter_token')
      localStorage.removeItem('lyfter_user')
      // El router redirige a /login desde el guard o desde el interceptor
    },
  },
})
```
 
**Cuándo hacer logout:**
- Cuando el interceptor axios recibe un `401` del backend.
- Cuando el usuario pulsa "Cerrar sesión" manualmente.
- No hacer logout automático por inactividad (fuera de scope).
### 6.3 Interceptor axios para JWT expirado
 
El interceptor vive en `services/api.js` y es el **único lugar** del frontend
donde se maneja el 401. Ningún componente ni vista debe manejar el 401
individualmente.
 
```js
// services/api.js
import axios from 'axios'
import { useAuthStore } from '@/stores/auth'
import router from '@/router'
 
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  timeout: 10000,
})
 
// Adjuntar token en cada request
api.interceptors.request.use((config) => {
  const auth = useAuthStore()
  if (auth.token) {
    config.headers.Authorization = `Bearer ${auth.token}`
  }
  return config
})
 
// Manejar respuestas de error globalmente
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const auth = useAuthStore()
 
    if (error.response?.status === 401) {
      // Token expirado o inválido
      const currentPath = router.currentRoute.value.fullPath
      auth.logout()
 
      // Preservar la ruta actual para reanudar después del login
      // No redirigir si ya estamos en /login para evitar loop
      if (currentPath !== '/login') {
        router.push(`/login?next=${encodeURIComponent(currentPath)}`)
      }
    }
 
    return Promise.reject(error)
  }
)
 
export default api
```
 
### 6.4 Protección contra reutilización del token QR
 
El token UUID de cada badge puede ser usado **una sola vez por usuario**. La
prevención de duplicados opera en dos capas:
 
1. **Base de datos:** índice compuesto único `{ user_id, badge_id }` en la
   colección `scans`. Si se intenta insertar una redención duplicada, MongoDB
   lanza un error `DuplicateKeyError` que el backend captura y retorna como
   `409 Conflict`.
2. **Backend:** antes de insertar, verificar explícitamente si el scan existe
   (para retornar un mensaje descriptivo antes de llegar al error de índice):
```python
# routes/redeem.py
existing = db.scans.find_one({"user_id": user_id, "badge_id": badge["_id"]})
if existing:
    return jsonify({"error": "duplicate", "message": "Ya tienes este badge"}), 409
```
 
> **Nota:** el token QR en sí no es de un solo uso global — varios participantes
> pueden canjear el mismo QR físico (cada uno obtiene su badge). Lo que no se
> permite es que **el mismo usuario** canjee el **mismo badge** dos veces.
 
---
 
## 7. Flujo de redención de QR
 
### 7.1 Diagrama de flujo general
 
```
[Usuario escanea QR físico]
        ↓
Frontend carga /redeem/<event_id>/<token>
        ↓
¿Hay token JWT en localStorage?
  → No  → Guardar URL actual en localStorage como "pending_redeem"
           Redirigir a /login?next=/redeem/<event_id>/<token>
           [Post-login: ver sección 7.3]
  → Sí  → Llamar POST /redeem/<event_id>/<token> con JWT en header
              ↓
          ¿Respuesta del backend?
            → 200 OK     → Mostrar modal de celebración con badge
                           ¿premio=true? → Mostrar revelación del premio
            → 409        → Mostrar "Ya tienes este badge"
            → 404        → Mostrar "QR inválido"
            → 401        → Interceptor maneja: logout + redirect a login con ?next=
            → 500        → Mostrar "Error del servidor, intenta de nuevo"
```
 
### 7.2 Diagrama de secuencia — Caso A: participante CON sesión activa
 
```
Participante    →  Escáner QR (SO)   →  Frontend Vue     →  API Flask      →  MongoDB
     |                  |                    |                   |                |
     |── escanea QR ──► |                    |                   |                |
     |                  |── abre URL ───────►|                   |                |
     |                  |                    |── lee token JWT   |                |
     |                  |                    |   de localStorage |                |
     |                  |                    |── POST /redeem ──►|                |
     |                  |                    |                   |── find badge ─►|
     |                  |                    |                   |◄── badge doc ──|
     |                  |                    |                   |── find scan ──►|
     |                  |                    |                   |◄── null ───────|
     |                  |                    |                   |── insert scan ►|
     |                  |                    |                   |◄── ok ─────────|
     |                  |                    |◄── 200 + badge ───|                |
     |◄── modal badge ──|────────────────────|                   |                |
```
 
### 7.3 Diagrama de secuencia — Caso B: participante SIN sesión activa
 
```
Participante    →  Escáner QR (SO)   →  Frontend Vue     →  API Flask      →  MongoDB
     |                  |                    |                   |                |
     |── escanea QR ──► |                    |                   |                |
     |                  |── abre URL ───────►|                   |                |
     |                  |                    |── no hay JWT      |                |
     |                  |                    |── guarda ?next=   |                |
     |                  |                    |   en la URL       |                |
     |                  |                    |── redirect ──────►|                |
     |                  |                    |   /login?next=... |                |
     |◄── pantalla login|────────────────────|                   |                |
     |── ingresa creds ►|                    |                   |                |
     |                  |                    |── POST /auth/login►|               |
     |                  |                    |                   |── find user ──►|
     |                  |                    |                   |◄── user doc ───|
     |                  |                    |◄── 200 + JWT ─────|                |
     |                  |                    |── guarda JWT      |                |
     |                  |                    |── lee ?next= de   |                |
     |                  |                    |   la URL actual   |                |
     |                  |                    |── navega a ?next= |                |
     |                  |                    |── POST /redeem ──►|                |
     |                  |                    |                   |  (igual que A) |
     |◄── modal badge ──|────────────────────|                   |                |
```
 
### 7.4 Implementación del parámetro `?next=` en Vue Router
 
El guard de navegación lee el `?next=` y la vista de Login lo consume tras
autenticarse exitosamente.
 
```js
// router/index.js
import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
 
const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/login',    component: () => import('@/views/Login.vue') },
    { path: '/register', component: () => import('@/views/Register.vue') },
    {
      path: '/profile',
      component: () => import('@/views/Profile.vue'),
      meta: { requiresAuth: true }
    },
    {
      path: '/redeem/:event_id/:token',
      component: () => import('@/views/Redeem.vue'),
      meta: { requiresAuth: true }
    },
    {
      path: '/admin',
      meta: { requiresAuth: true, requiresAdmin: true },
      children: [/* ... */]
    },
  ]
})
 
router.beforeEach((to, from, next) => {
  const auth = useAuthStore()
 
  if (to.meta.requiresAdmin && !auth.isAdmin) {
    return next('/login')
  }
 
  if (to.meta.requiresAuth && !auth.isAuthenticated) {
    // Preservar la ruta destino para reanudar post-login
    return next(`/login?next=${encodeURIComponent(to.fullPath)}`)
  }
 
  next()
})
 
export default router
```
 
```vue
<!-- views/Login.vue — fragmento del método de login -->
<script setup>
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
 
const router = useRouter()
const route = useRoute()
const auth = useAuthStore()
 
async function handleLogin() {
  // ... llamada a la API, guardar token ...
  auth.login(token, user)
 
  // Leer ?next= y validar que sea una ruta interna (prevenir open redirect)
  const next = route.query.next
  if (next && next.startsWith('/')) {
    router.push(next)
  } else {
    // Redirección por rol si no hay ?next=
    router.push(auth.isAdmin ? '/admin/events' : '/profile')
  }
}
</script>
```
 
> **Seguridad:** siempre verificar que el valor de `?next=` empiece con `/`
> antes de redirigir. Esto previene ataques de open redirect donde `?next=`
> apunte a un dominio externo malicioso.
 
---
 
## 8. Manejo de errores
 
### 8.1 Patrón de respuesta JSON estándar
 
Todos los endpoints de la API retornan JSON con esta estructura consistente:
 
```json
// Éxito
{
  "success": true,
  "data": { ... }       // objeto o array con el resultado
}
 
// Error
{
  "success": false,
  "error": "error_code",       // identificador de máquina (snake_case)
  "message": "Mensaje legible en español para mostrar al usuario"
}
```
 
### 8.2 Tabla de códigos HTTP por tipo de error
 
| Código | Situación | `error` (código) | Mensaje al usuario |
|--------|-----------|-------------------|--------------------|
| `200` | Operación exitosa | — | — |
| `201` | Recurso creado (registro, badge) | — | — |
| `400` | Datos inválidos o faltantes en el body | `"validation_error"` | "Faltan campos requeridos o tienen un formato incorrecto." |
| `401` | Token ausente, inválido o expirado | `"unauthorized"` | "Tu sesión expiró. Por favor inicia sesión nuevamente." |
| `403` | Token válido pero rol insuficiente | `"forbidden"` | "No tienes permiso para realizar esta acción." |
| `404` | Recurso no encontrado (evento, badge, token QR) | `"not_found"` | "El recurso solicitado no existe." |
| `409` | Redención duplicada (badge ya canjeado) | `"duplicate"` | "Ya tienes este badge." |
| `500` | Error interno del servidor | `"server_error"` | "Ocurrió un error. Por favor intenta de nuevo." |
 
### 8.3 Manejo de errores en el frontend por código HTTP
 
```js
// services/api.js — manejo en el interceptor de respuesta
// El interceptor maneja el 401 globalmente (ver sección 6.3).
// Los demás códigos se manejan en cada acción de Pinia o directamente en la vista.
 
// Ejemplo de manejo en una vista o store:
async function redeem(eventId, token) {
  try {
    const { data } = await api.post(`/redeem/${eventId}/${token}`)
    // data.success === true → mostrar modal de celebración
    return data
  } catch (err) {
    const status = err.response?.status
    const message = err.response?.data?.message
 
    if (status === 409) {
      // Badge duplicado — mostrar aviso amigable, no es un error crítico
      showToast('info', message || 'Ya tienes este badge.')
    } else if (status === 404) {
      showToast('error', 'Este QR no es válido.')
    } else if (status === 403) {
      showToast('error', 'No tienes permiso para canjear este badge.')
    } else if (!status || status >= 500) {
      // Sin respuesta del servidor o error 5xx
      showToast('error', 'No se pudo conectar. Verifica tu conexión e intenta de nuevo.')
    }
    // El 401 ya fue manejado por el interceptor global; no llega aquí.
  }
}
```
 
**Resumen de responsabilidades por código:**
 
| Código | Quién maneja | Acción en UI |
|--------|-------------|--------------|
| `400` | Vista / store | Toast de error con el mensaje del backend |
| `401` | Interceptor global (`api.js`) | Logout + redirect a login con `?next=` |
| `403` | Vista / store | Toast de error: "Sin permiso" |
| `404` | Vista / store | Toast de error o estado vacío en la pantalla |
| `409` | Vista / store | Toast informativo: "Ya tienes este badge" |
| `500` / sin red | Vista / store | Toast de error + botón "Reintentar" |
 
---
 
## 9. Variables de entorno
 
### 9.1 Backend (`backend/.env`)
 
```bash
# ── Críticas para producción ──────────────────────────────────────────────────
 
# Clave secreta para firmar JWT — debe ser larga, aleatoria y nunca en el repo
JWT_SECRET=reemplazar_con_clave_aleatoria_de_64_chars
 
# Cadena de conexión a MongoDB Atlas — incluye usuario, contraseña y cluster
MONGODB_URI=mongodb+srv://<user>:<password>@<cluster>.mongodb.net/<dbname>?retryWrites=true&w=majority
 
# Nombre de la base de datos
MONGODB_DB_NAME=lyfter_badge_app
 
# URL base del frontend (para construir la qr_url de los badges)
# En producción: el dominio de Vercel
FRONTEND_URL=https://lyfter-badge.vercel.app
 
# ── Importantes para producción ───────────────────────────────────────────────
 
# Orígenes permitidos en CORS — separados por coma si son varios
# En producción: solo el dominio de Vercel
CORS_ORIGINS=https://lyfter-badge.vercel.app
 
# ── Solo para desarrollo local ────────────────────────────────────────────────
 
# En desarrollo, CORS puede ser permisivo
# CORS_ORIGINS=http://localhost:5173
 
# Flask — solo necesario en desarrollo (Render setea PORT automáticamente)
FLASK_ENV=development
PORT=5000
```
 
### 9.2 Frontend (`frontend/.env`)
 
```bash
# ── Críticas para producción ──────────────────────────────────────────────────
 
# URL base de la API Flask en Render
# Vercel requiere el prefijo VITE_ para exponer la variable al cliente
VITE_API_URL=https://lyfter-badge-api.onrender.com
 
# ── Solo para desarrollo local ────────────────────────────────────────────────
 
# Apuntar al backend local durante desarrollo
# VITE_API_URL=http://localhost:5000
```
 
> **Regla de oro:** nunca commitear archivos `.env` al repositorio. Agregar
> `.env` al `.gitignore` desde el primer commit. Usar `.env.example` (sin
> valores reales) como referencia para el equipo.
 
### 9.3 Variables de entorno en los servicios de deploy
 
**Render (backend):**  
Ir a *Dashboard → [servicio] → Environment → Environment Variables* y setear
`JWT_SECRET`, `MONGODB_URI`, `MONGODB_DB_NAME`, `FRONTEND_URL` y `CORS_ORIGINS`
con los valores de producción. Render no usa el archivo `.env` del repo.
 
**Vercel (frontend):**  
Ir a *Project Settings → Environment Variables* y agregar `VITE_API_URL` con la
URL del servicio Render. Vercel inyecta las variables en tiempo de build, no de
ejecución — por eso el prefijo `VITE_` es obligatorio en Vue + Vite.
 
---
 
## 10. Guards de Vue Router por rol
 
- `/login`, `/register` → público.
- `/profile`, `/redeem/:event_id/:token` → requiere JWT válido (participante).
- `/admin/*` → requiere JWT válido **+ rol admin**.
- Redirección automática por rol al hacer login:
  - `admin` → `/admin/events`
  - `participante` → `/profile`
- Las rutas protegidas sin sesión redirigen a `/login?next=<ruta-solicitada>`.
- Si `?next=` existe al completar el login, tiene prioridad sobre la redirección
  por rol.
---
 
## 11. Plan de implementación (alineado al calendario del programa)
 
**Semana 2 — Lunes (Setup):**
- Estructura de carpetas backend y frontend.
- Configurar `.env` y `.env.example`, conectar MongoDB, instalar dependencias.
- Inicializar Vue + Tailwind + DaisyUI.
- Crear índices en MongoDB desde `db.py` (`init_indexes`).
**Semana 2 — Martes (Auth + Eventos):**
- `POST /auth/register` + `/auth/login` + JWT con expiración 8h.
- Store Pinia de auth + interceptor axios (sección 6.3) — hacer esto **antes**
  que cualquier otra pantalla para no tener que retroactivamente agregar manejo
  de errores.
- Roles admin/participante + guards de Vue Router.
- CRUD `/events` + pantallas login, registro, crear evento.
**Semana 2 — Miércoles (Badges + QRs):**
- `POST /admin/events/<id>/badge` + UUID + generación QR + campo `qr_url`.
- Vista agregar badge + mostrar QR + botón descarga.
**Semana 2 — Jueves (Redención):**
- `POST /redeem/<event_id>/<token>` completo con manejo de duplicados (409).
- Vista `/redeem` en frontend: verificar sesión → llamar API → modal de
  celebración.
- Flujo sin sesión: redirect a login con `?next=` + reanudación post-login.
- Detección de evento completado + revelación del premio.
**Semana 2 — Viernes (Perfil + integración):**
- `GET /me/badges` agrupado por evento.
- Barra de progreso + premio al completar.
- Prueba end-to-end completa en local.
**Semana 3 — Lunes/Martes (Admin + UX):**
- `GET /admin/events/<id>/badges` con estado de redención.
- Panel de seguimiento de participación.
- Manejo de errores completo en UI (estados de carga, toasts, mensajes vacíos).
- Revisión responsive en móvil (375 px).
**Semana 3 — Miércoles (Deploy — no dejarlo para el último día):**
- Deploy backend en Render: setear todas las variables de entorno de producción.
- Deploy frontend en Vercel: setear `VITE_API_URL`.
- Verificar CORS en producción.
- Verificar que el QR generado apunte al dominio de Vercel (no localhost).
- Ejecutar checklist de producción: login real, redención real, panel admin real.
- Documentar plan B (ngrok) en caso de fallo de Render el día de la demo.
# Diseño Técnico — Lyfter Badge App

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

## 4. Modelo de datos (MongoDB)

```js
// Colección: users
{
  _id: ObjectId,
  nombre: "string",
  email: "string",            // único
  password: "hashed string",  // bcrypt / werkzeug
  rol: "participante" | "admin",
  createdAt: Date
}

// Colección: events
{
  _id: ObjectId,
  nombre: "string",
  descripcion: "string",
  fecha_inicio: Date,
  fecha_fin: Date,
  premio: "string",
  admin_id: ObjectId,         // ref users
  createdAt: Date
}

// Colección: badges
{
  _id: ObjectId,
  event_id: ObjectId,         // ref events
  nombre: "string",
  descripcion: "string",
  token: "UUID string",       // único por badge
  qr_image: "base64 string",  // PNG en base64
  createdAt: Date
}

// Colección: scans (redenciones)
{
  _id: ObjectId,
  user_id: ObjectId,          // ref users
  badge_id: ObjectId,         // ref badges
  event_id: ObjectId,         // ref events (denormalizado para consultas rápidas)
  redeemedAt: Date
}
```

**Índices recomendados:**
- `users.email` → único.
- `badges.token` → único (búsqueda en redención).
- `scans` → índice compuesto único `{ user_id, badge_id }` para garantizar a
  nivel de BD la prevención de duplicados.

## 5. Endpoints a implementar (según especificaciones del programa)

### Públicos
| Método | Ruta | Descripción |
|--------|------|-------------|
| `GET`  | `/redeem/<event_id>/<token>` | Registra badge; redirige a login si no hay sesión |
| `POST` | `/auth/register`             | Registro de participante |
| `POST` | `/auth/login`                | Login, retorna JWT |

### Autenticados (participante)
| Método | Ruta | Descripción |
|--------|------|-------------|
| `GET`  | `/events/`        | Lista eventos activos |
| `GET`  | `/events/<id>`    | Detalle del evento + badges + premio |
| `GET`  | `/me/badges`      | Badges del usuario agrupados por evento |

### Admin
| Método | Ruta | Descripción |
|--------|------|-------------|
| `POST` | `/admin/event`                | Crear evento |
| `POST` | `/admin/events/<id>/badge`    | Agregar badge + generar UUID + QR |
| `GET`  | `/admin/events/<id>/badges`   | Listar badges con estado de redención |

> Nota: aunque el QR físico apunta a la URL del **frontend**
> (`/redeem/<event_id>/<token>`), la lógica de redención del lado servidor se
> expone como endpoint de la API que el frontend invoca tras validar la sesión.

## 6. Flujo de redención de QR

```
[Usuario escanea QR físico]
        ↓
GET /redeem/<event_id>/<token>   (abre el frontend)
        ↓
¿Hay sesión JWT activa?
  → No  → Redirigir a /login?next=/redeem/<event_id>/<token>
  → Sí  → Validar token en colección badges
              ↓
          ¿Token existe?
            → No  → Error: "QR inválido"
            → Sí  → ¿Ya canjeado por este usuario?
                        → Sí → Mensaje: "Ya tienes este badge"
                        → No → Insertar scan en BD
                                    ↓
                               ¿Completó todos los badges del evento?
                                 → Sí → Respuesta con flag premio=true + premio
                                 → No → Respuesta con badge obtenido
                                    ↓
                               Frontend muestra modal de celebración
```

Tras login en el caso "sin sesión", el frontend lee el parámetro `next` y
reintenta automáticamente la redención pendiente.

## 7. Guards de Vue Router por rol
- `/login`, `/register` → público.
- `/profile`, `/redeem` → requiere JWT válido (participante).
- `/admin/*` → requiere JWT válido **+ rol admin**.
- Redirección automática por rol al hacer login:
  - `admin` → `/admin/events`
  - `participante` → `/profile`
- Las rutas protegidas sin sesión redirigen a `/login?next=<ruta-solicitada>`.

## 8. Plan de implementación (alineado al calendario del programa)

**Semana 2 — Lunes (Setup):**
- Estructura de carpetas backend y frontend.
- Configurar `.env`, conectar MongoDB, instalar dependencias.
- Inicializar Vue + Tailwind + DaisyUI.

**Semana 2 — Martes (Auth + Eventos):**
- `POST /auth/register` + `/auth/login` + JWT.
- Roles admin/participante + protección de rutas.
- CRUD `/events` + pantallas login, registro, crear evento.

**Semana 2 — Miércoles (Badges + QRs):**
- `POST /admin/events/<id>/badge` + UUID + generación QR.
- Vista agregar badge + mostrar QR + botón descarga.

**Semana 2 — Jueves (Redención):**
- `GET /redeem/<event_id>/<token>` completo.
- Página pública de redención + redirect a login.
- Modal de celebración + detección de evento completado.

**Semana 2 — Viernes (Perfil + integración):**
- `GET /me/badges` agrupado por evento.
- Barra de progreso + premio al completar.
- Prueba end-to-end completa.

**Semana 3 — Lunes/Martes (Admin + UX):**
- `GET /admin/events/<id>/badges` con estado de redención.
- Panel de seguimiento de participación.
- Manejo de errores en UI.

**Semana 3 — Miércoles (Deploy):**
- Deploy backend en Render.
- Deploy frontend en Vercel.
- Verificar que el QR apunta al dominio de producción.

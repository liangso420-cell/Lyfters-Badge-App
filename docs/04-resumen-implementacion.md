# Resumen de implementación — Lyfter Badge App
**Última actualización:** Junio 2026

---

## Stack real implementado

| Capa | Tecnología |
|------|-----------|
| Frontend | HTML + CSS + JS vanilla, Tailwind CSS + DaisyUI (CDN), Firebase Web SDK |
| Backend | Python / Flask 3, flask-jwt-extended, flask-cors, flask-limiter |
| Base de datos | MongoDB Atlas (`lyfter_db`) vía PyMongo |
| Auth social | Firebase / Google OAuth (idToken verificado en el backend con `google-auth`) |
| Email | Resend (reset de contraseña), SendGrid (invitaciones de workspace) |
| Rate limiting | flask-limiter + Redis (Upstash en producción) |
| QR generación | librería `qrcode[pil]` en backend → base64 PNG |
| QR escaneo | `jsQR` en el navegador (cámara real vía `getUserMedia`) |
| Animaciones | Lottie (pato celebrando), Particles.js, estrellas canvas |
| i18n | 5 idiomas: es, en, de, fr, pt (archivos en `frontend/locales/`) |
| Deploy frontend | GitHub Pages via GitHub Actions (`./frontend/` → Pages) |
| Deploy backend | Render (Root Directory: `backend`, start: `gunicorn app:app`) |

---

## Colecciones MongoDB

| Colección | Descripción |
|-----------|-------------|
| `users` | Usuarios (participant / admin / superadmin / god_admin) |
| `events` | Eventos con fechas, premio, ubicación, XP config, tags, foto |
| `badges` | Badges por evento (token UUID, QR base64, XP, rareza, icono) |
| `scans` | Redenciones — índice único compuesto `(user_id, badge_id)` |
| `event_joins` | Membresía usuario↔evento (join previo al scan) |
| `achievements` | Definiciones de logros (slug, nombre, rareza, XP reward) |
| `user_achievements` | Logros desbloqueados — índice único `(user_id, achievement_id)` |
| `xp_log` | Auditoría de cada grant de XP |
| `workspaces` | Organizaciones multi-tenant |
| `workspace_members` | Membresía usuario↔workspace con rol |
| `invitations` | Invitaciones de workspace (código 6 chars, TTL 7 días) |
| `reviews` | Reseñas de eventos (rating 1–5, recommend, best_part) |

---

## Endpoints implementados

### `/auth` — autenticación y perfil

| Método | Ruta | Descripción |
|--------|------|-------------|
| POST | `/auth/register` | Registro email/password; acepta `invite_token` o `invite_code` |
| POST | `/auth/login` | Login; devuelve JWT con claims de workspace y rol |
| POST | `/auth/google` | Login/registro con idToken de Firebase |
| POST | `/auth/forgot-password` | Envía email de reset vía Resend |
| POST | `/auth/reset-password` | Aplica nuevo password con token de reset (TTL 1h) |
| GET | `/auth/profile` | Perfil completo + eventos/badges del usuario |
| POST | `/auth/profile/name` | Actualiza nombre |
| POST | `/auth/profile/email` | Actualiza email |
| POST | `/auth/profile/avatar` | Sube avatar en base64 (máx 2 MB; rate limit 5/h) |
| POST | `/auth/profile/privacy` | Configura privacidad (`show_in_leaderboard`, `show_badges`) |
| DELETE | `/auth/profile` | Elimina cuenta y scans del usuario |
| POST | `/auth/change-password` | Cambia contraseña verificando la actual |
| POST | `/auth/interests` | Guarda intereses (hasta 20 tags, para recomendaciones) |
| POST | `/auth/switch-workspace` | Re-emite JWT con claims del workspace indicado |
| POST | `/auth/refresh-token` | Re-emite JWT con datos frescos de la DB |
| GET | `/auth/achievements/definitions` | Lista todas las definiciones de logros |
| GET | `/auth/my-reviews` | Lista las reseñas del usuario autenticado |

### `/events` — eventos (participante)

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/events/` | Lista eventos activos con status calculado |
| GET | `/events/joined` | Eventos a los que el usuario se unió |
| GET | `/events/recommended` | Hasta 5 eventos recomendados según intereses |
| GET | `/events/<id>` | Detalle + badges + progreso del usuario autenticado |
| POST | `/events/<id>/join` | Une al usuario al evento; valida geolocalización si hay coords (máx 1 km) |
| POST | `/events/<id>/review` | Envía reseña (rating 1–5, una por usuario) |
| GET | `/events/<id>/reviews` | Lista reseñas (últimas 50) con promedio |
| DELETE | `/events/reviews/<review_id>` | Elimina reseña (admin+) |

### `/leaderboard`

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/leaderboard` | Top 8 por badges totales |
| GET | `/leaderboard/<event_id>` | Ranking del evento por XP |
| GET | `/leaderboard/global` | Top 8 global por XP + posición del usuario autenticado |

### `/redeem`

| Método | Ruta | Descripción |
|--------|------|-------------|
| POST/GET | `/redeem/<event_id>/<token>` | Canjea badge; exige join previo; otorga XP y evalúa logros; rate limit 10/min |

### `/profile` — XP y logros

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/profile/xp` | XP total, nivel actual, progreso al siguiente nivel |
| GET | `/profile/achievements` | Logros desbloqueados y bloqueados del usuario |

### `/admin`

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/admin/events` | Lista eventos del workspace |
| POST | `/admin/event` | Crea evento (con XP config: `xp_first_scan`, `xp_rare_bonus`, `xp_completion_bonus`) |
| PATCH | `/admin/events/<id>` | Edita evento (nombre, fechas, premio, active, location, XP) |
| DELETE | `/admin/events/<id>` | Elimina evento + badges + scans en cascada |
| POST | `/admin/events/<id>/location` | Actualiza ubicación en texto |
| POST | `/admin/events/<id>/coordinates` | Guarda lat/lng para geofencing |
| POST | `/admin/events/<id>/access-qr` | Genera QR de acceso al evento (apunta a `/join.html`) |
| POST | `/admin/events/<id>/photo` | Sube foto del evento en base64 (máx 3 MB) |
| POST | `/admin/events/<id>/tags` | Actualiza tags (hasta 20) |
| GET | `/admin/events/<id>/badges` | Lista badges con conteo de redenciones |
| POST | `/admin/events/<id>/badge` | Crea badge (UUID token, QR, XP, `is_rare`, `icon_url`) |
| PATCH | `/admin/events/<id>/badges/<badge_id>` | Edita badge |
| DELETE | `/admin/events/<id>/badges/<badge_id>` | Elimina badge + scans |
| POST | `/admin/badges/<badge_id>/regenerate-qr` | Regenera token UUID y QR |
| GET | `/admin/dashboard` | Métricas globales del workspace + progreso por evento |
| GET | `/admin/users` | Lista usuarios del workspace |
| PATCH | `/admin/users/<id>/role` | Cambia rol de usuario |
| GET | `/admin/leaderboard/xp` | Top 8 por XP (vista admin) |
| GET | `/admin/stats/global` | Stats globales de plataforma (`god_admin` only) |
| GET | `/admin/events/<id>/stats` | Stats detalladas: participantes, badge_stats, hourly_scans, reviews |

### `/workspaces` — multi-tenant

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/workspaces/mine` | Workspace activo del usuario |
| GET | `/workspaces/mine-all` | Todos los workspaces del usuario |
| POST | `/workspaces/` | Crea workspace (requiere `creation_code` salvo `god_admin`) |
| GET | `/workspaces/` | Lista todos los workspaces (`god_admin` only) |
| GET/PATCH/DELETE | `/workspaces/<id>` | Detalle, edición, eliminación del workspace |
| GET | `/workspaces/<id>/members` | Lista miembros |
| PATCH | `/workspaces/<id>/members/<uid>` | Cambia rol de miembro |
| DELETE | `/workspaces/<id>/members/<uid>` | Remueve miembro |
| POST | `/workspaces/<id>/invite` | Invita usuario por email o genera código de 6 chars (TTL 7 días) |
| GET | `/workspaces/<id>/invitations` | Lista invitaciones activas |
| POST | `/workspaces/join` | Acepta invitación por `code` o `token` |
| POST | `/workspaces/creation-code` | Genera código de creación de workspace (`god_admin`) |
| POST | `/workspaces/grant-god-admin` | Otorga rol `god_admin` por email |
| POST | `/workspaces/set-participant` | Degrada usuario a participante y borra membresías |
| GET | `/workspaces/platform/users` | Lista todos los usuarios con estado de ban |
| POST | `/workspaces/platform/users/<id>/ban` | Banea usuario (temporal o permanente, por cuenta y/o IP) |
| POST | `/workspaces/platform/users/<id>/unban` | Desbanea usuario |
| DELETE | `/workspaces/platform/users/<id>` | Elimina usuario de la plataforma |

---

## Logros implementados (10)

| Slug | Nombre | Rareza | XP | Condición |
|------|--------|--------|----|-----------|
| `first_scan` | Primer paso | common | 15 | 1 badge escaneado |
| `five_badges` | Coleccionista | common | 15 | 5 badges totales |
| `twenty_five_badges` | Gran Coleccionista | epic | 50 | 25 badges totales |
| `vertigo` | Vértigo | rare | 30 | 5 badges en menos de 1 hora |
| `first_event_complete` | Completista | rare | 30 | 1 evento completado |
| `three_completions` | Perfeccionista | epic | 75 | 3 eventos completados |
| `three_events` | Viajero | rare | 30 | 3 eventos distintos |
| `five_events` | Veterano | epic | 75 | 5 eventos distintos |
| `rare_badge` | Ojo de halcón | rare | 30 | 1 badge raro escaneado |
| `legend` | Leyenda | legendary | 100 | Alcanzar nivel 4 |

**Niveles XP:** Explorador (0) → Coleccionista (100) → Maestro badge (300) → Leyenda Lyfter (600)

---

## Seguridad implementada

- **Rate limiting** (flask-limiter + Redis): registro 3/10min, login participante 5/10min, login admin 3/20min, forgot-password 3/10min, redeem 10/min por usuario, avatar 5/h
- **IP Guard**: rechaza registro si ya hay ≥10 cuentas desde esa IP; verifica IP anclada en login
- **ProxyFix**: `x_for=1` para leer IP real detrás del load balancer de Render
- **Ban system**: ban temporal o permanente (cuenta y/o IP); verificado en login, switch-workspace y refresh-token
- **Índices únicos MongoDB**: barrera real contra race conditions en scans, logros y tokens
- **Firebase API key**: restringida por HTTP referrer a dominios autorizados + Identity Toolkit API only

---

## Páginas frontend (38 archivos HTML)

### Participante
`index.html` (hub), `landing.html`, `login.html`, `register.html`, `reset-password.html`  
`profile.html`, `profile-new.html`, `profile-achievements.html`, `profile-activity.html`, `profile-reviews.html`, `profile-stats.html`  
`events.html`, `event-detail.html`, `event-stats.html`, `scan.html`, `redeem.html`, `join.html`  
`leaderboard.html`, `reviews.html`, `stats.html`  
`workspace.html`, `workspace-create.html`, `workspace-edit.html`, `workspace-select.html`

### Admin
`admin-event.html`, `admin-event-create.html`, `admin-event-detail.html`  
`admin-participation.html` (dashboard), `admin-leaderboard.html`, `admin-reviews.html`  
`gestion-usuarios.html`

### Perfiles públicos
`user-achievements.html`, `user-events.html`, `user-ranking.html`

### Legales
`privacy.html`, `terms.html`

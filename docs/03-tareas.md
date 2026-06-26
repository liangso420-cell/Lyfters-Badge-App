# Task Document — Lyfter Badge App
**Versión:** 2.0  
**Última actualización:** Junio 2026  
**Equipo:** 5 personas | **Duración:** 3 semanas

---

## ✅ Implementado — estado al 25/06/2026

Todas las fases P0 (T01–T57) y las features P2 están completas. Adicionalmente se implementaron features fuera del scope original del programa.

**P0 completo (core):** registro, login, roles, eventos, badges, QR, redención, perfil con progreso, panel admin, deploy en producción.

**P2 completados:**
- P2-A (dashboard stats): `GET /admin/dashboard` + `GET /admin/events/<id>/stats` + página `admin-participation.html`
- P2-B (tiempo real): leaderboard y contadores se actualizan con polling
- P2-C (historial): eventos pasados en perfil + `GET /events/joined`

**Features adicionales implementados (fuera de scope original):**

**Backend — arquitectura:**
- Refactorizado a blueprints modulares: `routes/auth.py`, `events.py`, `admin.py`, `redeem.py`, `xp.py`, `workspaces.py`
- `services/achievements.py` y `services/xp.py` como capa de negocio separada
- `security/limiter.py` (flask-limiter + Redis), `security/ip_guard.py`, `security/middleware.py`
- `flask-jwt-extended` con claims extendidos (rol, workspace, nombre)
- ProxyFix para leer IP real detrás de Render

**Backend — nuevas rutas:**
- Google OAuth: `POST /auth/google` (Firebase idToken → JWT propio)
- Reset de contraseña: `POST /auth/forgot-password` + `POST /auth/reset-password` (Resend)
- Intereses: `POST /auth/interests` (hasta 20 tags para recomendaciones)
- Privacidad: `POST /auth/profile/privacy` (show_in_leaderboard, show_badges)
- Eliminar cuenta: `DELETE /auth/profile`
- Eventos recomendados: `GET /events/recommended`
- Join de evento: `POST /events/<id>/join` con validación de geofencing (Haversine, radio 1 km)
- Reviews: `POST /events/<id>/review`, `GET /events/<id>/reviews`
- Leaderboard global y por evento: `/leaderboard`, `/leaderboard/global`, `/leaderboard/<event_id>`
- XP: `GET /profile/xp`, `GET /profile/achievements`
- Definiciones de logros: `GET /auth/achievements/definitions`
- Ban system: `POST /workspaces/platform/users/<id>/ban`, `unban`, `DELETE`
- Workspaces completo: CRUD, miembros, invitaciones por email o código, god_admin, creation-code

**Backend — nuevas colecciones MongoDB:** event_joins, achievements, user_achievements, xp_log, workspaces, workspace_members, invitations, reviews (total: 12 colecciones)

**Frontend — nuevas páginas (38 total):**
- Auth: `reset-password.html`, login con Google (Firebase SDK)
- Perfil extendido: `profile-new.html`, `profile-achievements.html`, `profile-activity.html`, `profile-reviews.html`, `profile-stats.html`
- Eventos: `events.html`, `event-detail.html`, `event-stats.html`, `join.html`
- Workspaces: `workspace.html`, `workspace-create.html`, `workspace-edit.html`, `workspace-select.html`
- Admin extendido: `admin-event-create.html`, `admin-event-detail.html`, `admin-leaderboard.html`, `admin-reviews.html`
- Gestión: `gestion-usuarios.html`
- Perfiles públicos: `user-achievements.html`, `user-events.html`, `user-ranking.html`
- Social: `leaderboard.html`, `reviews.html`, `stats.html`
- Legales: `privacy.html`, `terms.html`
- Pública: `landing.html`

**Frontend — JS compartido:**
- `js/api.js` → `window.LyfterAPI` con ~50 métodos, timeout 15s, detección offline, mock completo
- `js/utils.js` → `window.LyfterUtils` con i18n, XP bar, achievements grid, drawer, skeletons
- `js/pato-celebrate.js` → animación Lottie del pato
- `frontend/locales/` → traducciones en es, en, de, fr, pt
- `db/seed.js` → 1 admin + 3 participantes + 2 eventos + 5 badges c/u + scans distribuidos

**Deploy:** migrado de Vercel a GitHub Pages; CI/CD via `.github/workflows/deploy.yml`.

---
 
---
 
## Convenciones del documento
 
- **ID:** prefijo por fase (T01, T09, etc.) — no reordenar IDs existentes al agregar tareas nuevas.
- **Criterio de done:** condición objetiva y verificable; si no se puede testear, no es un criterio de done.
- **Dependencias:** una tarea no puede iniciarse hasta que todas sus dependencias estén ✅.
- **Estimación:** S = ~2h, M = ~4h, L = ~8h (día completo).
- **Responsable:** asignar antes de iniciar la fase, no durante.
---
 
## FASE 1 — Setup del proyecto
**Objetivo de fase:** ambos servicios (backend + frontend) arrancan en local y se conectan a Atlas.  
**Deadline:** Semana 2 — Lunes, fin del día.
 
| ID | Tarea | Criterio de done | Dep. | Est. |
|----|-------|-----------------|------|------|
| T01 | Crear repo GitHub con carpetas `backend/` y `frontend/`; agregar `.gitignore` que excluya `.env` desde el primer commit | Repo creado y clonado; `.env` no aparece en `git status`; ambas carpetas existen | — | S |
| T02 | Crear `.env.example` con todas las variables del backend documentadas (sin valores reales); crear `.env` local con valores reales | `.env.example` commiteado al repo; `.env` ignorado por git; variables leídas por `config.py` | T01 | S |
| T03 | Crear `.env.example` del frontend con `VITE_API_URL`; crear `.env` local apuntando a `localhost:5000` | `.env.example` commiteado; `.env` ignorado; `VITE_API_URL` accesible en la app Vue | T01 | S |
| T04 | Conectar Flask con MongoDB Atlas vía PyMongo | `app.py` levanta y conecta a Atlas sin error; `db.py` expone las colecciones | T02 | S |
| T05 | Crear índices en MongoDB desde `db.py`: `users.email` único, `badges.token` único, `scans {user_id, badge_id}` único compuesto | Índices visibles en MongoDB Atlas UI; insertar duplicado en cualquier campo indexado lanza error | T04 | S |
| T06 | Definir helpers de documento en `models/`: `user.py`, `event.py`, `badge.py`, `scan.py` con campos requeridos y opcionales documentados | Helpers importables desde los blueprints sin error | T04 | S |
| T07 | Crear helper `serialize_doc` en `utils/serializer.py` que convierte `ObjectId` a `str` recursivamente | `jsonify(serialize_doc(doc))` no lanza `TypeError` para ningún documento de las 4 colecciones | T06 | S |
| T08 | Inicializar Vue + instalar Tailwind CSS + DaisyUI; verificar que los estilos de DaisyUI cargan | Componente de prueba con clase DaisyUI (`btn`, `card`) renderiza correctamente | T01 | M |
| T09 | Configurar Vue Router con rutas base declaradas (sin guards aún): `/login`, `/register`, `/profile`, `/redeem/:event_id/:token`, `/admin/events`, `/admin/badges`, `/admin/dashboard` | Navegar a cada ruta manualmente no lanza error 404 en el router | T08 | S |
| T10 | Instalar Pinia; crear store `auth.js` con state `token` y `user` inicializados desde `localStorage` | Store importable; `useAuthStore().isAuthenticated` retorna `true` si hay token en localStorage | T08 | S |
| T11 | Instalar axios; crear `services/api.js` con `baseURL = import.meta.env.VITE_API_URL` | Llamada de prueba a cualquier ruta del backend retorna respuesta (aunque sea 404) sin error de CORS | T03, T09 | S |
| T12 | Verificar que backend y frontend corren simultáneamente en local sin conflicto de puertos | `npm run dev` y `flask run` activos al mismo tiempo; frontend puede llamar al backend | T04, T11 | S |
 
---
 
## FASE 2 — Autenticación y seguridad
**Objetivo de fase:** registro, login y protección de rutas funcionando de punta a punta.  
**Deadline:** Semana 2 — Martes, fin del día.
 
| ID | Tarea | Criterio de done | Dep. | Est. |
|----|-------|-----------------|------|------|
| T13 | `POST /auth/register`: validar campos requeridos, hashear contraseña, insertar usuario, rechazar email duplicado con `409` | Registro exitoso retorna `201`; email duplicado retorna `409` con `{"error":"duplicate","message":"..."}` | T06 | M |
| T14 | `POST /auth/login`: verificar credenciales, generar JWT con claim `rol` y expiración de **8 horas**, retornar token | Login exitoso retorna `200` con JWT; credenciales incorrectas retornan `401`; decodificar el JWT muestra `exp` = `iat + 28800s` | T13 | M |
| T15 | Crear decorador `@require_auth` en `middleware/auth_guard.py`: extraer JWT del header `Authorization: Bearer`, validar firma y expiración, inyectar `current_user` en el contexto | Ruta protegida sin token retorna `401`; token expirado retorna `401`; token válido permite el acceso | T14 | M |
| T16 | Crear decorador `@require_admin` que aplica `@require_auth` y verifica `rol == "admin"` | Participante autenticado accediendo a ruta admin retorna `403`; admin pasa sin error | T15 | S |
| T17 | Definir patrón de respuesta JSON estándar y aplicarlo en todos los endpoints existentes: `{"success": true, "data": {...}}` para éxito, `{"success": false, "error": "code", "message": "..."}` para error | Todos los endpoints de auth retornan la estructura estándar; verificado con Postman/Thunder Client | T14 | S |
| T18 | Configurar CORS en Flask (`flask-cors`): en desarrollo permitir `localhost:5173`; la variable `CORS_ORIGINS` del `.env` define los orígenes permitidos | Frontend en localhost puede llamar al backend sin error de CORS en la consola del navegador | T04 | S |
| T19 | Interceptor de **request** en `services/api.js`: adjuntar `Authorization: Bearer <token>` en cada llamada si hay token en el store | Llamada a ruta protegida con sesión activa no retorna `401`; sin sesión retorna `401` esperado | T11, T15 | S |
| T20 | Interceptor de **response** en `services/api.js`: capturar `401` globalmente → llamar `auth.logout()` → redirigir a `/login?next=<ruta-actual>` | Con token expirado, cualquier llamada a la API redirige a login preservando la ruta; el interceptor se implementa UNA sola vez, no en cada componente | T19, T15 | M |
| T21 | Acciones `login(token, user)` y `logout()` en el store Pinia de auth: `login` guarda en `localStorage`; `logout` limpia `localStorage` y el state | Después de `logout()`, `localStorage` no contiene `lyfter_token` ni `lyfter_user`; después de recargar la página con sesión activa, el state se restaura correctamente | T10 | S |
| T22 | Vista `Login.vue`: formulario con validación básica (campos no vacíos), llamada a la API, manejo de error de credenciales incorrectas visible en la UI | Login con credenciales correctas guarda el token; credenciales incorrectas muestra mensaje de error sin recargar la página | T14, T21 | M |
| T23 | Vista `Register.vue`: formulario con validación, llamada a la API, feedback de email duplicado | Registro exitoso redirige a login con mensaje de confirmación; email duplicado muestra error claro | T13 | M |
| T24 | Guards de Vue Router: `requiresAuth` redirige a `/login?next=...`; `requiresAdmin` redirige a `/login` | Navegar a `/profile` sin sesión redirige a `/login?next=/profile`; navegar a `/admin/events` como participante redirige a `/login` | T21, T09 | M |
| T25 | Redirección post-login por rol + manejo de `?next=`: si `?next=` existe y empieza con `/`, navegar ahí; si no, redirigir por rol | Admin sin `?next=` va a `/admin/events`; participante sin `?next=` va a `/profile`; cualquier rol con `?next=/redeem/...` va a la URL de redención | T22, T24 | M |
 
---
 
## FASE 3 — Eventos
**Objetivo de fase:** el admin puede crear y listar eventos desde la UI.  
**Deadline:** Semana 2 — Martes, fin del día (paralelo con Fase 2).
 
| ID | Tarea | Criterio de done | Dep. | Est. |
|----|-------|-----------------|------|------|
| T26 | `POST /admin/event`: crear evento con nombre, descripción, fechas, premio; asociar `admin_id` del token | Evento creado en BD con todos los campos; campo `admin_id` viene del JWT, no del body | T16, T06 | M |
| T27 | `GET /events/`: retornar eventos cuya `fecha_fin >= hoy` (participante autenticado) | Solo eventos activos en la respuesta; evento con `fecha_fin` pasada no aparece | T15 | S |
| T28 | `GET /events/<id>`: retornar evento + lista de badges (sin campo `qr_image` para alivianar el payload) + premio | Respuesta incluye badges del evento; `qr_image` no está en la respuesta de este endpoint | T15 | S |
| T29 | Vista admin `Events.vue`: formulario crear evento + listado de eventos creados por el admin | Formulario crea evento y aparece en el listado sin recargar la página | T26, T27 | M |
 
---
 
## FASE 4 — Badges y QRs
**Objetivo de fase:** el admin puede crear badges con QR descargable.  
**Deadline:** Semana 2 — Miércoles, fin del día.
 
| ID | Tarea | Criterio de done | Dep. | Est. |
|----|-------|-----------------|------|------|
| T30 | `POST /admin/events/<id>/badge`: generar UUID v4 como token, construir `qr_url = FRONTEND_URL + /redeem/<event_id>/<token>`, generar imagen QR con librería `qrcode`, guardar `qr_image` en base64 y `qr_url` como string | Badge creado en BD con `token` único, `qr_image` en base64 y `qr_url` correcta; escanear el QR generado abre la URL esperada | T26, T07 | L |
| T31 | `GET /admin/events/<id>/badges`: retornar badges con estado de redención (total canjeados, lista de usuarios que canjearon) | Respuesta incluye conteo de redenciones por badge; badge sin redenciones retorna `redeemed_count: 0` | T16, T30 | M |
| T32 | Vista admin `Badges.vue`: formulario agregar badge + mostrar imagen QR tras crear + botón descargar PNG | Badge aparece en lista con QR visible; botón descarga un PNG válido que al escanearse abre la URL correcta | T30, T31 | L |
 
---
 
## FASE 5 — Redención de badges
**Objetivo de fase:** flujo completo de escaneo → badge → perfil, incluyendo el caso sin sesión.  
**Deadline:** Semana 2 — Jueves, fin del día.
 
| ID | Tarea | Criterio de done | Dep. | Est. |
|----|-------|-----------------|------|------|
| T33 | `POST /redeem/<event_id>/<token>` (ruta protegida con `@require_auth`): buscar badge por token, retornar `404` si no existe | Token inexistente retorna `{"success":false,"error":"not_found","message":"QR inválido"}` | T15, T30 | M |
| T34 | En `POST /redeem`: verificar que `event_id` del badge coincide con el de la URL; retornar `404` si no | Token de otro evento retorna `404` | T33 | S |
| T35 | En `POST /redeem`: verificar duplicado consultando `scans`; retornar `409` si ya existe `{user_id, badge_id}` | Segundo intento de canje del mismo badge retorna `409` con mensaje "Ya tienes este badge" | T33 | S |
| T36 | En `POST /redeem`: insertar documento en `scans`; verificar si el usuario completó TODOS los badges del evento | Scan insertado en BD; respuesta incluye `completed: true/false`; si `completed: true`, incluye campo `premio` con el texto/URL del premio | T35 | M |
| T37 | Vista `Redeem.vue`: al cargar la ruta, verificar sesión activa → llamar `POST /redeem` → manejar cada estado de respuesta (200, 409, 404, error de red) | Cada estado muestra UI diferente: cargando (spinner), éxito (modal), duplicado (aviso), QR inválido (error), sin red (error + reintentar) | T36, T25 | L |
| T38 | Componente `CelebrationModal.vue`: animación CSS (pulse o scale), nombre e ícono del badge, botón cerrar | Modal aparece con animación al obtener badge; cierre funcional; renderiza el nombre del badge correcto | T37 | M |
| T39 | En `CelebrationModal.vue`: si `completed: true`, mostrar sección especial con el premio del evento (texto destacado o imagen) | Premio visible solo cuando se completan todos los badges; sección oculta en redenciones parciales | T38 | S |
| T40 | Flujo sin sesión: la vista `Redeem.vue` no hace llamada a la API si no hay token (el guard ya redirigió a login con `?next=`); post-login, Vue Router navega a la URL de redención y la vista ejecuta el canje automáticamente | Escanear QR sin sesión → login → badge modal, sin requerir un segundo escaneo; flujo verificado de punta a punta | T37, T25 | M |
 
---
 
## FASE 6 — Perfil del participante
**Objetivo de fase:** el participante puede ver su progreso y acceder al escáner desde el perfil.  
**Deadline:** Semana 2 — Viernes, fin del día.
 
| ID | Tarea | Criterio de done | Dep. | Est. |
|----|-------|-----------------|------|------|
| T41 | `GET /me/badges`: retornar badges del usuario agrupados por evento, con `total_badges`, `redeemed_count` y flag `completed` por evento | Respuesta agrupa correctamente; `completed: true` solo cuando `redeemed_count == total_badges` | T36 | M |
| T42 | Vista `Profile.vue`: llamar `GET /me/badges`, renderizar selector de evento si hay más de uno, mostrar badges del evento seleccionado | Cambiar de evento en el selector actualiza los badges mostrados sin recargar la página | T41 | M |
| T43 | Componente `ProgressBar.vue`: recibir `redeemed` y `total` como props; renderizar barra y texto "X de Y badges" | Barra refleja porcentaje real; actualiza al cambiar el evento seleccionado | T42 | S |
| T44 | Componente `BadgeCard.vue`: estado obtenido (color, ícono visible) vs pendiente (gris, ícono bloqueado) — fiel al prototipo `diseño-previo.html` | Badges obtenidos visualmente distintos de los pendientes; diseño coherente con el prototipo | T42 | M |
| T45 | Mensaje de felicitación + revelación del premio en `Profile.vue` cuando `completed: true` | Mensaje destacado visible en el perfil al completar el evento; premio del evento mostrado | T42 | S |
| T46 | Estado de carga en `Profile.vue`: skeleton o spinner mientras carga `GET /me/badges` | Mientras la API responde, se muestra un placeholder; no se ve pantalla en blanco | T42 | S |
| T47 | Estado vacío en `Profile.vue`: mensaje cuando el participante no tiene badges aún | Mensaje motivador visible si `GET /me/badges` retorna lista vacía | T42 | S |
 
---
 
## FASE 7 — Panel admin y seguimiento
**Objetivo de fase:** el admin puede monitorear la participación; manejo de errores completo en toda la app.  
**Deadline:** Semana 3 — Martes, fin del día.
 
| ID | Tarea | Criterio de done | Dep. | Est. |
|----|-------|-----------------|------|------|
| T48 | Vista admin `Dashboard.vue`: tabla con badges del evento + columna "canjeados" + columna "% participación" | Tabla carga datos reales del endpoint `GET /admin/events/<id>/badges`; datos coinciden con los de BD | T31 | M |
| T49 | Auditar todos los endpoints: verificar que retornan la estructura JSON estándar en éxito y en error | Prueba con Postman/Thunder Client de cada endpoint; ninguno retorna HTML de error de Flask en lugar de JSON | T36, T31 | M |
| T50 | Implementar función global `showToast(type, message)` (DaisyUI toast/alert); usarla en todas las vistas para feedback al usuario | Toasts visibles en: login fallido, redención exitosa, duplicado, error de red; no hay `alert()` ni `console.log` en el código de producción | T37, T42, T48 | M |
| T51 | Estados de carga en todas las acciones de API: deshabilitar botón y mostrar spinner mientras la llamada está pendiente | Ningún botón de acción principal permite doble-click durante una llamada activa; verificado en login, crear evento, crear badge, redimir | T50 | M |
| T52 | Revisión responsive: verificar todas las vistas en viewport de 375 px (iPhone SE) | Login, perfil, modal de celebración y vista de redención operables en 375 px sin scroll horizontal ni zoom; botones con mínimo 44 px de alto táctil | T48 | M |
 
---
 
## FASE 8 — Deploy y producción
**Objetivo de fase:** app completamente funcional en los dominios de producción.  
**Deadline:** Semana 3 — Miércoles (no el jueves — necesitamos un día de margen).
 
| ID | Tarea | Criterio de done | Dep. | Est. |
|----|-------|-----------------|------|------|
| T53 | Setear variables de entorno en Render: `JWT_SECRET`, `MONGODB_URI`, `MONGODB_DB_NAME`, `FRONTEND_URL`, `CORS_ORIGINS` | Backend responde en el dominio de Render con las variables correctas; `GET /` o `GET /health` retorna 200 | T49 | S |
| T54 | Setear variable de entorno en Vercel: `VITE_API_URL` apuntando al dominio de Render | Frontend en Vercel puede llamar a la API sin error de CORS | T53 | S |
| T55 | Verificar que el QR generado en producción codifica la URL del dominio de Vercel (no localhost) | Escanear un QR generado en prod abre la URL correcta de Vercel | T53, T54 | S |
| T56 | Ejecutar checklist de producción completo: login, registro, crear evento, crear badge, descargar QR, escanear QR, ver perfil, ver panel admin | Flujo E2E ejecutado desde un dispositivo móvil real con datos reales en prod; todos los pasos exitosos | T55 | M |
| T57 | Documentar plan B de emergencia: cómo levantar el backend con `ngrok` en caso de fallo de Render el día de la demo | Documento de máximo media página con los pasos exactos; equipo lo conoce | T53 | S |
 
---
 
## FASE 9 — Preparación para la demo
**Objetivo de fase:** equipo listo para la demo en vivo con preguntas técnicas.  
**Deadline:** Semana 3 — Jueves, fin del día.
 
| ID | Tarea | Criterio de done | Dep. | Est. |
|----|-------|-----------------|------|------|
| T58 | Limpiar código: eliminar `console.log`, comentarios de debug y código comentado | `grep -r "console.log" src/` y `grep -r "print(" backend/` retornan vacío | T56 | S |
| T59 | Completar README con: descripción del proyecto, instrucciones de setup local, variables de entorno necesarias, guía de deploy | README legible por alguien externo que puede levantar el proyecto en local siguiendo las instrucciones | T56 | M |
| T60 | Cargar datos de prueba reales en producción: 1 evento demo con 4–5 badges, QRs impresos o en pantalla listos para la demo | Evento demo visible en prod; QRs escaneables; flujo completo verificado con datos de demo | T56 | S |
| T61 | Preparar respuestas técnicas del equipo para estas preguntas probables: (1) ¿Cómo manejan JWT expirado? (2) ¿Qué pasa si dos personas escanean el mismo QR? (3) ¿Cómo previenen que alguien comparta el QR? (4) ¿Por qué MongoDB y no SQL? (5) ¿Cómo funciona el guard de Vue Router? | Cada integrante puede responder al menos 3 de las 5 preguntas sin consultar el código | T59 | M |
| T62 | Ensayo de la demo: ejecutar el flujo completo desde producción en el orden de la presentación | Demo ejecutada de corrido sin errores en al menos 2 ensayos; tiempo total ≤ 10 minutos | T60, T61 | M |
 
---
 
## FASE 10 — Features P2 (puntos extra)
**Condición de inicio:** TODO el P0 (Fases 1–8) debe estar en producción y funcionando antes de tocar esta fase.  
**Orden de prioridad:** P2-A → P2-B → P2-C → P2-D (de mayor ROI a menor en tiempo disponible).
 
| ID | Tarea | Criterio de done | Dep. | Est. | Pts |
|----|-------|-----------------|------|------|-----|
| T63 | **P2-A** Endpoint `GET /admin/events/<id>/stats`: total participantes, total redenciones, badge más/menos canjeado, % de completados | Endpoint retorna métricas reales calculadas desde `scans`; protegido con `@require_admin` | T48 | M | +10 |
| T64 | **P2-A** Vista `Dashboard.vue`: ampliar con tarjetas de métricas + gráfico de barras (Chart.js o similar) por badge | Gráfico renderiza con datos reales; métricas numéricas con labels en español | T63 | L | — |
| T65 | **P2-B** Polling cada 10 segundos en `Dashboard.vue`: llamar al endpoint de badges/stats y actualizar contadores | Contadores se actualizan sin recargar; animación sutil al aumentar; polling se detiene en `onUnmounted` | T64 | M | +10 |
| T66 | **P2-C** Endpoint `GET /me/history`: eventos pasados (`fecha_fin < hoy`) con badges del usuario, paginado a 10 resultados | Retorna solo eventos pasados; evento activo no aparece; paginación funcional | T41 | M | +10 |
| T67 | **P2-C** Sección "Mis eventos anteriores" en `Profile.vue`: renderizar historial con los mismos componentes `BadgeCard` y `ProgressBar`; estado vacío si no hay historial | Sección visible solo cuando hay historial; componentes reutilizados sin duplicar código | T66, T43, T44 | M | — |
| T68 | **P2-D** Botón "Compartir" en `CelebrationModal.vue` y en `BadgeCard.vue` (badges ya obtenidos): usar Web Share API en móvil con fallback a botones de Twitter/X y WhatsApp | En móvil con Web Share API: abre menú nativo del SO; en desktop: botones individuales con URLs de intent; texto incluye nombre real del badge y del evento | T38, T44 | M | +10 |
 
---
 
## Resumen de puntos por criterio de evaluación
 
| Criterio | Peso | Tareas clave |
|----------|------|-------------|
| Funcionalidad core | 40 pts | Fases 1–6 completas (T01–T47) |
| Calidad de código | 20 pts | T07, T17, T49, T50, T58 |
| Diseño / UX | 20 pts | T44, T46, T47, T51, T52 |
| Demo y presentación | 20 pts | T60, T61, T62 |
| Dashboard stats (extra) | +10 pts | T63, T64 |
| Progreso en tiempo real (extra) | +10 pts | T65 |
| Historial de eventos (extra) | +10 pts | T66, T67 |
| Compartir en redes (extra) | +10 pts | T68 |
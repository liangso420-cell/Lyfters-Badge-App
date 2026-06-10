# Task Document — Lyfter Badge App

## Formato: ID | Tarea | Criterio de done | Dependencias

---

### FASE 1 — Setup del proyecto (Semana 2 — Lunes)

| ID | Tarea | Criterio de done | Dependencias |
|----|-------|------------------|--------------|
| T01 | Crear repo GitHub con carpetas `backend/` y `frontend/` | Repo creado y clonado; ambas carpetas existen | — |
| T02 | Configurar `.env` backend: `MONGO_URI`, `JWT_SECRET`, `PORT` | Variables definidas y leídas por `config.py` | T01 |
| T03 | Conectar Flask con MongoDB vía PyMongo | `app.py` levanta y conecta a Atlas sin error | T02 |
| T04 | Definir modelos: User, Event, Badge, Scan | Helpers/esquemas de documento creados en `models/` | T03 |
| T05 | Inicializar Vue + instalar Tailwind CSS + DaisyUI | Proyecto Vue corre con estilos cargados | T01 |
| T06 | Configurar variables de entorno del frontend (API base URL) | `.env` frontend con `VITE_API_URL` funcionando | T05 |
| T07 | Configurar Vue Router con estructura de rutas base | Rutas declaradas y navegables | T05 |
| T08 | Pantalla en blanco corriendo en local (backend + frontend) | Ambos servicios arrancan sin error en local | T03, T07 |

### FASE 2 — Autenticación (Semana 2 — Martes)

| ID | Tarea | Criterio de done | Dependencias |
|----|-------|------------------|--------------|
| T09 | `POST /auth/register` con validación de email único | Crea usuario; rechaza email duplicado | T04 |
| T10 | `POST /auth/login` con generación de JWT + rol embebido | Devuelve JWT válido con claim de rol | T09 |
| T11 | Decorador `require_auth` para rutas protegidas | Bloquea requests sin JWT válido (401) | T10 |
| T12 | Decorador `require_admin` para rutas de admin | Bloquea no-admins (403) | T11 |
| T13 | Pantalla `Login.vue` con formulario + validación | Login funcional contra la API | T10 |
| T14 | Pantalla `Register.vue` con formulario + validación | Registro funcional contra la API | T09 |
| T15 | Guardar JWT en `localStorage` del frontend | Token persiste entre recargas | T13 |
| T16 | Guard de Vue Router: redirigir por rol al hacer login | admin→/admin/events, participante→/profile | T15, T07 |
| T17 | Guard de Vue Router: bloquear rutas sin sesión | Redirige a `/login?next=...` | T15, T07 |

### FASE 3 — Eventos (Semana 2 — Martes)

| ID | Tarea | Criterio de done | Dependencias |
|----|-------|------------------|--------------|
| T18 | `POST /admin/event` con nombre, descripción, fechas, premio | Crea evento asociado al admin | T12 |
| T19 | `GET /events/` lista eventos activos (autenticado) | Devuelve eventos vigentes | T11 |
| T20 | `GET /events/<id>` detalle del evento + badges + premio | Devuelve evento con sus badges | T11 |
| T21 | Vista admin: formulario crear evento (`Events.vue`) | Crea evento desde la UI | T18 |
| T22 | Vista admin: listado de eventos creados | Muestra eventos del admin | T19, T21 |

### FASE 4 — Badges y QRs (Semana 2 — Miércoles)

| ID | Tarea | Criterio de done | Dependencias |
|----|-------|------------------|--------------|
| T23 | `POST /admin/events/<id>/badge` genera UUID token por badge | Crea badge con token único | T18 |
| T24 | Generar imagen QR con la URL `/redeem/<event_id>/<token>` (lib `qrcode`) | QR codifica la URL correcta | T23 |
| T25 | Guardar QR como base64 en la colección `badges` | Campo `qr_image` poblado | T24 |
| T26 | Vista admin: formulario agregar badge a evento (`Badges.vue`) | Crea badge desde la UI | T23 |
| T27 | Mostrar imagen QR generada en pantalla tras crear badge | QR visible al crear | T25, T26 |
| T28 | Botón descargar QR como imagen PNG | Descarga PNG funcional | T27 |

### FASE 5 — Redención de badges (Semana 2 — Jueves)

| ID | Tarea | Criterio de done | Dependencias |
|----|-------|------------------|--------------|
| T29 | `GET /redeem/<event_id>/<token>`: validar token en BD | Token inexistente → error "QR inválido" | T24 |
| T30 | Si no hay sesión JWT: redirigir a `/login?next=URL` | Redirección correcta | T17, T29 |
| T31 | Tras login exitoso: continuar con la redención pendiente | Canje automático post-login | T30 |
| T32 | Validar que el badge no fue canjeado ya por este usuario | Duplicado → "Ya tienes este badge" | T29 |
| T33 | Insertar documento en colección `scans` | Scan registrado en BD | T32 |
| T34 | Detectar si el usuario completó TODOS los badges del evento | Flag de completado correcto | T33 |
| T35 | Retornar: badge obtenido + flag completado + premio | Respuesta con datos completos | T34 |
| T36 | Página `Redeem.vue`: feedback visual claro al canjear | Estados (éxito/duplicado/error) visibles | T35 |
| T37 | Componente `CelebrationModal.vue` con animación CSS pulse | Modal animado al obtener badge | T36 |
| T38 | Si completó el evento: mostrar mensaje especial + revelar premio | Premio revelado en el último badge | T37 |

### FASE 6 — Perfil del participante (Semana 2 — Viernes)

| ID | Tarea | Criterio de done | Dependencias |
|----|-------|------------------|--------------|
| T39 | `GET /me/badges` agrupado por evento, con conteo y premio | Devuelve badges agrupados + progreso | T33 |
| T40 | Vista `Profile.vue`: selector de evento activo | Cambia el evento mostrado | T39 |
| T41 | Componente `ProgressBar.vue`: X de Y badges obtenidos | Barra refleja progreso real | T40 |
| T42 | Componente `BadgeCard.vue`: obtenido (color) vs pendiente (gris) | Estados visuales fieles al prototipo | T40 |
| T43 | Mensaje de felicitación + premio si el evento está completado | Se muestra al completar | T41, T42 |
| T44 | Botón flotante "📷 Escanear QR" fijo en la parte inferior | Visible y abre el escáner | T40 |

### FASE 7 — Panel admin y seguimiento (Semana 3 — Lunes/Martes)

| ID | Tarea | Criterio de done | Dependencias |
|----|-------|------------------|--------------|
| T45 | `GET /admin/events/<id>/badges` con estado de redención | Devuelve canjeados/participantes por badge | T33 |
| T46 | Vista admin `Dashboard.vue`: tabla badges + canjeados + participantes | Tabla fiel al prototipo | T45 |
| T47 | Manejo de errores en todos los endpoints (respuestas claras) | Errores con código + mensaje JSON | T35, T45 |
| T48 | Manejo de errores en la UI: mensajes cuando algo falla | Toasts/mensajes claros en fallos | T47 |

### FASE 8 — Deploy y producción (Semana 3 — Miércoles)

| ID | Tarea | Criterio de done | Dependencias |
|----|-------|------------------|--------------|
| T49 | Deploy backend Flask en Render con variables de entorno | API responde en dominio de Render | T47 |
| T50 | Deploy frontend Vue en Vercel con variables de entorno | App carga en dominio de Vercel | T48 |
| T51 | Verificar que el QR generado apunta al dominio de producción | QR codifica URL de Vercel | T49, T50 |
| T52 | Prueba del flujo completo desde producción (crear→QR→escanear→perfil) | Flujo E2E funciona en prod | T51 |

### FASE 9 — Preparación demo (Semana 3 — Jueves)

| ID | Tarea | Criterio de done | Dependencias |
|----|-------|------------------|--------------|
| T53 | Limpiar código y eliminar `console.log` / comentarios de debug | Código limpio | T52 |
| T54 | Completar README con instrucciones de setup local y deploy | README completo | T52 |
| T55 | Cargar datos de prueba reales en producción | Evento + badges demo en prod | T52 |
| T56 | Ensayo del flujo completo de la demo | Demo ejecutada sin errores | T55 |
| T57 | Cada integrante puede explicar técnicamente su parte del código | Equipo preparado | T56 |

---

✅ ETAPA 3 completa. Archivo guardado en /lyfter-badge-app/documentos/03-tareas.md
Todos los documentos están listos. Procediendo a implementar el proyecto
siguiendo las tareas en orden, marcando cada una como ✅ al completarla.
El diseño final del frontend debe ser fiel al prototipo en /lyfter-badge-app/diseño-previo.html.

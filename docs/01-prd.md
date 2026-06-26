# PRD — Lyfter Badge App
**Versión:** 2.0  
**Última actualización:** Junio 2026  
**Estado:** En desarrollo activo
 
---
 
## 1. Problema
 
En los eventos presenciales de Lyfter (summits, hackathons, workshops) la
participación de los asistentes en las distintas actividades suele ser pasiva y
difícil de medir: la gente entra y sale de charlas, stands y dinámicas sin un
incentivo claro para recorrer todo el evento, y los organizadores no tienen una
forma simple de saber cuánta gente realmente participó en cada actividad.
 
La **Lyfter Badge App** resuelve esto con un sistema de badges coleccionables
mediante códigos QR físicos repartidos por el evento. Al escanear el QR de cada
actividad, el asistente desbloquea un badge en su perfil. Completar todos los
badges revela un premio sorpresa.
 
Un sistema **gamificado** mejora la experiencia frente a dinámicas tradicionales
porque:
- Convierte el recorrido del evento en un reto con recompensa (motivación
  intrínseca + extrínseca).
- Da feedback inmediato y visual al asistente (progreso, celebración, premio).
- Genera datos accionables de participación en tiempo real para el organizador.
- Es de fricción casi nula: basta apuntar la cámara a un QR físico.
---
 
## 2. Objetivo
 
Métricas de éxito concretas:
 
1. **Flujo completo funcional de punta a punta en producción** — un participante
   puede registrarse, escanear un QR, ver su badge y completar el evento usando
   los dominios desplegados en Render (backend) y Vercel (frontend).
2. **Redención rápida** — desde que el participante autenticado escanea un QR
   válido hasta que ve la confirmación del badge transcurren **menos de 3
   segundos** en una conexión móvil estándar (4G/LTE).
3. **Visibilidad para el admin en tiempo real** — el administrador puede crear un
   evento, generar QRs descargables y consultar la participación (canjeados por
   badge) sin recargar manualmente la base de datos.
4. **Experiencia móvil sin fricciones** — el flujo completo de registro → escaneo
   → badge visible es completable en menos de **60 segundos** en un teléfono
   móvil con pantalla de 375 px de ancho, sin necesidad de hacer zoom ni scroll
   horizontal en ninguna pantalla.
---
 
## 3. Usuarios objetivo
 
### Participante
Asistente al evento. Llega, se registra/inicia sesión, recorre las actividades
escaneando los QR físicos, acumula badges y busca completar el evento para
desbloquear el premio sorpresa. Usa principalmente su **teléfono móvil** — esto
hace que el diseño mobile-first no sea opcional sino crítico para el core.
 
### Administrador Lyfter
Organizador del evento. Crea el evento (nombre, descripción, fechas, premio),
define los badges, genera e imprime los QRs físicos, los coloca en cada
actividad y monitorea la participación durante el evento. Usa principalmente
**desktop/laptop**.
 
---
 
## 4. Funcionalidades (en scope)
 
### P0 (bloqueante — core del proyecto)
- Registro e inicio de sesión (participante y admin) con **JWT**.
- Roles diferenciados: `admin` y `participante`.
- El admin puede crear eventos con nombre, descripción, fechas y premio.
- El admin puede agregar badges a un evento.
- El sistema genera automáticamente un **UUID token + QR** por cada badge.
- El admin puede descargar e imprimir el QR de cada badge.
- Escaneo de QR desde URL pública: `GET /redeem/<event_id>/<token>`.
- Si no hay sesión activa al escanear: redirigir a login con parámetro
  `?next=/redeem/<event_id>/<token>` y continuar la redención tras autenticarse.
- Registrar el badge para el participante autenticado.
- Prevención de duplicados (no canjear el mismo badge dos veces).
- Confirmación visual al canjear el badge (modal de celebración).
- Perfil del participante: badges agrupados por evento + barra de progreso.
- Al completar todos los badges del evento: revelar el premio.
- Panel admin: ver los badges generados por evento y su estado de redención.
### P1 (importante)
- Responsive: funcional en móvil (375 px), tablet y desktop — el layout de
  perfil y redención debe operar en una sola columna en pantallas pequeñas.
- Feedback visual claro en todas las acciones principales (spinners, skeletons,
  toasts de éxito/error).
- Manejo de errores de red en la UI con mensajes comprensibles para el usuario
  (no stack traces).
- Redirección automática por rol al iniciar sesión.
- Renovación o detección de JWT expirado con mensaje claro y redirección a login.
### P2 (nice to have — puntos extra según criterios del programa)
 
> Las especificaciones detalladas de cada feature P2 están en la
> **Sección 9 — Mini-specs P2**.
 
- **P2-A:** Dashboard de estadísticas para el admin (+10 pts).
- **P2-B:** Contador de progreso en tiempo real (+10 pts).
- **P2-C:** Historial de eventos pasados (+10 pts).
- **P2-D:** Compartir badge en redes sociales (+10 pts).
---
 
## 5. Out of scope
- Cualquier feature adicional antes de tener el core (P0) completo.
- Notificaciones push.
- Modo offline.
- Edición de eventos ya publicados (CRUD parcial — solo creación en P0).
---
 
## 6. Stack tecnológico (implementado)
 
### Backend
- **Flask 3** — blueprints por dominio (auth, events, admin, redeem, xp, workspaces).
- **flask-jwt-extended** — JWT con claims extendidos (rol, workspace). Expiración: **8 horas**.
- **MongoDB Atlas** — 12 colecciones: users, events, badges, scans, event_joins, achievements, user_achievements, xp_log, workspaces, workspace_members, invitations, reviews.
- **PyMongo** — CRUD con índices únicos como barrera contra race conditions.
- **flask-limiter + Redis** — rate limiting por IP y por usuario (Upstash en producción).
- **google-auth** — verificación de idTokens de Firebase para login con Google.
- **Resend / SendGrid** — emails de reset de contraseña e invitaciones de workspace.

### Frontend
- **HTML + JS vanilla** — 38 páginas HTML independientes (sin framework SPA).
- **Tailwind CSS + DaisyUI** — vía CDN, sin build step.
- **jsQR** — escaneo de cámara en el cliente (`getUserMedia` + canvas).
- **Firebase Web SDK** — login social con Google (idToken intercambiado por JWT propio).
- **Lottie + Particles.js** — animaciones de celebración y fondo.
- **i18n propio** — 5 idiomas (es, en, de, fr, pt) via `frontend/locales/`.

### Deploy
- **Render** — backend Flask (Root Directory: `backend`, start: `gunicorn app:app`).
- **GitHub Pages** — frontend (CI/CD via GitHub Actions desde `frontend/`).
- **MongoDB Atlas** — base de datos gestionada.
- **Redis (Upstash)** — rate limiting persistente en producción.

## 7. Criterios de aceptación
 
Formato: *Dado [contexto] → Cuando [acción] → Entonces [resultado]*
 
### Core — Redención de badges
 
**CA-01 · Redención sin sesión (flujo QR → login → redención)**
Dado que soy participante sin sesión activa →
Cuando escaneo un QR físico que apunta a `/redeem/<event_id>/<token>` →
Entonces el sistema me redirige a la pantalla de login con la URL de redención
preservada en el parámetro `?next=`, y tras autenticarme exitosamente soy
redirigido automáticamente a esa URL y el badge queda registrado en mi perfil
sin que tenga que escanear el QR una segunda vez.
 
**CA-02 · Flujo post-login con `?next=`**
Dado que fui redirigido al login desde un QR (la URL contiene `?next=`) →
Cuando completo el login (o me registro y luego inicio sesión) →
Entonces Vue Router lee el parámetro `?next=`, navega a esa ruta y ejecuta la
redención automáticamente, mostrando el modal de celebración del badge correcto.
*Criterio de done adicional: si `?next=` apunta a un dominio externo, el sistema
lo ignora y redirige al perfil del participante (prevención de open redirect).*
 
**CA-03 · Redención exitosa**
Dado que soy participante autenticado con sesión vigente →
Cuando navego a `/redeem/<event_id>/<token>` con un token válido y no canjeado →
Entonces aparece el modal de celebración con el nombre e imagen del badge, y el
badge queda visible en mi perfil con la barra de progreso actualizada; el tiempo
total desde la carga de la URL hasta ver el modal no supera 3 segundos en
conexión 4G.
 
**CA-04 · Prevención de duplicados**
Dado que ya tengo un badge en mi perfil →
Cuando navego al mismo QR de ese badge →
Entonces el sistema muestra un mensaje claro ("Ya tienes este badge") sin otorgar
el badge de nuevo ni generar una redención duplicada en la base de datos.
 
**CA-05 · Premio al completar todos los badges**
Dado que completé todos los badges del evento →
Cuando accedo a mi perfil o se resuelve la última redención →
Entonces aparece un mensaje de felicitación destacado y se revela el texto/imagen
del premio configurado por el admin para ese evento.
 
### Core — Administración
 
**CA-06 · Generación de QR**
Dado que soy admin autenticado →
Cuando creo un badge nuevo en un evento →
Entonces el sistema genera un UUID token único, crea el QR correspondiente y lo
muestra disponible para descargar como imagen (PNG o SVG) desde el panel.
 
**CA-07 · Seguimiento de participación**
Dado que soy admin autenticado →
Cuando accedo al panel de un evento →
Entonces veo la lista de todos los badges con: nombre del badge, cantidad de
redenciones y porcentaje de participantes que lo canjearon; los datos reflejan
el estado real sin necesidad de recargar la página manualmente.
 
### Autenticación y sesión
 
**CA-08 · JWT expirado durante el evento**
Dado que soy participante con sesión iniciada hace más de 8 horas (token
expirado) →
Cuando intento canjear un QR o acceder a cualquier ruta protegida →
Entonces el frontend detecta la respuesta `401 Unauthorized` del backend,
muestra un mensaje claro ("Tu sesión expiró, por favor vuelve a iniciar sesión"),
invalida el token almacenado localmente y redirige a login con el `?next=`
correspondiente para que el flujo de redención pueda reanudarse tras
reautenticarse.
*Criterio de done adicional: el interceptor de axios/fetch que maneja el 401
está implementado globalmente (no en cada componente por separado).*
 
**CA-09 · Redirección automática por rol**
Dado que inicio sesión exitosamente →
Cuando el backend retorna el JWT con el claim `role` →
Entonces el frontend redirige automáticamente: `admin` → panel de administración;
`participante` → perfil personal (salvo que exista un `?next=` activo, en cuyo
caso tiene prioridad sobre la redirección por rol).
 
### Responsive y UX móvil
 
**CA-10 · Layout responsive en móvil**
Dado que soy participante accediendo desde un teléfono de 375 px de ancho →
Cuando navego por cualquier pantalla de la app (login, perfil, redención, modal
de badge) →
Entonces todos los elementos son visibles y operables sin scroll horizontal ni
necesidad de hacer zoom; los botones de acción principal tienen al menos 44 px
de alto táctil; el modal de celebración ocupa el ancho completo de la pantalla.
 
**CA-11 · Estados de carga**
Dado que realizo cualquier acción que implica una llamada al backend (login,
escaneo, carga del perfil) →
Cuando la respuesta tarda más de 300 ms →
Entonces la UI muestra un indicador de carga (spinner o skeleton) que ocupa el
espacio del contenido esperado, y el botón que desencadenó la acción queda
deshabilitado para evitar envíos dobles.
 
**CA-12 · Errores de red**
Dado que realizo una acción que requiere conexión al backend →
Cuando la red falla o el servidor devuelve un error 5xx →
Entonces la UI muestra un mensaje de error comprensible en español ("No se pudo
conectar, intenta de nuevo"), no expone detalles técnicos al usuario, y ofrece
una acción para reintentar sin recargar toda la página.
 
---
 
## 8. Riesgos
 
### R-01 · Cámara no disponible o permisos denegados en el dispositivo del participante
 
**Descripción:** Algunos participantes pueden acceder desde dispositivos donde
el navegador no tiene permiso para usar la cámara, o desde navegadores que no
soportan la API `getUserMedia` (ej. navegadores en modo privado en iOS/Safari con
restricciones).
 
**Mitigación concreta:**
1. El QR físico es también una URL directa (`/redeem/<event_id>/<token>`): el
   escaneo nativo del sistema operativo (iOS Camera, Google Lens) abre la URL
   sin necesitar permisos de cámara en la app.
2. Dado que el vector principal de redención es la URL y no el escaneo in-app,
   el feature de escaneo desde la cámara dentro de la app es un complemento, no
   un requisito bloqueante.
3. Si se implementa el escaneo in-app, agregar un fallback: un campo de texto
   donde el participante pueda ingresar manualmente el código del QR en caso de
   que los permisos fallen.
4. **Acción inmediata:** probar el flujo completo en Safari iOS y Chrome Android
   antes de la Semana 3.
### R-02 · JWT expirado a mitad del evento
 
**Descripción:** Si el token expira mientras el participante está activamente
asistiendo al evento, todos sus intentos de redención fallarán con un 401 no
explicado, generando confusión y frustración.
 
**Mitigación concreta:**
1. Configurar el tiempo de expiración del JWT a **8 horas** desde la emisión —
   duración mayor a cualquier evento Lyfter estándar.
2. Implementar un **interceptor global** en el frontend (axios interceptor o
   fetch wrapper) que capture todos los 401 y ejecute la misma lógica:
   invalidar token local → mostrar toast de sesión expirada → redirigir a login
   con `?next=` para preservar el contexto.
3. Opcional (si hay tiempo en P1): implementar un endpoint `/auth/refresh` que
   acepte el token vigente y devuelva uno nuevo con tiempo extendido, invocado
   automáticamente cuando queden menos de 30 minutos de vigencia.
4. **Acción inmediata:** agregar el interceptor global en la Semana 1 junto con
   el setup de autenticación, no al final del proyecto.
### R-03 · Fallo del deploy en producción el día de la demo
 
**Descripción:** Problemas de configuración de variables de entorno, CORS,
conexión a MongoDB Atlas o cold start de Render pueden hacer que la app no
funcione en producción aunque funcione localmente.
 
**Mitigación concreta:**
1. **Deploy parcial en la Semana 2** (no el último día): desplegar el esqueleto
   de la app con al menos login y una ruta protegida funcionando en los dominios
   reales de Render y Vercel.
2. Crear un **checklist de producción** que el equipo ejecute 48 horas antes de
   la demo: variables de entorno seteadas en Render y Vercel, CORS apuntando al
   dominio de Vercel, IP del equipo en la allowlist de MongoDB Atlas, cold start
   verificado haciendo una petición real.
3. Tener un **plan B documentado**: si el deploy de Render falla, correr el
   backend localmente con `ngrok` y actualizar la variable `VITE_API_URL` en
   Vercel — esto puede hacerse en menos de 5 minutos si el procedimiento está
   escrito de antemano.
4. Asignar a **una persona del equipo** como responsable de infraestructura desde
   la Semana 1; esa persona es la única que hace cambios en producción y conoce
   todas las credenciales.
### R-04 · Sobrecarga de MongoDB Atlas en el plan gratuito durante la demo
 
**Descripción:** El tier gratuito de Atlas tiene límites de conexiones
concurrentes y operaciones por segundo que pueden generar errores si varios
instructores usan la app simultáneamente durante la demo.
 
**Mitigación concreta:**
1. Usar **connection pooling** en PyMongo (configurar `maxPoolSize` en la cadena
   de conexión).
2. Crear índices en los campos de consulta frecuente desde el inicio: `token` en
   la colección de badges, `user_id + badge_id` en la colección de redenciones.
3. Para la demo, el escenario es de pocos usuarios simultáneos (≤10); verificar
   que el plan M0 de Atlas lo soporta y tener el plan M2 como respaldo si se
   detectan timeouts en staging.
---
 
## 9. Mini-specs P2
 
> Estas especificaciones son para los features de puntos extra. El equipo solo
> debe abordarlos cuando **todo el P0 esté en producción y funcionando**. Cada
> mini-spec incluye alcance exacto, criterio de done y lo que queda fuera.
 
---
 
### P2-A · Dashboard de estadísticas para el admin (+10 pts)
 
**Objetivo:** Dar al admin una vista de resumen del evento con métricas de
participación, sin necesidad de revisar la lista badge por badge.
 
**Alcance:**
- Una nueva pantalla o sección del panel admin accesible desde el menú principal.
- Métricas a mostrar:
  - Total de participantes registrados en el evento.
  - Total de redenciones realizadas.
  - Badge más canjeado y badge menos canjeado.
  - Porcentaje de participantes que completaron el 100 % de los badges.
  - Gráfico de barras: redenciones por badge (nombre del badge en eje X, cantidad
    en eje Y). Puede usarse Chart.js o la librería de gráficos compatible con Vue.
**Criterio de done:**
- [ ] La pantalla carga los datos reales desde el backend (no datos hardcodeados).
- [ ] El gráfico de barras es legible en desktop (el admin usa laptop).
- [ ] Las métricas numéricas tienen labels claros en español.
- [ ] El endpoint de backend que agrega los datos está protegido con rol `admin`.
- [ ] Los datos se actualizan al recargar la página (no se requiere tiempo real
  para este feature; eso lo cubre P2-B).
**Fuera de alcance:** exportar datos a CSV, filtros por rango de fechas,
comparativa entre eventos.
 
---
 
### P2-B · Contador de progreso en tiempo real (+10 pts)
 
**Objetivo:** El admin puede ver cómo aumentan las redenciones durante el evento
sin recargar la página manualmente.
 
**Alcance:**
- En el panel admin, los contadores de redenciones por badge se actualizan
  automáticamente a medida que los participantes canjean.
- Implementación recomendada: **polling** cada 10 segundos con `setInterval` y
  una llamada al endpoint existente de participación. (Alternativa más avanzada:
  Server-Sent Events si el equipo tiene tiempo.)
- Indicador visual sutil (ej. badge counter se anima brevemente en verde) cuando
  el número aumenta, para que el admin note el cambio sin mirar fijamente.
**Criterio de done:**
- [ ] Los contadores en el panel admin se actualizan sin recargar la página.
- [ ] La actualización ocurre con un intervalo máximo de 15 segundos.
- [ ] Si la conexión falla durante el polling, se muestra un mensaje discreto
  ("Sin conexión — reintentando...") y el polling se reanuda automáticamente.
- [ ] El polling se detiene cuando el admin navega fuera del panel (el
  `setInterval` se limpia en el lifecycle hook `onUnmounted` del componente Vue).
- [ ] No genera más de 1 petición concurrente al mismo tiempo (si la petición
  anterior no terminó, la siguiente espera).
**Fuera de alcance:** WebSockets, actualización en tiempo real en el perfil del
participante (solo aplica al panel admin).
 
---
 
### P2-C · Historial de eventos pasados (+10 pts)
 
**Objetivo:** El participante puede ver los eventos anteriores en los que
participó, con los badges que coleccionó en cada uno.
 
**Alcance:**
- En el perfil del participante, una sección adicional debajo del evento activo:
  "Mis eventos anteriores".
- Cada evento pasado muestra: nombre del evento, fecha, badges coleccionados
  (con ícono) y si completó o no el evento (badge de "completado" o progreso
  parcial).
- Un evento se considera "pasado" cuando su `fecha_fin` es anterior a la fecha
  actual del servidor.
- El endpoint de backend filtra los eventos por estado y retorna el historial
  del participante autenticado.
**Criterio de done:**
- [ ] La sección de historial aparece en el perfil solo cuando el participante
  tiene al menos un evento pasado.
- [ ] Los badges del historial se renderizan igual que los del evento activo
  (mismos componentes visuales, reutilización de código).
- [ ] Si el participante no tiene historial, se muestra un estado vacío con
  mensaje motivador ("¡Participa en más eventos para ver tu historial!").
- [ ] El endpoint está paginado o limitado a los últimos 10 eventos para evitar
  payloads grandes.
- [ ] Los eventos activos no aparecen en el historial.
**Fuera de alcance:** búsqueda dentro del historial, filtros por fecha,
exportación del historial.
 
---
 
### P2-D · Compartir badge en redes sociales (+10 pts)
 
**Objetivo:** El participante puede compartir un badge específico en redes
sociales (Twitter/X, WhatsApp) directamente desde el modal de celebración.
 
**Alcance:**
- En el modal de celebración que aparece al canjear un badge, agregar dos botones
  de compartir: **Twitter/X** y **WhatsApp**.
- El contenido a compartir es un texto preformateado en español:
  `"¡Acabo de desbloquear el badge '[Nombre del Badge]' en [Nombre del Evento] con @Lyfter! 🎉 #LyfterBadges"`
- La URL que se comparte es la URL pública del perfil del participante (si existe)
  o la URL del evento.
- La implementación usa **Web Share API** (`navigator.share`) como método
  principal en móvil. Si el navegador no soporta Web Share API, mostrar los
  botones de Twitter/X y WhatsApp con enlaces directos a sus respectivas APIs de
  intent (`twitter.com/intent/tweet?text=...`, `wa.me/?text=...`).
- No se requiere ninguna integración OAuth ni API key de redes sociales.
**Criterio de done:**
- [ ] En móvil con Web Share API disponible: el botón "Compartir" abre el menú
  nativo de compartir del sistema operativo.
- [ ] En desktop o navegadores sin Web Share API: se muestran botones
  individuales de Twitter/X y WhatsApp que abren nueva pestaña.
- [ ] El texto compartido incluye el nombre real del badge y del evento (no texto
  hardcodeado).
- [ ] Los botones de compartir también aparecen en el perfil, junto a cada badge
  ya coleccionado (no solo en el modal de celebración).
- [ ] El feature no rompe el modal de celebración si falla (los botones de
  compartir son un complemento, no bloquean el cierre del modal).
**Fuera de alcance:** generación de imagen del badge para compartir (Open Graph
card), integración con Instagram, métricas de cuántas veces se compartió.
 
---
 
## 10. Notas para la demo final
 
> Esta sección no forma parte del spec del producto pero es relevante para el
> contexto académico del proyecto.
 
- Los instructores evaluarán **funcionalidad core (40 pts)** — asegurarse de
  demostrar: registro, login, redención de QR, perfil con progreso y panel admin.
- Para **calidad de código (20 pts)**: separación de concerns entre rutas Flask
  y lógica de negocio, componentes Vue reutilizables, manejo consistente de
  errores.
- Para **diseño/UX (20 pts)**: mostrar la experiencia desde el celular del
  participante (escaneo real con un QR impreso o en pantalla), y el panel admin
  en laptop.
- Los features P2 completados suman hasta **+40 pts extra** — abordarlos en orden
  de P2-A → P2-B → P2-C → P2-D según tiempo disponible.
- Preparar respuestas para preguntas técnicas probables: ¿cómo manejan la
  expiración del JWT?, ¿qué pasa si dos personas escanean el mismo QR al mismo
  tiempo?, ¿cómo evitan que alguien comparta el QR y lo use múltiples veces?
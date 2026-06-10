# PRD — Lyfter Badge App

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

## 2. Objetivo
Métricas de éxito concretas:
1. **Flujo completo funcional de punta a punta en producción** — un participante
   puede registrarse, escanear un QR, ver su badge y completar el evento usando
   los dominios desplegados en Render (backend) y Vercel (frontend).
2. **Redención rápida** — desde que el participante autenticado escanea un QR
   válido hasta que ve la confirmación del badge transcurren **menos de 3
   segundos**.
3. **Visibilidad para el admin en tiempo real** — el administrador puede crear un
   evento, generar QRs descargables y consultar la participación (canjeados por
   badge) sin recargar manualmente la base de datos.

## 3. Usuarios objetivo

### Participante
Asistente al evento. Llega, se registra/inicia sesión, recorre las actividades
escaneando los QR físicos, acumula badges y busca completar el evento para
desbloquear el premio sorpresa. Usa principalmente su **teléfono móvil**.

### Administrador Lyfter
Organizador del evento. Crea el evento (nombre, descripción, fechas, premio),
define los badges, genera e imprime los QRs físicos, los coloca en cada
actividad y monitorea la participación durante el evento. Usa principalmente
**desktop/laptop**.

## 4. Funcionalidades (en scope)

### P0 (bloqueante — core del proyecto)
- Registro e inicio de sesión (participante y admin) con **JWT**.
- Roles diferenciados: `admin` y `participante`.
- El admin puede crear eventos con nombre, descripción, fechas y premio.
- El admin puede agregar badges a un evento.
- El sistema genera automáticamente un **UUID token + QR** por cada badge.
- El admin puede descargar e imprimir el QR de cada badge.
- Escaneo de QR desde URL pública: `GET /redeem/<event_id>/<token>`.
- Si no hay sesión activa al escanear: redirigir a login (y continuar la
  redención tras autenticarse).
- Registrar el badge para el participante autenticado.
- Prevención de duplicados (no canjear el mismo badge dos veces).
- Confirmación visual al canjear el badge (modal de celebración).
- Perfil del participante: badges agrupados por evento + barra de progreso.
- Al completar todos los badges del evento: revelar el premio.
- Panel admin: ver los badges generados por evento y su estado de redención.

### P1 (importante)
- Responsive: funcional en móvil, tablet y desktop.
- Feedback visual claro en todas las acciones principales.
- Manejo de errores en la UI con mensajes claros.
- Redirección automática por rol al iniciar sesión.

### P2 (nice to have — puntos extra según criterios del programa)
- Dashboard de estadísticas para el admin.
- Contador de progreso en tiempo real.
- Historial de eventos pasados.

## 5. Out of scope
- Cualquier feature adicional antes de tener el core (P0) completo.
- Notificaciones push.
- Compartir badge en redes sociales (puede agregarse como extra al final).
- Modo offline.

## 6. Stack tecnológico (según especificaciones del programa)

### Backend
- **Flask** — framework web Python: rutas y lógica de negocio.
- **JWT** — autenticación y protección de rutas por rol.
- **MongoDB** — base de datos NoSQL: eventos, badges, usuarios, redenciones.
- **PyMongo** — conector Flask ↔ MongoDB.

### Frontend
- **Vue.js** — framework JS para pantallas reactivas (SPA).
- **Tailwind CSS + DaisyUI** — estilos utilitarios y componentes visuales.
- **html5-qrcode** o **jsQR** — escaneo de cámara en el cliente.

### Deploy
- **Render** — backend Flask.
- **Vercel** — frontend Vue.
- **MongoDB Atlas** — base de datos gestionada.

## 7. Criterios de aceptación
Formato: *Dado [contexto] → Cuando [acción] → Entonces [resultado]*

1. **Redención sin sesión**
   Dado que soy participante sin sesión → Cuando escaneo un QR → Entonces me
   redirige a login y, tras autenticarme, se registra el badge automáticamente.

2. **Redención exitosa**
   Dado que soy participante autenticado → Cuando escaneo un QR válido →
   Entonces aparece el modal de celebración y el badge queda en mi perfil.

3. **Prevención de duplicados**
   Dado que ya tengo un badge → Cuando escaneo el mismo QR → Entonces el sistema
   me avisa que ya fue canjeado, sin otorgarlo de nuevo.

4. **Premio al completar**
   Dado que completé todos los badges → Cuando veo mi perfil → Entonces aparece
   un mensaje de felicitación y se revela el premio del evento.

5. **Generación de QR**
   Dado que soy admin → Cuando creo un badge → Entonces el sistema genera un
   UUID token y un QR descargable.

6. **Seguimiento de participación**
   Dado que soy admin → Cuando accedo al panel → Entonces veo todos los badges
   del evento con su estado de redención.

## 8. Riesgos
- **Cámara no disponible en algunos dispositivos** → el escaneo ocurre vía URL
  al apuntar el QR físico; la app web no depende exclusivamente de la cámara
  in-app (el QR físico abre directamente la URL de redención).
- **JWT expirado durante el evento** → manejar refresh o sesión extendida para
  cubrir la duración completa del evento.
- **Deploy falla en producción** → no dejarlo para el último día; hacer un deploy
  parcial desde el miércoles de la Semana 3 para detectar problemas a tiempo.

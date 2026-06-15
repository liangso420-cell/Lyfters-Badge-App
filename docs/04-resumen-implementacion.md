# Resumen de implementación — Lyfter Badge App

## Stack
- Frontend: HTML + Tailwind + DaisyUI → GitHub Pages
- Backend: Flask + MongoDB → Render
- Modo mock disponible para pruebas sin servidor

## Lo que se construyó

### Scanner QR (scan.html)
- Cámara real con getUserMedia + jsQR
- visibility:hidden en canvas para que jsQR funcione en móvil
- Extrae event y token de la URL del QR con new URL().searchParams

### Panel Admin — Badges (admin-badges.html)
- QR reales generados con librería qrcode en canvas
- Descarga como PNG
- Eliminar badge con confirmación

### Panel Admin — Eventos (admin-event.html)
- Lista de eventos con fechas legibles
- Eliminar evento (borra badges y scans en cascada)

### Dashboard Admin (admin-participation.html)
- Métricas: participantes, eventos, badges creados, badges canjeados
- Barras de progreso por evento
- Tabla de usuarios con cambio de rol admin/participante

### Perfil (profile.html)
- Cambio de contraseña con modal y validación

### Backend (app.py)
- DELETE /admin/events/<id>
- DELETE /admin/events/<id>/badges/<id>
- GET /admin/dashboard
- GET /admin/users
- PATCH /admin/users/<id>/role
- POST /auth/change-password
- CORS configurado correctamente
- Filtro de eventos pasados en GET /events/
- DuplicateKeyError devuelve 409

### Base de datos (db.py)
- init_indexes() con índices únicos
- logging en lugar de print()

### API (api.js)
- deleteEvent, deleteBadge, getDashboard, getUsers,
  changeUserRole, changePassword, regenerateBadgeQr
- Mock y backend para todos los métodos
- Timeout 15 segundos
- Detección offline

### Infraestructura
- CORS_ORIGINS con GitHub Pages
- Root Directory corregido a backend/

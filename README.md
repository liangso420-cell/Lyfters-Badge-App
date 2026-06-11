# Lyfter Badge App — versión Vanilla (HTML + CSS + JS puro)

App funcional en HTML + CSS + **JS puro (sin frameworks)**. Tiene dos modos de datos
(ver `js/config.js`):

- **`backend` (recomendado)** — consume una API Flask real: datos persistentes en
  MongoDB, multiusuario y QR reales. Ver "Conectar al backend" más abajo.
- **`mock`** — datos simulados en el navegador (`localStorage`). Cero configuración;
  ideal para demo offline o probar la UI. Es el valor por defecto para que la app
  funcione al abrirla sin pasos previos.

## Cómo abrir (modo mock, sin configuración)
Abre `index.html` en el navegador (doble clic). No requiere build ni servidor.

> Necesita conexión a internet para cargar Tailwind, DaisyUI y la fuente Poppins por CDN.

## Cuentas de demo
| Rol | Email | Contraseña |
|-----|-------|------------|
| Admin | `admin@lyfter.cc` | `admin123` |
| Participante | `ana@correo.com` | `ana123` |

También puedes **registrar** una cuenta nueva (queda como participante).

## Estructura
```
app-vanilla/
├── index.html        estructura principal + CDNs y config de Tailwind
├── css/styles.css     estilos propios extraídos del boceto
├── js/config.js       flag de modo de datos ('mock' | 'backend')
├── js/api.js          capa de datos: implementación mock + cliente del backend Flask
├── js/app.js          router + vistas + interactividad (consume js/api.js)
└── assets/            (vacío: el boceto sólo usa emojis y un SVG inline)
```

## Conectar al backend Flask (recomendado)
Las vistas no saben de dónde vienen los datos: hablan con `window.LyfterAPI`
(`js/api.js`), que tiene dos implementaciones detrás de la misma interfaz async.

> El código del backend Flask **no está en esta carpeta** (se quitó para dejar la v2
> mínima), pero sigue en el historial de git. Recupéralo con:
> ```bash
> git checkout HEAD -- backend
> ```

Para activarlo:
1. **Levanta el backend** (necesita MongoDB):
   ```bash
   cd backend
   python -m venv .venv && source .venv/bin/activate   # Windows: .venv\Scripts\activate
   pip install -r requirements.txt
   cp .env.example .env        # completa MONGO_URI, JWT_SECRET, etc.
   python seed.py              # opcional: crea admin@lyfter.cc / admin123 + evento demo
   python app.py               # API en http://localhost:5000
   ```
2. **Sirve esta app por HTTP** (no `file://`) para tener un origen válido para CORS.
   Ej.: `cd app-vanilla && python -m http.server 5500` → http://localhost:5500
3. **Habilita CORS** para ese origen: en `backend/.env` añade tu origen a
   `CORS_ORIGINS` (por defecto solo permite `http://localhost:5173`):
   ```
   CORS_ORIGINS=http://localhost:5173,http://localhost:5500
   ```
   y reinicia el backend.
4. **Cambia el flag** en `js/config.js`:
   ```js
   window.LYFTER_CONFIG = { mode: 'backend', apiBaseUrl: 'http://localhost:5000' };
   ```

Mapeo que hace `js/api.js` (boceto/UI ↔ API): `name↔nombre`, `desc↔descripcion`,
`prize↔premio`, `emoji↔icon`, `qrImage↔qr_image`, `role:'participant'↔rol:'participante'`.
El JWT se guarda en `localStorage` y se envía como `Authorization: Bearer <token>`.

En modo `backend`, el panel admin muestra el **QR real** (PNG generado por el backend,
campo `qr_image`) y "Descargar QR" baja ese `.png`. En modo `mock` se usa un QR placeholder
SVG (y la descarga es `.svg`), porque el mock no genera imágenes QR reales.

## Reiniciar la demo
En la consola del navegador: `lyfterReset()` restaura los datos semilla.

## Mapa de vistas (hash routing)
- `#/login`, `#/register` — autenticación
- `#/profile` — perfil del participante (progreso, grid de badges, botón flotante escanear)
- `#/scan` — escáner QR (toca el visor para simular un escaneo)
- `#/admin/event` — crear evento
- `#/admin/badges` — gestión de badges + QR
- `#/admin/participation` — seguimiento de participación

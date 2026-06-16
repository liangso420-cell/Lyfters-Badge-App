/* ============================================================
   Lyfter Badge App — configuración de la fuente de datos
   ------------------------------------------------------------
   Cambia `mode` para alternar entre:
     'backend' → (RECOMENDADO) consume la API Flask real: datos persistentes
                 en MongoDB, multiusuario y QR reales. Requiere el backend
                 corriendo y CORS habilitado.
     'mock'    → datos simulados en el navegador (localStorage). Sin servidor
                 ni configuración; ideal para demo offline o probar la UI.

   El valor por defecto se deja en 'mock' para que la app abra y funcione sin
   ningún paso previo. Para el uso real, cambia a 'backend' siguiendo los pasos.

   Para usar el backend (recomendado):
     1) El código del backend Flask no está en esta carpeta (se quitó para dejar
        la v2 mínima). Recupéralo desde git:   git checkout HEAD -- backend
     2) Levanta la API:   cd backend && python app.py   (http://localhost:5000)
        (opcional)        python seed.py  → admin@lyfter.cc / admin123
     3) Sirve esta app por HTTP (no file://):  python -m http.server 5500
     4) Añade tu origen a CORS_ORIGINS en backend/.env (ej. http://localhost:5500).
     5) Pon  mode: 'backend'  aquí abajo.
   ============================================================ */

window.LYFTER_CONFIG = {
  mode: 'backend',
  apiBaseUrl: 'https://lyfters-badge-app.onrender.com',
};

// Configuración Firebase para Google Auth
// Reemplazar con los valores reales del proyecto Firebase
window.FIREBASE_CONFIG = {
apiKey: "AIzaSyBedpuxJ7I4kVoi-0tni1rFjpFHgZUDd1A",
authDomain: "lyfter-badge-app.firebaseapp.com",
projectId: "lyfter-badge-app",
storageBucket: "lyfter-badge-app.firebasestorage.app",
messagingSenderId: "538632921235",
appId: "1:538632921235:web:78187a34fc7800e25cad66"
};

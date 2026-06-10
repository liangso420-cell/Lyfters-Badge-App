/* ============================================================
   Lyfter Badge App — configuración de la fuente de datos
   ------------------------------------------------------------
   Cambia `mode` para alternar entre:
     'mock'    → datos simulados en el navegador (localStorage).
                 Funciona sin servidor; ideal para demo offline.
     'backend' → consume la API Flask real del repo (carpeta backend/).
                 Requiere el backend corriendo y CORS habilitado.

   Para usar el backend:
     1) Levanta la API:   cd backend && python app.py   (http://localhost:5000)
        (opcional)        python seed.py  → admin@lyfter.cc / admin123
     2) Pon  mode: 'backend'  aquí abajo.
     3) Asegúrate de que CORS_ORIGINS en backend/.env incluya el origen desde
        el que abres esta app (ej. http://localhost:5500 si usas Live Server,
        o file:// si tu navegador lo permite — mejor servirla por http).
   ============================================================ */
window.LYFTER_CONFIG = {
  mode: 'mock',
  apiBaseUrl: 'http://localhost:5000',
};

# Prompt para Claude Code — Agregar Login con Google a Lyfter Badge App

## Contexto del proyecto

Lyfter Badge App es una app de gamificación para eventos públicos donde los participantes escanean QR para coleccionar badges. Es un evento abierto donde cualquier persona puede registrarse.

**Stack actual:**
- Frontend: HTML + CSS + JS puro (Tailwind + DaisyUI via CDN)
- Backend: Python Flask + MongoDB + JWT propio (`flask-jwt-extended`)
- Auth actual: email/contraseña con bcrypt, endpoint `POST /auth/login` que devuelve un JWT

**Objetivo:** Agregar Google como opción adicional de login/registro. El login con email/contraseña existente debe seguir funcionando sin cambios.

---

## Lo que hay que hacer

### 1. Crear un proyecto Firebase (instrucciones para el desarrollador — no lo hace Claude Code)

Antes de ejecutar este prompt, el desarrollador debe:
1. Ir a https://console.firebase.google.com
2. Crear un proyecto nuevo (ej: `lyfter-badge`)
3. Agregar una app web y copiar el objeto `firebaseConfig`
4. En Authentication → Métodos de inicio → habilitar **Google**
5. En Authentication → Settings → Authorized domains → agregar el dominio de Vercel (ej: `lyfter.vercel.app`) y `localhost`
6. Tener listo el `firebaseConfig` con: `apiKey`, `authDomain`, `projectId`, `appId`

---

### 2. Backend Flask — agregar endpoint `POST /auth/google`

En `backend/app.py`, agregar:

**Dependencia nueva** en `requirements.txt`:
```
google-auth>=2.28
```

**Endpoint nuevo** (no tocar nada del auth existente):

```python
from google.oauth2 import id_token
from google.auth.transport import requests as grequests

@app.route("/auth/google", methods=["POST"])
def google_login():
    """
    Recibe un idToken de Firebase/Google desde el frontend.
    Verifica el token con Google, busca o crea el usuario en MongoDB,
    y devuelve un JWT propio igual que /auth/login.
    """
    data = request.get_json() or {}
    firebase_token = data.get("idToken", "").strip()

    if not firebase_token:
        return jsonify(error="Token requerido"), 400

    # Verificar el token de Google (Firebase lo emite como idToken)
    try:
        FIREBASE_CLIENT_ID = os.getenv("FIREBASE_CLIENT_ID")  # El Web Client ID de Google OAuth
        info = id_token.verify_firebase_token(firebase_token, grequests.Request(), FIREBASE_CLIENT_ID)
    except Exception as e:
        return jsonify(error="Token inválido o expirado"), 401

    email = info.get("email", "").lower()
    name  = info.get("name") or email.split("@")[0]
    photo = info.get("picture", "")

    if not email:
        return jsonify(error="No se pudo obtener el email de Google"), 400

    # Buscar usuario existente o crear uno nuevo (upsert)
    user = users().find_one({"email": email})

    if user is None:
        # Registro automático — sin password_hash porque usa Google
        result = users().insert_one({
            "name":          name,
            "email":         email,
            "password_hash": None,
            "role":          "participant",
            "provider":      "google",
            "avatar":        photo,
            "created_at":    datetime.utcnow(),
        })
        user = users().find_one({"_id": result.inserted_id})
    else:
        # Actualizar foto y marcar provider si no estaba
        users().update_one(
            {"_id": user["_id"]},
            {"$set": {"avatar": photo, "provider": "google"}}
        )
        user = users().find_one({"_id": user["_id"]})

    token = create_access_token(identity=str(user["_id"]))
    return jsonify(token=token, user=fmt_user(user)), 200
```

**Variable de entorno nueva** en `.env` y `.env.example`:
```
FIREBASE_CLIENT_ID=   # El Web Client ID de tu proyecto Firebase (de Google Cloud Console → APIs → Credentials)
```

---

### 3. Frontend — `js/config.js`

Agregar la configuración de Firebase al final del archivo existente (no borrar nada):

```javascript
// Configuración Firebase para Google Auth
// Reemplazar con los valores reales del proyecto Firebase
window.FIREBASE_CONFIG = {
  apiKey:            "REEMPLAZAR",
  authDomain:        "REEMPLAZAR.firebaseapp.com",
  projectId:         "REEMPLAZAR",
  storageBucket:     "REEMPLAZAR.appspot.com",
  messagingSenderId: "REEMPLAZAR",
  appId:             "REEMPLAZAR"
};
```

---

### 4. Frontend — `js/api.js`

Agregar el método `loginWithGoogle` al objeto `LyfterAPI` (tanto en la parte mock como en la parte backend):

**En la parte Mock** (para que funcione sin servidor), agregar dentro del objeto `Mock`:
```javascript
async loginWithGoogle(googleUser) {
  // En modo mock, simular login con Google buscando por email
  // Si no existe, crear usuario nuevo automáticamente
  var email = googleUser.email.toLowerCase();
  var u = mockState.users.find(function(x) { return x.email.toLowerCase() === email; });
  if (!u) {
    u = {
      id:    uid('u'),
      name:  googleUser.name || email.split('@')[0],
      email: email,
      role:  'participant',
      provider: 'google',
      avatar: googleUser.photo || ''
    };
    mockState.users.push(u);
    persist();
  }
  var session = { token: 'mock-google-token-' + u.id, user: publicUser(u) };
  saveSession(session);
  return session.user;
},
```

**En la parte Backend**, agregar dentro del objeto `Backend`:
```javascript
async loginWithGoogle(googleUser) {
  // googleUser = { idToken, email, name, photo }
  var res = await _fetch('/auth/google', {
    method: 'POST',
    body: JSON.stringify({ idToken: googleUser.idToken })
  });
  saveSession({ token: res.token, user: res.user });
  return res.user;
},
```

**En el objeto público `window.LyfterAPI`**, agregar:
```javascript
loginWithGoogle: function(googleUser) { return impl.loginWithGoogle(googleUser); },
```

---

### 5. Frontend — `login.html` y `register.html`

**Agregar en el `<head>` de ambos archivos**, antes del cierre `</head>`, los SDKs de Firebase:
```html
<!-- Firebase SDKs -->
<script src="https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js"></script>
<script src="https://www.gstatic.com/firebasejs/10.12.2/firebase-auth-compat.js"></script>
```

**En el script inline de `login.html`**, después de que se renderiza el `app.innerHTML`, agregar:

1. Inicializar Firebase (solo una vez, con guard):
```javascript
if (!firebase.apps.length) {
  firebase.initializeApp(window.FIREBASE_CONFIG);
}
var firebaseAuth = firebase.auth();
```

2. Agregar el botón de Google al HTML del formulario, justo antes del `</form>` de cierre y después del botón de "Entrar". Insertar este HTML:
```html
<div class="divider text-gray-400 text-xs my-2">o continúa con</div>
<button type="button" id="btn-google"
  class="btn w-full border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 font-medium gap-2 normal-case">
  <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" class="w-5 h-5" alt="Google" />
  Continuar con Google
</button>
```

3. Agregar el listener del botón Google después del listener del form:
```javascript
document.getElementById('btn-google').addEventListener('click', async function() {
  var btn = this;
  btn.disabled = true;
  btn.textContent = 'Conectando...';
  try {
    var provider = new firebase.auth.GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    var result = await firebaseAuth.signInWithPopup(provider);
    var idToken = await result.user.getIdToken();
    var loggedUser = await API.loginWithGoogle({
      idToken: idToken,
      email:   result.user.email,
      name:    result.user.displayName,
      photo:   result.user.photoURL
    });
    U.toastNextPage('¡Bienvenido con Google! 🎉', 'success');
    window.location.href = nextUrl || (loggedUser.role === 'admin' ? 'admin-event.html' : 'profile.html');
  } catch(err) {
    var mensajes = {
      'auth/popup-closed-by-user':    'Cerraste la ventana antes de completar el inicio.',
      'auth/cancelled-popup-request': 'Solo puede haber una ventana activa.',
      'auth/network-request-failed':  'Error de red. Revisa tu conexión.',
    };
    U.showToast(mensajes[err.code] || err.message || 'No se pudo iniciar con Google', 'error');
  } finally {
    btn.disabled = false;
    btn.innerHTML = '<img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" class="w-5 h-5" alt="Google" /> Continuar con Google';
  }
});
```

**En `register.html`** hacer exactamente lo mismo: agregar Firebase en el `<head>`, inicializar, y agregar el botón de Google con el mismo listener (el flujo es idéntico — Google hace login y registro al mismo tiempo, no hay diferencia).

---

## Archivos que se modifican

| Archivo | Tipo de cambio |
|---|---|
| `backend/requirements.txt` | Agregar `google-auth>=2.28` |
| `backend/app.py` | Agregar endpoint `POST /auth/google` |
| `backend/.env.example` | Agregar `FIREBASE_CLIENT_ID=` |
| `js/config.js` | Agregar `window.FIREBASE_CONFIG` |
| `js/api.js` | Agregar método `loginWithGoogle` en Mock, Backend y API pública |
| `login.html` | Agregar SDKs Firebase + botón Google + listener |
| `register.html` | Agregar SDKs Firebase + botón Google + listener |

**Archivos que NO se tocan:** todo lo demás. El auth de email/contraseña, los endpoints de badges, eventos, escaneo, dashboard de admin — nada cambia.

---

## Variables de entorno a agregar en Render (producción)

```
FIREBASE_CLIENT_ID=   # Web Client ID de Google (de Firebase Console → Project Settings → General → Web API Key no, es el OAuth Client ID de Google Cloud)
```

---

## Criterio de éxito

1. El botón "Continuar con Google" aparece en login y registro
2. Al hacer clic abre el popup de Google para seleccionar cuenta
3. Al elegir una cuenta Google, el usuario queda logueado y va a `profile.html`
4. Si el usuario no existía, se crea automáticamente en MongoDB con `role: participant`
5. Si el usuario ya existía con email/contraseña, puede ahora también entrar con Google (mismo email)
6. El login con email/contraseña sigue funcionando exactamente igual
7. En modo mock (`js/config.js` con `mode: 'mock'`) el botón de Google también funciona sin necesidad del backend

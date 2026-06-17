# backend/security/limiter.py — rate limiting con flask-limiter + Redis
#
# Los decoradores de abajo son IMPORTABLES y se aplican sobre las vistas:
#
#     from security.limiter import register_limit, login_participant_limit
#
#     @auth_bp.route("/register", methods=["POST"])
#     @register_limit
#     def register(): ...
#
# SEGURO DE IMPORTAR EN DESARROLLO:
# Si FLASK_ENV=development, o si flask-limiter no está instalado, todos los
# decoradores degradan a NO-OPS (devuelven la vista sin tocarla). Así routes/
# puede importarlos siempre y el entorno local no necesita Redis ni el paquete.

import os

from flask import request

_DEV = os.getenv("FLASK_ENV") == "development"

try:
    from flask_limiter import Limiter
    from flask_limiter.util import get_remote_address
    from flask_jwt_extended import get_jwt_identity
    _AVAILABLE = True
except ImportError:
    _AVAILABLE = False

# El rate limiting real solo se arma en producción y con el paquete presente.
_ENABLED = _AVAILABLE and not _DEV


# ══════════════════════════════════════════════
# MODO INACTIVO (desarrollo / paquete ausente): decoradores no-op
# ══════════════════════════════════════════════
if not _ENABLED:

    def _noop(view):
        return view

    register_limit          = _noop
    login_participant_limit = _noop
    login_admin_limit       = _noop
    redeem_limit            = _noop
    avatar_limit            = _noop

    limiter = None

    def init_limiter(app):  # nunca se llama en dev, pero existe por simetría
        return None


# ══════════════════════════════════════════════
# MODO ACTIVO (producción)
# ══════════════════════════════════════════════
else:

    from flask import g
    from db import users

    # ── KEY FUNCTIONS — de qué depende cada cubeta de límite ──

    def ip_key():
        """Cubeta por IP del cliente (ya corregida por ProxyFix)."""
        return get_remote_address()

    def email_key():
        """Cubeta por email del body; cae a la IP si no hay email."""
        data = request.get_json(silent=True) or {}
        email = (data.get("email") or "").strip().lower()
        return f"email:{email}" if email else get_remote_address()

    def user_key():
        """Cubeta por usuario autenticado (identidad JWT); cae a la IP."""
        try:
            identity = get_jwt_identity()
        except RuntimeError:
            identity = None
        return f"user:{identity}" if identity else get_remote_address()

    # ── DISCRIMINADOR DE ROL POR EMAIL (antes de autenticar) ──
    # El rol es propiedad de la cuenta: se puede conocer por el email sin la
    # contraseña. Cacheamos el resultado en flask.g para no repetir la consulta
    # en las 4 evaluaciones de exempt_when por request de login.

    def _login_target_is_admin():
        cached = getattr(g, "_login_is_admin", None)
        if cached is not None:
            return cached
        data = request.get_json(silent=True) or {}
        email = (data.get("email") or "").strip().lower()
        is_admin = False
        if email:
            u = users().find_one({"email": email}, {"role": 1})
            is_admin = bool(u and u.get("role") == "admin")
        g._login_is_admin = is_admin
        return is_admin

    def _login_target_is_not_admin():
        return not _login_target_is_admin()

    # ── INSTANCIA DEL LIMITER ──
    limiter = Limiter(
        key_func=ip_key,
        default_limits=[],
        headers_enabled=True,
    )

    def init_limiter(app):
        """Conecta el limiter a la app usando Redis (REDIS_URL del .env)."""
        redis_url = os.getenv("REDIS_URL", "redis://localhost:6379/0")
        app.config["RATELIMIT_STORAGE_URI"] = redis_url
        app.config.setdefault("RATELIMIT_HEADERS_ENABLED", True)
        app.config.setdefault("RATELIMIT_STRATEGY", "moving-window")
        limiter.init_app(app)
        return limiter

    # ── DECORADORES IMPORTABLES ──

    # POST /auth/register → 3 por IP cada 10 minutos
    register_limit = limiter.limit(
        "3 per 10 minutes", key_func=ip_key, methods=["POST"]
    )

    def login_participant_limit(view):
        """
        POST /auth/login cuando el email NO pertenece a un admin:
            - 5 por IP cada 10 minutos
            - 5 por email cada 10 minutos
        Se omite (exempt) si el email es de un admin → lo cubre login_admin_limit.
        """
        view = limiter.limit("5 per 10 minutes", key_func=ip_key, methods=["POST"],
                             exempt_when=_login_target_is_admin)(view)
        view = limiter.limit("5 per 10 minutes", key_func=email_key, methods=["POST"],
                             exempt_when=_login_target_is_admin)(view)
        return view

    def login_admin_limit(view):
        """
        POST /auth/login cuando el email pertenece a un admin:
            - 3 por IP cada 20 minutos
            - 3 por email cada 20 minutos
        Se omite (exempt) si el email NO es de un admin → lo cubre el de participant.
        """
        view = limiter.limit("3 per 20 minutes", key_func=ip_key, methods=["POST"],
                             exempt_when=_login_target_is_not_admin)(view)
        view = limiter.limit("3 per 20 minutes", key_func=email_key, methods=["POST"],
                             exempt_when=_login_target_is_not_admin)(view)
        return view

    # POST /redeem/<event_id>/<token> → 10 por usuario cada 1 minuto
    redeem_limit = limiter.limit(
        "10 per 1 minute", key_func=user_key, methods=["POST"]
    )

    # POST /auth/profile/avatar → 5 por usuario cada 1 hora
    avatar_limit = limiter.limit(
        "5 per 1 hour", key_func=user_key, methods=["POST"]
    )

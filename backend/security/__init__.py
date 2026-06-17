# backend/security/__init__.py — paquete de seguridad de Lyfter Badge App
#
# Punto de entrada único. En app.py basta con:
#
#     from security import init_security
#     init_security(app)
#
# Todo lo demás (ProxyFix, rate limiting con Redis, IP guard) queda encapsulado
# aquí y NO toca ningún otro archivo del backend.
#
# MODO DESARROLLO: si FLASK_ENV=development, init_security() retorna de
# inmediato sin activar nada. Así el entorno local no necesita Redis ni los
# paquetes flask-limiter/redis instalados.

import os
import logging

from flask import Blueprint, jsonify

logger = logging.getLogger(__name__)

# Blueprint propio de seguridad (endpoints de diagnóstico / estado).
security_bp = Blueprint("security", __name__)


@security_bp.route("/status", methods=["GET"])
def security_status():
    return jsonify(
        security="active",
        proxy_fix=True,
        rate_limiting=True,
        ip_guard=True,
    ), 200


def init_security(app):
    """
    Activa la capa de seguridad sobre la app Flask:
        1. ProxyFix (x_for=1) para obtener la IP real del cliente.
        2. flask-limiter con Redis (REDIS_URL del .env).
        3. Registro del blueprint de seguridad bajo /security.

    En FLASK_ENV=development no hace absolutamente nada.
    """
    if os.getenv("FLASK_ENV") == "development":
        logger.info("[security] FLASK_ENV=development → capa de seguridad DESACTIVADA")
        return app

    # Imports diferidos: flask-limiter/redis solo se cargan en producción.
    from .middleware import apply_proxy_fix
    from .limiter import init_limiter

    # 1) IP real del cliente detrás del proxy
    apply_proxy_fix(app)

    # 2) Rate limiting con Redis
    init_limiter(app)

    # 3) Blueprint de seguridad
    if "security" not in app.blueprints:
        app.register_blueprint(security_bp, url_prefix="/security")

    logger.info("[security] capa de seguridad ACTIVADA (ProxyFix + rate limiting + IP guard)")
    return app


__all__ = ["init_security", "security_bp"]

# backend/security/middleware.py — middlewares WSGI de seguridad

from werkzeug.middleware.proxy_fix import ProxyFix


def apply_proxy_fix(app):
    """
    Hace que Flask confíe en UN solo proxy reverso (x_for=1).

    En producción la app corre detrás de un proxy (Render/Heroku/Nginx),
    por lo que `request.remote_addr` sería la IP del proxy y no la del
    cliente. ProxyFix reescribe remote_addr con el primer valor de
    `X-Forwarded-For`, que es la IP real del usuario.

    Se confía en exactamente 1 salto para evitar spoofing de la cabecera:
    un atacante podría enviar `X-Forwarded-For: 1.2.3.4` falso, pero el
    proxy de confianza lo sobreescribe/antepone, y al tomar solo x_for=1
    leemos el valor que añadió el proxy, no el del cliente.
    """
    app.wsgi_app = ProxyFix(app.wsgi_app, x_for=1, x_proto=1, x_host=1, x_port=1)
    return app

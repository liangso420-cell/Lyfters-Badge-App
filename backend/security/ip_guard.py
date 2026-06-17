# backend/security/ip_guard.py — restricción de IP por cuenta
#
# Idea: cada cuenta queda "anclada" a la IP desde la que se registró.
#   - Registro: se guarda `ip_address` en el documento del usuario y se
#     rechaza si esa IP ya pertenece a otra cuenta (evita multicuentas).
#   - Login: se exige que la IP del request coincida con la guardada.
#
# Los guards son decoradores IMPORTABLES y autocontenidos (no necesitan que
# las vistas en routes/ cambien su lógica interna):
#
#     from security.ip_guard import ip_guard_register, ip_guard_login
#
#     @auth_bp.route("/register", methods=["POST"])
#     @ip_guard_register
#     def register(): ...
#
# En modo desarrollo (FLASK_ENV=development) los guards no hacen nada.

import os
from functools import wraps

from flask import request, jsonify

from db import users


# ──────────────────────────────────────────────
# HELPERS
# ──────────────────────────────────────────────

def _is_dev():
    return os.getenv("FLASK_ENV") == "development"


def get_client_ip():
    """
    IP real del cliente. ProxyFix (x_for=1) ya reescribió remote_addr con la
    IP del usuario cuando la app corre detrás de un proxy de confianza.
    """
    return request.remote_addr or "0.0.0.0"


def _request_email():
    data = request.get_json(silent=True) or {}
    return (data.get("email") or "").strip().lower()


def _response_status(resp):
    """Extrae el código HTTP tanto si la vista devolvió (body, status) como un Response."""
    if isinstance(resp, tuple) and len(resp) >= 2:
        return resp[1]
    return getattr(resp, "status_code", 200)


# ──────────────────────────────────────────────
# GUARDS / DECORADORES
# ──────────────────────────────────────────────

def ip_guard_register(view):
    """
    Antes de registrar: rechaza con 409 si ya existe OTRA cuenta con la IP
    actual. Si el registro tiene éxito (201/200), guarda `ip_address` en la
    cuenta recién creada (identificada por el email del body).
    """
    @wraps(view)
    def wrapper(*args, **kwargs):
        if _is_dev():
            return view(*args, **kwargs)

        ip = get_client_ip()
        if users().find_one({"ip_address": ip}):
            return jsonify(error="Ya existe una cuenta registrada desde esta red"), 409

        resp = view(*args, **kwargs)

        if _response_status(resp) in (200, 201):
            email = _request_email()
            if email:
                users().update_one(
                    {"email": email},
                    {"$set": {"ip_address": ip}},
                )
        return resp

    return wrapper


def ip_guard_login(view):
    """
    Antes de autenticar: si la cuenta del email tiene `ip_address` guardada y
    NO coincide con la IP del request, rechaza con 403. Si la cuenta aún no
    tiene IP anclada, la deja pasar (el guard de registro la fijará).
    """
    @wraps(view)
    def wrapper(*args, **kwargs):
        if _is_dev():
            return view(*args, **kwargs)

        email = _request_email()
        if email:
            user = users().find_one({"email": email})
            stored_ip = user.get("ip_address") if user else None
            if stored_ip and stored_ip != get_client_ip():
                return jsonify(error="Acceso no permitido desde esta red"), 403

        return view(*args, **kwargs)

    return wrapper


# ──────────────────────────────────────────────
# API FUNCIONAL (alternativa a los decoradores)
# ──────────────────────────────────────────────
# Por si se prefiere llamar la lógica explícitamente dentro de una vista en
# lugar de usar el decorador. Devuelven None si todo OK, o una tupla
# (json, status) lista para hacer `return` desde la vista.

def check_register_ip():
    if _is_dev():
        return None
    if users().find_one({"ip_address": get_client_ip()}):
        return jsonify(error="Ya existe una cuenta registrada desde esta red"), 409
    return None


def bind_ip_to_user(email):
    """Ancla la IP actual a la cuenta indicada (llamar tras crear el usuario)."""
    if _is_dev() or not email:
        return
    users().update_one(
        {"email": email.strip().lower()},
        {"$set": {"ip_address": get_client_ip()}},
    )


def check_login_ip(email):
    if _is_dev() or not email:
        return None
    user = users().find_one({"email": email.strip().lower()})
    stored_ip = user.get("ip_address") if user else None
    if stored_ip and stored_ip != get_client_ip():
        return jsonify(error="Acceso no permitido desde esta red"), 403
    return None

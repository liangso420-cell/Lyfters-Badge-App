"""Decoradores JWT: generación de tokens y protección de rutas por rol."""
from datetime import datetime, timezone, timedelta
from functools import wraps

import jwt
from flask import request, jsonify, g

from config import config


def generate_token(user):
    """Crea un JWT con el id, email y rol embebidos."""
    now = datetime.now(timezone.utc)
    payload = {
        "sub": str(user["_id"]),
        "email": user["email"],
        "rol": user["rol"],
        "iat": now,
        "exp": now + timedelta(hours=config.JWT_EXP_HOURS),
    }
    return jwt.encode(payload, config.JWT_SECRET, algorithm="HS256")


def _decode_from_request():
    """Lee y valida el token del header Authorization. Devuelve (payload, error)."""
    auth = request.headers.get("Authorization", "")
    if not auth.startswith("Bearer "):
        return None, "Token no proporcionado"
    token = auth.split(" ", 1)[1].strip()
    try:
        payload = jwt.decode(token, config.JWT_SECRET, algorithms=["HS256"])
        return payload, None
    except jwt.ExpiredSignatureError:
        return None, "Sesión expirada"
    except jwt.InvalidTokenError:
        return None, "Token inválido"


def require_auth(fn):
    """Requiere un JWT válido. Expone el usuario en g.user."""
    @wraps(fn)
    def wrapper(*args, **kwargs):
        payload, error = _decode_from_request()
        if error:
            return jsonify({"error": error}), 401
        g.user = payload
        return fn(*args, **kwargs)

    return wrapper


def require_admin(fn):
    """Requiere un JWT válido con rol admin."""
    @wraps(fn)
    def wrapper(*args, **kwargs):
        payload, error = _decode_from_request()
        if error:
            return jsonify({"error": error}), 401
        if payload.get("rol") != "admin":
            return jsonify({"error": "Acceso solo para administradores"}), 403
        g.user = payload
        return fn(*args, **kwargs)

    return wrapper

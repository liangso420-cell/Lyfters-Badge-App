"""Utilidades para el sistema de workspaces."""
from functools import wraps
from flask import jsonify
from flask_jwt_extended import get_jwt
from bson import ObjectId
from db import workspace_members, workspaces
import re, random, string
from datetime import datetime, timezone, timedelta


def get_user_workspace(user_id):
    """Devuelve (workspace_id, role) del usuario en su workspace."""
    uid = ObjectId(user_id) if isinstance(user_id, str) else user_id
    member = workspace_members().find_one({"user_id": uid})
    if not member:
        return None, None
    return member["workspace_id"], member["role"]


def require_workspace_role(*roles):
    """Decorator: requiere que el usuario tenga uno de los roles en su workspace."""
    def decorator(f):
        @wraps(f)
        def wrapper(*args, **kwargs):
            from flask_jwt_extended import verify_jwt_in_request
            verify_jwt_in_request()
            claims = get_jwt()
            user_role = claims.get("role", "")
            if user_role == "god_admin":
                return f(*args, **kwargs)
            if user_role not in roles:
                return jsonify(error="No autorizado"), 403
            return f(*args, **kwargs)
        return wrapper
    return decorator


def generate_invite_code(length=8):
    """Genera un código de invitación alfanumérico."""
    chars = string.ascii_uppercase + string.digits
    return ''.join(random.choices(chars, k=length))


def slugify(name):
    """Convierte un nombre a slug URL-safe."""
    slug = name.lower().strip()
    slug = re.sub(r'[^\w\s-]', '', slug)
    slug = re.sub(r'[\s_-]+', '-', slug)
    slug = re.sub(r'^-+|-+$', '', slug)
    return slug or 'workspace'


def workspace_filter(workspace_id, extra=None):
    """Construye un filtro MongoDB con workspace_id."""
    f = {"workspace_id": ObjectId(workspace_id) if isinstance(workspace_id, str) else workspace_id}
    if extra:
        f.update(extra)
    return f

# backend/routes/auth.py — rutas /auth/*

import os
import re
import secrets
from datetime import datetime, timedelta
from collections import defaultdict

import bcrypt
from bson import ObjectId
from flask import Blueprint, request, jsonify
from flask_jwt_extended import (
    create_access_token, jwt_required, get_jwt_identity
)
from google.oauth2 import id_token
from google.auth.transport import requests as grequests

from db import users, scans
from utils import sanitize, fmt_user
from security.limiter import (
    register_limit, login_participant_limit, login_admin_limit, avatar_limit
)
from security.ip_guard import ip_guard_register, ip_guard_login

auth_bp = Blueprint("auth", __name__)

# ──────────────────────────────────────────────
# RATE LIMITING (en memoria)
# ──────────────────────────────────────────────
_login_attempts = defaultdict(list)
EMAIL_RE = re.compile(r'^[^\s@]+@[^\s@]+\.[^\s@]+$')


def check_rate_limit(email):
    now = datetime.utcnow()
    cutoff = now - timedelta(minutes=5)
    _login_attempts[email] = [t for t in _login_attempts[email] if t > cutoff]
    return len(_login_attempts[email]) < 5


def record_failed_attempt(email):
    _login_attempts[email].append(datetime.utcnow())


def clear_attempts(email):
    _login_attempts.pop(email, None)


# ──────────────────────────────────────────────
# AUTH
# ──────────────────────────────────────────────

@auth_bp.route("/register", methods=["POST"])
@register_limit
@ip_guard_register
def register():
    data     = request.get_json() or {}
    name     = sanitize(data.get("nombre") or data.get("name") or "", max_len=100)
    email    = sanitize(data.get("email") or "", max_len=254).lower()
    password = data.get("password") or ""

    if not name:
        return jsonify(error="El nombre es requerido"), 400
    if not email or not EMAIL_RE.match(email):
        return jsonify(error="Formato de email inválido"), 400
    if len(password) < 6:
        return jsonify(error="La contraseña debe tener al menos 6 caracteres"), 400

    if users().find_one({"email": email}):
        return jsonify(error="Email ya registrado"), 409

    pw_hash = bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()
    result  = users().insert_one({
        "name":          name,
        "email":         email,
        "password_hash": pw_hash,
        "role":          "participant",
        "created_at":    datetime.utcnow(),
    })

    new_user = users().find_one({"_id": result.inserted_id})
    token    = create_access_token(identity=str(result.inserted_id))
    return jsonify(token=token, user=fmt_user(new_user)), 201


@auth_bp.route("/profile", methods=["GET"])
@jwt_required()
def get_profile():
    uid = get_jwt_identity()
    u = users().find_one({"_id": ObjectId(uid)}, {"password_hash": 0})
    if not u:
        return jsonify(error="Usuario no encontrado"), 404
    return jsonify({
        "id":      str(u["_id"]),
        "nombre":  u.get("name", ""),
        "email":   u.get("email", ""),
        "rol":     u.get("role", "participant"),
        "avatar":  u.get("avatar", None),
        "interests": u.get("interests", []),
        "privacy": u.get("privacy", {"show_in_leaderboard": True, "show_badges": True})
    }), 200


@auth_bp.route("/profile/name", methods=["POST"])
@jwt_required()
def update_name():
    uid = get_jwt_identity()
    data = request.get_json() or {}
    name = sanitize(data.get("name", ""), max_len=100)
    if not name:
        return jsonify(error="El nombre no puede estar vacío"), 400
    users().update_one({"_id": ObjectId(uid)}, {"$set": {"name": name}})
    return jsonify(ok=True), 200


@auth_bp.route("/profile/email", methods=["POST"])
@jwt_required()
def update_email():
    uid = get_jwt_identity()
    data = request.get_json() or {}
    email = sanitize(data.get("email", ""), max_len=254).lower()
    if not email or not EMAIL_RE.match(email):
        return jsonify(error="Email inválido"), 400
    existing = users().find_one({"email": email, "_id": {"$ne": ObjectId(uid)}})
    if existing:
        return jsonify(error="Ese email ya está en uso"), 409
    users().update_one({"_id": ObjectId(uid)}, {"$set": {"email": email}})
    return jsonify(ok=True), 200


@auth_bp.route("/profile/privacy", methods=["POST"])
@jwt_required()
def update_privacy():
    uid = get_jwt_identity()
    data = request.get_json() or {}
    privacy = {
        "show_in_leaderboard": bool(data.get("show_in_leaderboard", True)),
        "show_badges":         bool(data.get("show_badges", True)),
    }
    users().update_one({"_id": ObjectId(uid)}, {"$set": {"privacy": privacy}})
    return jsonify(ok=True), 200


@auth_bp.route("/profile", methods=["DELETE"])
@jwt_required()
def delete_account():
    uid = get_jwt_identity()
    oid = ObjectId(uid)
    scans().delete_many({"user_id": oid})
    users().delete_one({"_id": oid})
    return jsonify(ok=True), 200


@auth_bp.route("/profile/avatar", methods=["POST"])
@jwt_required()
@avatar_limit
def update_avatar():
    uid = get_jwt_identity()
    data = request.get_json() or {}
    avatar = data.get("avatar", "")
    if not avatar or not avatar.startswith("data:image/"):
        return jsonify(error="Imagen inválida"), 400
    if len(avatar) > 2 * 1024 * 1024:
        return jsonify(error="La imagen no puede superar 2MB"), 400
    users().update_one({"_id": ObjectId(uid)}, {"$set": {"avatar": avatar}})
    return jsonify(ok=True), 200


@auth_bp.route("/change-password", methods=["POST"])
@jwt_required()
def change_password():
    uid = get_jwt_identity()
    data = request.get_json() or {}
    current = (data.get("current_password") or "").encode()
    new_pw  = (data.get("new_password") or "")
    if len(new_pw) < 6:
        return jsonify(error="La nueva contraseña debe tener al menos 6 caracteres"), 400
    user = users().find_one({"_id": ObjectId(uid)})
    if not user or not bcrypt.checkpw(current, user["password_hash"].encode()):
        return jsonify(error="Contraseña actual incorrecta"), 401
    new_hash = bcrypt.hashpw(new_pw.encode(), bcrypt.gensalt()).decode()
    users().update_one({"_id": ObjectId(uid)}, {"$set": {"password_hash": new_hash}})
    return jsonify(ok=True), 200


@auth_bp.route("/interests", methods=["POST"])
@jwt_required()
def update_interests():
    uid = get_jwt_identity()
    data = request.get_json() or {}
    interests = data.get("interests", [])
    if not isinstance(interests, list):
        return jsonify(error="interests debe ser una lista"), 400
    interests = [sanitize(t, max_len=50) for t in interests if t][:20]
    users().update_one({"_id": ObjectId(uid)}, {"$set": {"interests": interests}})
    return jsonify(ok=True), 200


@auth_bp.route("/login", methods=["POST"])
@login_participant_limit
@login_admin_limit
@ip_guard_login
def login():
    data     = request.get_json() or {}
    email    = sanitize(data.get("email") or "", max_len=254).lower()
    password = (data.get("password") or "").encode()

    if not check_rate_limit(email):
        return jsonify(error="Demasiados intentos. Esperá 5 minutos."), 429

    user = users().find_one({"email": email})
    if not user or not bcrypt.checkpw(password, user["password_hash"].encode()):
        record_failed_attempt(email)
        return jsonify(error="Credenciales inválidas"), 401

    clear_attempts(email)
    token = create_access_token(identity=str(user["_id"]))
    return jsonify(token=token, user=fmt_user(user)), 200


@auth_bp.route("/google", methods=["POST"])
def google_login():
    """
    Recibe un idToken de Firebase/Google desde el frontend.
    Verifica el token con Google, busca o crea el usuario en MongoDB,
    y devuelve un JWT propio igual que /auth/login.
    """
    data = request.get_json() or {}
    firebase_token = (data.get("idToken") or "").strip()

    if not firebase_token:
        return jsonify(error="Token requerido"), 400

    # Verificar el token de Google (Firebase lo emite como idToken).
    # Sin audience: Firebase emite tokens con múltiples audiencias y
    # verify_firebase_token los acepta correctamente.
    try:
        info = id_token.verify_firebase_token(firebase_token, grequests.Request())
    except Exception:
        return jsonify(error="Token inválido o expirado"), 401

    if not info:
        return jsonify(error="Token inválido o expirado"), 401

    email = (info.get("email") or "").lower()
    name  = info.get("name") or (email.split("@")[0] if email else "")
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
            "password_hash": "",
            "role":          "participant",
            "provider":      "google",
            "avatar":        photo,
            "created_at":    datetime.utcnow(),
        })
        user = users().find_one({"_id": result.inserted_id})
    else:
        # Marcar provider y refrescar avatar si Google trae foto
        updates = {"provider": "google"}
        if photo:
            updates["avatar"] = photo
        users().update_one({"_id": user["_id"]}, {"$set": updates})
        user = users().find_one({"_id": user["_id"]})

    token = create_access_token(identity=str(user["_id"]))
    return jsonify(token=token, user=fmt_user(user)), 200


@auth_bp.route("/forgot-password", methods=["POST"])
def forgot_password():
    data = request.get_json() or {}
    email = sanitize(data.get("email", ""), max_len=254).lower()
    if not email:
        return jsonify(error="Email requerido"), 400

    user = users().find_one({"email": email})
    if not user:
        return jsonify(ok=True, message="Si el email existe, recibirás un correo"), 200

    reset_token = secrets.token_urlsafe(32)
    expiry = datetime.utcnow() + timedelta(hours=1)

    users().update_one(
        {"_id": user["_id"]},
        {"$set": {"reset_token": reset_token, "reset_token_expiry": expiry}}
    )

    reset_link = "https://liangso420-cell.github.io/Lyfters-Badge-App/reset-password.html?token=" + reset_token

    return jsonify(ok=True, reset_link=reset_link), 200


@auth_bp.route("/reset-password", methods=["POST"])
def reset_password():
    data = request.get_json() or {}
    reset_token = data.get("token", "")
    new_password = data.get("password", "")

    if not reset_token or not new_password:
        return jsonify(error="Token y contraseña requeridos"), 400
    if len(new_password) < 6:
        return jsonify(error="La contraseña debe tener mínimo 6 caracteres"), 400

    user = users().find_one({
        "reset_token": reset_token,
        "reset_token_expiry": {"$gt": datetime.utcnow()}
    })

    if not user:
        return jsonify(error="Token inválido o expirado"), 400

    new_hash = bcrypt.hashpw(new_password.encode(), bcrypt.gensalt()).decode()
    users().update_one(
        {"_id": user["_id"]},
        {"$set": {"password_hash": new_hash},
         "$unset": {"reset_token": "", "reset_token_expiry": ""}}
    )

    return jsonify(ok=True, message="Contraseña actualizada correctamente"), 200

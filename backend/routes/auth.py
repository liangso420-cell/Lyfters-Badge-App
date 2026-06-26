# backend/routes/auth.py — rutas /auth/*

import os
import re
import secrets
from datetime import datetime, timedelta

import requests as req

import bcrypt
from bson import ObjectId
from flask import Blueprint, request, jsonify
from flask_jwt_extended import (
    create_access_token, jwt_required, get_jwt_identity, get_jwt
)
from google.oauth2 import id_token
from google.auth.transport import requests as grequests

from db import users, scans, workspace_members, invitations as invitations_col, achievements, reviews, events, ip_bans
from utils import sanitize, fmt_user, compute_event_status
from security.limiter import (
    register_limit, login_participant_limit, login_admin_limit, avatar_limit,
    forgot_password_limit
)
from security.ip_guard import ip_guard_register, ip_guard_login

auth_bp = Blueprint("auth", __name__)


def _workspace_claims(user_doc):
    """Construye los additional_claims JWT con info de workspace."""
    member = workspace_members().find_one({"user_id": user_doc["_id"]})
    return {
        "role":           user_doc.get("role", "participant"),
        "name":           user_doc.get("name", ""),
        "workspace_id":   str(member["workspace_id"]) if member else None,
        "workspace_role": member["role"] if member else None,
    }


def _ban_block(user_doc):
    """Si la cuenta está baneada (ban de cuenta activo), devuelve la respuesta
    403 estándar (jsonify, status). Devuelve None si no está baneada.

    Formato del 403:
      { "error": "cuenta_baneada", "ban_reason": ..., "ban_until": ...|null,
        "ban_permanent": true|false }
    """
    banned_until = user_doc.get("banned_until")
    if not banned_until:
        return None
    if getattr(banned_until, "tzinfo", None) is not None:
        banned_until = banned_until.replace(tzinfo=None)
    if banned_until <= datetime.utcnow():
        return None
    permanent = banned_until.year >= 9999
    return jsonify(
        error="cuenta_baneada",
        ban_reason=user_doc.get("ban_reason") or "",
        ban_until=None if permanent else banned_until.isoformat(),
        ban_permanent=permanent,
    ), 403


EMAIL_RE = re.compile(r'^[^\s@]+@[^\s@]+\.[^\s@]+$')


# ──────────────────────────────────────────────
# AUTH
# ──────────────────────────────────────────────

@auth_bp.route("/switch-workspace", methods=["POST"])
@jwt_required()
def switch_workspace():
    user_id = get_jwt_identity()
    data = request.get_json() or {}
    ws_id_str = data.get("workspace_id")
    if not ws_id_str:
        return jsonify(error="workspace_id requerido"), 400
    try:
        ws_oid = ObjectId(ws_id_str)
    except Exception:
        return jsonify(error="workspace_id inválido"), 400

    user_doc = users().find_one({"_id": ObjectId(user_id)})
    if not user_doc:
        return jsonify(error="Usuario no encontrado", error_code="user_not_found"), 404

    ban_resp = _ban_block(user_doc)
    if ban_resp:
        return ban_resp

    # Leemos el rol global desde la DB (no del JWT viejo) para reflejar cambios
    # recientes — p. ej. un rol recién asignado al canjear un código de invitación.
    role = user_doc.get("role", "participant")
    member = workspace_members().find_one({"user_id": ObjectId(user_id), "workspace_id": ws_oid})

    if role != "god_admin" and not member:
        return jsonify(error="No pertenecés a ese workspace"), 403

    ws_role = member["role"] if member else "god_admin"

    claims = {
        "role":           role,
        "name":           user_doc.get("name", ""),
        "workspace_id":   ws_id_str,
        "workspace_role": ws_role,
    }
    token = create_access_token(identity=user_id, additional_claims=claims)
    return jsonify(token=token), 200


@auth_bp.route("/refresh-token", methods=["POST"])
@jwt_required()
def refresh_token():
    user_id = get_jwt_identity()
    user_doc = users().find_one({"_id": ObjectId(user_id)})
    if not user_doc:
        return jsonify(error="Usuario no encontrado", error_code="user_not_found"), 404

    ban_resp = _ban_block(user_doc)
    if ban_resp:
        return ban_resp

    member = workspace_members().find_one(
        {"user_id": ObjectId(user_id)},
        sort=[("joined_at", -1)]
    )

    claims = {
        "role":           user_doc.get("role", "participant"),
        "name":           user_doc.get("name", ""),
        "workspace_id":   str(member["workspace_id"]) if member else None,
        "workspace_role": member["role"] if member else None,
    }
    token = create_access_token(identity=user_id, additional_claims=claims)
    return jsonify(token=token, workspace_id=str(member["workspace_id"]) if member else None), 200


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
    if len(password) < 8:
        return jsonify(error="La contraseña debe tener al menos 8 caracteres"), 400

    if users().find_one({"email": email}):
        return jsonify(error="Ya existe una cuenta con ese email, iniciá sesión",
                       error_code="email_exists"), 409

    pw_hash = bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()
    result  = users().insert_one({
        "name":          name,
        "email":         email,
        "password_hash": pw_hash,
        "role":          "participant",
        "created_at":    datetime.utcnow(),
    })

    new_user_id = result.inserted_id

    # Procesar invitación de workspace si viene en el body
    invite_token = (data.get("invite_token") or "").strip()
    invite_code  = (data.get("invite_code")  or "").strip().upper()

    if invite_token or invite_code:
        query = {"status": "pending"}
        if invite_token: query["token"] = invite_token
        elif invite_code: query["code"] = invite_code
        inv = invitations_col().find_one(query)
        if inv and inv["expires_at"] > datetime.utcnow():
            workspace_members().insert_one({
                "workspace_id": inv["workspace_id"],
                "user_id":      new_user_id,
                "role":         inv["role"],
                "joined_at":    datetime.utcnow(),
            })
            invitations_col().update_one({"_id": inv["_id"]}, {"$set": {"status": "accepted"}})

    new_user = users().find_one({"_id": new_user_id})
    token    = create_access_token(
        identity=str(new_user_id),
        additional_claims=_workspace_claims(new_user),
    )
    return jsonify(token=token, user=fmt_user(new_user)), 201


@auth_bp.route("/profile", methods=["GET"])
@jwt_required()
def get_profile():
    uid = get_jwt_identity()
    u = users().find_one({"_id": ObjectId(uid)}, {"password_hash": 0})
    if not u:
        return jsonify(error="Usuario no encontrado", error_code="user_not_found"), 404
    ban_resp = _ban_block(u)
    if ban_resp:
        return ban_resp

    user_oid = ObjectId(uid)

    from db import event_joins, badges, workspaces
    joins = list(event_joins().find({"user_id": user_oid}))
    events_data = []
    for j in joins:
        ev = events().find_one({"_id": j["event_id"]})
        if not ev:
            continue
        badge_list = list(badges().find({"event_id": j["event_id"]}, {"_id": 1}))
        badge_ids = [b["_id"] for b in badge_list]
        obtained = scans().count_documents({"user_id": user_oid, "badge_id": {"$in": badge_ids}})
        ws = workspaces().find_one({"_id": ev.get("workspace_id")}, {"name": 1}) if ev.get("workspace_id") else None
        ws_name = ws.get("name", "") if ws else ""
        events_data.append({
            "id": str(ev["_id"]),
            "name": ev.get("name", ev.get("title", "")),
            "nombre": ev.get("name", ev.get("title", "")),
            "workspace_name": ws_name,
            "status": compute_event_status(ev),
            "tags": ev.get("tags", []),
            "obtained": obtained,
            "total": len(badge_list),
        })

    return jsonify({
        "id":       str(u["_id"]),
        "nombre":   u.get("name", ""),
        "email":    u.get("email", ""),
        "rol":      u.get("role", "participant"),
        "avatar":   u.get("avatar", None),
        "interests": u.get("interests", []),
        "privacy":  u.get("privacy", {"show_in_leaderboard": True, "show_badges": True}),
        "xp_total": u.get("xp_total", 0),
        "level":    u.get("level", 1),
        "events":   events_data,
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
    if len(new_pw) < 8:
        return jsonify(error="La nueva contraseña debe tener al menos 8 caracteres"), 400
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
    now_dt    = datetime.utcnow()
    client_ip = (request.headers.get("X-Forwarded-For") or request.remote_addr or "").split(",")[0].strip()

    # Verificar IP ban ANTES de validar credenciales
    if client_ip:
        ip_ban_doc = ip_bans().find_one({"ip": client_ip, "expires_at": {"$gt": now_dt}})
        if ip_ban_doc:
            return jsonify(error="Tu acceso ha sido bloqueado desde esta red.", error_code="IP_BANNED"), 403

    data     = request.get_json() or {}
    email    = sanitize(data.get("email") or "", max_len=254).lower()
    password = (data.get("password") or "").encode()

    user = users().find_one({"email": email})
    # Login normal solo funciona si la cuenta YA existe.
    if not user:
        return jsonify(error="No tenemos una cuenta con ese email",
                       error_code="no_account"), 401
    # Cuentas creadas solo con Google no tienen password_hash: no permitir login por contraseña.
    pw_hash = user.get("password_hash") or ""
    if not pw_hash or not bcrypt.checkpw(password, pw_hash.encode()):
        return jsonify(error="Correo o contraseña incorrectos"), 401

    # Check account ban (antes de generar el token)
    ban_resp = _ban_block(user)
    if ban_resp:
        return ban_resp

    if client_ip:
        users().update_one({"_id": user["_id"]}, {"$set": {"last_login_ip": client_ip}})

    token = create_access_token(
        identity=str(user["_id"]),
        additional_claims=_workspace_claims(user),
    )
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

    is_new = user is None
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

    # Check account ban (antes de generar el token)
    ban_resp = _ban_block(user)
    if ban_resp:
        return ban_resp

    token = create_access_token(
        identity=str(user["_id"]),
        additional_claims=_workspace_claims(user),
    )
    return jsonify(token=token, user=fmt_user(user), is_new=is_new), 200


@auth_bp.route("/achievements/definitions", methods=["GET"])
def achievement_definitions():
    defs = list(achievements().find(
        {},
        {"_id": 0, "slug": 1, "name": 1, "description": 1, "icon": 1, "rarity": 1, "xp_reward": 1}
    ))
    return jsonify(defs), 200


@auth_bp.route("/forgot-password", methods=["POST"])
@forgot_password_limit
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

    reset_link = os.getenv("FRONTEND_URL", "https://liangso420-cell.github.io/Lyfters-Badge-App") + "/reset-password.html?token=" + reset_token

    resend_key = os.getenv("RESEND_API_KEY")
    if resend_key:
        req.post(
            "https://api.resend.com/emails",
            headers={
                "Authorization": f"Bearer {resend_key}",
                "Content-Type": "application/json"
            },
            json={
                "from": "Lyfter <no-reply@lyfter.app>",
                "to": [email],
                "subject": "Restablecer contraseña — Lyfter",
                "html": f"""
                <div style="font-family:sans-serif;max-width:480px;margin:0 auto;">
                  <h2>Restablecer contraseña</h2>
                  <p>Hacé clic en el botón para restablecer tu contraseña. El link expira en 1 hora.</p>
                  <a href="{reset_link}" style="display:inline-block;padding:12px 24px;background:#e68a8d;color:#fff;border-radius:8px;text-decoration:none;font-weight:700;">Restablecer contraseña</a>
                  <p style="color:#888;font-size:12px;margin-top:24px;">Si no solicitaste este cambio, ignorá este email.</p>
                </div>
                """
            },
            timeout=5
        )

    return jsonify(ok=True), 200


@auth_bp.route("/reset-password", methods=["POST"])
def reset_password():
    data = request.get_json() or {}
    reset_token = data.get("token", "")
    new_password = data.get("password", "")

    if not reset_token or not new_password:
        return jsonify(error="Token y contraseña requeridos"), 400
    if len(new_password) < 8:
        return jsonify(error="La contraseña debe tener mínimo 8 caracteres"), 400

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


@auth_bp.route("/my-reviews", methods=["GET"])
@jwt_required()
def my_reviews():
    user_oid = ObjectId(get_jwt_identity())
    user_reviews = list(reviews().find({"user_id": user_oid}).sort("created_at", -1))
    result = []
    for r in user_reviews:
        ev = events().find_one({"_id": r["event_id"]}, {"title": 1, "name": 1})
        result.append({
            "event_name": ev.get("title", ev.get("name", "Evento")) if ev else "Evento",
            "rating": r.get("rating", 0),
            "recommend": r.get("recommend"),
            "best_part": r.get("best_part"),
            "return_again": r.get("return_again"),
        })
    return jsonify(reviews=result), 200

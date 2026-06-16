# backend/app.py — Lyfter Badge App

import io
import os
import re
import uuid
import base64
from datetime import datetime, timedelta
from collections import defaultdict

import bcrypt
import qrcode
from bson import ObjectId
from bson.errors import InvalidId
from pymongo.errors import DuplicateKeyError
from dotenv import load_dotenv
from flask import Flask, request, jsonify, redirect
from flask_cors import CORS
from flask_jwt_extended import (
    JWTManager, create_access_token,
    jwt_required, get_jwt_identity
)
from google.oauth2 import id_token
from google.auth.transport import requests as grequests

from db import users, events, badges, scans, init_indexes, event_joins

load_dotenv()

app = Flask(__name__)
app.config["JWT_SECRET_KEY"] = os.getenv("JWT_SECRET", "dev_secret_cambia_esto")
app.config["JWT_ACCESS_TOKEN_EXPIRES"] = timedelta(hours=8)

jwt = JWTManager(app)
init_indexes()

_env_origins = [
    o.strip() for o in os.getenv(
        "CORS_ORIGINS",
        "http://localhost:5500,http://127.0.0.1:5500"
    ).split(",") if o.strip()
]
# Also accept any *.vercel.app URL (preview and production deployments)
_cors_origins = _env_origins + [re.compile(r"^https://[a-zA-Z0-9][a-zA-Z0-9\-]*\.vercel\.app$")]
CORS(app, origins=_cors_origins, supports_credentials=True,
     methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"])

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
# HELPERS
# ──────────────────────────────────────────────

def valid_oid(s):
    try:
        return ObjectId(s)
    except (InvalidId, TypeError):
        return None


def generate_qr_base64(data: str) -> str:
    img = qrcode.make(data)
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    return "data:image/png;base64," + base64.b64encode(buf.getvalue()).decode()


def require_admin():
    uid = get_jwt_identity()
    user = users().find_one({"_id": ObjectId(uid)})
    if not user or user.get("role") != "admin":
        return None
    return user


def sanitize(s, max_len=100):
    return str(s or "").strip()[:max_len]


# ── Serializadores ──────────────────────────

def fmt_user(doc):
    created = doc.get("created_at")
    return {
        "id":         str(doc["_id"]),
        "nombre":     doc.get("name", ""),
        "email":      doc.get("email", ""),
        "rol":        doc.get("role", "participant"),
        "created_at": created.isoformat() if created else None,
    }


def fmt_event(doc):
    return {
        "id":           str(doc["_id"]),
        "nombre":       doc.get("title", ""),
        "descripcion":  doc.get("description", ""),
        "fecha_inicio": doc.get("start_date", datetime.utcnow()).isoformat(),
        "fecha_fin":    doc.get("end_date",   datetime.utcnow()).isoformat(),
        "premio":       doc.get("prize", ""),
        "activo":       doc.get("active", True),
        "photo":        doc.get("photo", None),
        "access_qr":    doc.get("access_qr", None),
    }


def fmt_badge(doc, obtenido=False, scanned_at=None):
    return {
        "id":          str(doc["_id"]),
        "icon":        doc.get("icon", "🏅"),
        "nombre":      doc.get("name", ""),
        "descripcion": doc.get("description", ""),
        "obtenido":    obtenido,
        "scanned_at":  scanned_at.isoformat() if scanned_at else None,
    }


def fmt_admin_badge(doc, canjeados=0, base_url=""):
    event_id = str(doc.get("event_id", ""))
    token    = doc.get("token", "")
    return {
        "id":          str(doc["_id"]),
        "icon":        doc.get("icon", "🏅"),
        "nombre":      doc.get("name", ""),
        "descripcion": doc.get("description", ""),
        "token":       token,
        "redeem_url":  f"{base_url}/redeem.html?event={event_id}&token={token}",
        "canjeados":   canjeados,
        "qr_image":    doc.get("qr_base64", None),
    }


# ──────────────────────────────────────────────
# INDEX
# ──────────────────────────────────────────────

@app.route("/", methods=["GET"])
def index():
    return redirect("https://liangso420-cell.github.io/Lyfters-Badge-App/", code=302)


# ──────────────────────────────────────────────
# AUTH
# ──────────────────────────────────────────────

@app.route("/auth/register", methods=["POST"])
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


@app.route("/auth/profile", methods=["GET"])
@jwt_required()
def get_profile():
    uid = get_jwt_identity()
    u = users().find_one({"_id": ObjectId(uid)}, {"password_hash": 0})
    if not u:
        return jsonify(error="Usuario no encontrado"), 404
    return jsonify({
        "id": str(u["_id"]),
        "nombre": u.get("name", ""),
        "email": u.get("email", ""),
        "rol": u.get("role", "participant"),
        "avatar": u.get("avatar", None)
    }), 200


@app.route("/auth/profile/avatar", methods=["POST"])
@jwt_required()
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


@app.route("/auth/change-password", methods=["POST"])
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


@app.route("/auth/login", methods=["POST"])
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


@app.route("/auth/google", methods=["POST"])
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
            "password_hash": None,
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


# ──────────────────────────────────────────────
# EVENTOS — participante / público
# ──────────────────────────────────────────────

@app.route("/events/", methods=["GET"])
@app.route("/events",  methods=["GET"])
def list_events():
    now  = datetime.utcnow()
    docs = events().find({"active": True, "end_date": {"$gte": now}})
    return jsonify([fmt_event(e) for e in docs]), 200


@app.route("/events/<event_id>", methods=["GET"])
@jwt_required(optional=True)
def get_event(event_id):
    oid = valid_oid(event_id)
    if not oid:
        return jsonify(error="ID inválido"), 400

    event = events().find_one({"_id": oid})
    if not event:
        return jsonify(error="Evento no encontrado"), 404

    uid      = get_jwt_identity()
    user_oid = ObjectId(uid) if uid else None

    badge_docs = list(badges().find({"event_id": oid}))
    total      = len(badge_docs)

    scans_data = {}
    if user_oid:
        for s in scans().find({"user_id": user_oid, "event_id": oid, "badge_id": {"$exists": True}}):
            scans_data[s["badge_id"]] = s.get("scanned_at")

    badge_list = [
        fmt_badge(b, obtenido=(b["_id"] in scans_data), scanned_at=scans_data.get(b["_id"]))
        for b in badge_docs
    ]
    obtenidos  = len(scans_data)
    completado = total > 0 and obtenidos >= total

    return jsonify({
        "id":              str(event["_id"]),
        "nombre":          event.get("title", ""),
        "premio":          event.get("prize", ""),
        "badges":          badge_list,
        "total_badges":    total,
        "obtenidos":       obtenidos,
        "completado":      completado,
        "premio_revelado": event.get("prize") if completado else None,
    }), 200


# ──────────────────────────────────────────────
# REDENCIÓN
# ──────────────────────────────────────────────

@app.route("/redeem/<event_id>/<token>", methods=["POST", "GET"])
@jwt_required()
def redeem_badge(event_id, token):
    uid       = get_jwt_identity()
    oid_event = valid_oid(event_id)
    if not oid_event:
        return jsonify(error="Evento inválido"), 400

    event = events().find_one({"_id": oid_event, "active": True})
    if not event:
        return jsonify(error="Evento no encontrado o inactivo"), 404

    badge = badges().find_one({"token": token, "event_id": oid_event})
    if not badge:
        return jsonify(error="Badge no encontrado para este evento"), 404

    user_oid  = ObjectId(uid)
    badge_oid = badge["_id"]

    already = scans().find_one({"user_id": user_oid, "badge_id": badge_oid})

    if not already:
        scans().insert_one({
            "user_id":    user_oid,
            "badge_id":   badge_oid,
            "event_id":   oid_event,
            "scanned_at": datetime.utcnow(),
        })

    total_b    = badges().count_documents({"event_id": oid_event})
    user_scns  = scans().count_documents({"user_id": user_oid, "event_id": oid_event, "badge_id": {"$exists": True}})
    completado = user_scns >= total_b

    return jsonify({
        "status":     "duplicado" if already else "ok",
        "badge": {
            "icon":        badge.get("icon", "🏅"),
            "nombre":      badge.get("name", ""),
            "descripcion": badge.get("description", ""),
        },
        "completado": completado,
        "premio":     event.get("prize") if completado else None,
        "progreso":   {"obtenidos": user_scns, "total": total_b},
    }), 200


# ──────────────────────────────────────────────
# ADMIN — eventos
# ──────────────────────────────────────────────

@app.route("/admin/events", methods=["GET"])
@jwt_required()
def admin_list_events():
    if not require_admin():
        return jsonify(error="Acceso denegado"), 403
    docs = events().find({})
    return jsonify([fmt_event(e) for e in docs]), 200


@app.route("/admin/event",  methods=["POST"])
@app.route("/admin/events", methods=["POST"])
@jwt_required()
def create_event():
    admin = require_admin()
    if not admin:
        return jsonify(error="Acceso denegado"), 403

    data        = request.get_json() or {}
    nombre      = sanitize(data.get("nombre")      or data.get("title")       or "", max_len=100)
    descripcion = sanitize(data.get("descripcion") or data.get("description") or "", max_len=500)
    premio      = sanitize(data.get("premio")      or data.get("prize")       or "", max_len=200)
    fecha_ini   = data.get("fecha_inicio") or data.get("start_date")
    fecha_fin   = data.get("fecha_fin")    or data.get("end_date")

    if not nombre:
        return jsonify(error="El nombre del evento es requerido"), 400
    if not fecha_ini:
        return jsonify(error="La fecha de inicio es requerida"), 400
    if not fecha_fin:
        return jsonify(error="La fecha de fin es requerida"), 400

    try:
        start = datetime.fromisoformat(str(fecha_ini))
        end   = datetime.fromisoformat(str(fecha_fin))
    except ValueError:
        return jsonify(error="Las fechas deben estar en formato ISO 8601 (ej: 2026-07-01)"), 400

    if end < start:
        return jsonify(error="La fecha de fin no puede ser anterior a la de inicio"), 400

    result = events().insert_one({
        "title":       nombre,
        "description": descripcion,
        "start_date":  start,
        "end_date":    end,
        "prize":       premio,
        "active":      bool(data.get("active", True)),
        "created_by":  admin["_id"],
        "created_at":  datetime.utcnow(),
    })

    new_event = events().find_one({"_id": result.inserted_id})
    return jsonify(fmt_event(new_event)), 201


@app.route("/admin/events/<event_id>", methods=["DELETE"])
@jwt_required()
def delete_event(event_id):
    if not require_admin():
        return jsonify(error="Acceso denegado"), 403
    oid = valid_oid(event_id)
    if not oid:
        return jsonify(error="ID inválido"), 400

    if not events().find_one({"_id": oid}):
        return jsonify(error="Evento no encontrado"), 404

    badge_oids = [b["_id"] for b in badges().find({"event_id": oid}, {"_id": 1})]
    scans().delete_many({"badge_id": {"$in": badge_oids}})
    scans().delete_many({"event_id": oid})
    badges().delete_many({"event_id": oid})
    events().delete_one({"_id": oid})
    return jsonify(mensaje="Evento eliminado"), 200


@app.route("/admin/events/<event_id>", methods=["PATCH"])
@jwt_required()
def update_event(event_id):
    if not require_admin():
        return jsonify(error="Acceso denegado"), 403

    oid = valid_oid(event_id)
    if not oid:
        return jsonify(error="ID inválido"), 400

    existing = events().find_one({"_id": oid})
    if not existing:
        return jsonify(error="Evento no encontrado"), 404

    data    = request.get_json() or {}
    updates = {}
    if "nombre"      in data: updates["title"]       = sanitize(data["nombre"], max_len=100)
    if "title"       in data: updates["title"]       = sanitize(data["title"], max_len=100)
    if "descripcion" in data: updates["description"] = sanitize(data["descripcion"], max_len=500)
    if "description" in data: updates["description"] = sanitize(data["description"], max_len=500)
    if "premio"      in data: updates["prize"]       = sanitize(data["premio"], max_len=200)
    if "prize"       in data: updates["prize"]       = sanitize(data["prize"], max_len=200)
    if "active"      in data: updates["active"]      = bool(data["active"])
    if "activo"      in data: updates["active"]      = bool(data["activo"])

    new_start = new_end = None
    for field, key in [("fecha_inicio", "start_date"), ("fecha_fin", "end_date"),
                       ("start_date", "start_date"),   ("end_date",  "end_date")]:
        if field in data:
            try:
                updates[key] = datetime.fromisoformat(str(data[field]))
                if key == "start_date": new_start = updates[key]
                if key == "end_date":   new_end   = updates[key]
            except ValueError:
                return jsonify(error=f"Formato de fecha inválido para {field}"), 400

    if not updates:
        return jsonify(error="Nada que actualizar"), 400

    s_check = new_start or existing.get("start_date")
    e_check = new_end   or existing.get("end_date")
    if s_check and e_check and e_check < s_check:
        return jsonify(error="La fecha de fin no puede ser anterior a la de inicio"), 400

    events().update_one({"_id": oid}, {"$set": updates})
    return jsonify(fmt_event(events().find_one({"_id": oid}))), 200


# ──────────────────────────────────────────────
# ADMIN — badges
# ──────────────────────────────────────────────

@app.route("/admin/events/<event_id>/badges", methods=["GET"])
@jwt_required()
def admin_list_badges(event_id):
    if not require_admin():
        return jsonify(error="Acceso denegado"), 403

    oid = valid_oid(event_id)
    if not oid:
        return jsonify(error="ID inválido"), 400

    event = events().find_one({"_id": oid})
    if not event:
        return jsonify(error="Evento no encontrado"), 404

    base_url   = os.getenv("APP_BASE_URL", "http://localhost:5500")
    badge_docs = list(badges().find({"event_id": oid}))

    result_badges = []
    for b in badge_docs:
        canjeados = scans().count_documents({"badge_id": b["_id"]})
        result_badges.append(fmt_admin_badge(b, canjeados=canjeados, base_url=base_url))

    return jsonify({
        "evento": {
            "id":       str(event["_id"]),
            "nombre":   event.get("title", ""),
            "access_qr": event.get("access_qr", None),
            "photo":    event.get("photo", None),
        },
        "badges": result_badges,
    }), 200


@app.route("/admin/events/<event_id>/badge",  methods=["POST"])
@app.route("/admin/events/<event_id>/badges", methods=["POST"])
@jwt_required()
def create_badge(event_id):
    if not require_admin():
        return jsonify(error="Acceso denegado"), 403

    oid_event = valid_oid(event_id)
    if not oid_event or not events().find_one({"_id": oid_event}):
        return jsonify(error="Evento no encontrado"), 404

    data        = request.get_json() or {}
    nombre      = sanitize(data.get("nombre")      or data.get("name")        or "", max_len=100)
    descripcion = sanitize(data.get("descripcion") or data.get("description") or "", max_len=500)
    icon        = sanitize(data.get("icon") or "🏅", max_len=10)

    if not nombre:
        return jsonify(error="El nombre del badge es requerido"), 400

    token    = str(uuid.uuid4())
    base_url = os.getenv("APP_BASE_URL", "http://localhost:5500")
    qr_data  = f"{base_url}/redeem.html?event={event_id}&token={token}"
    qr_b64   = generate_qr_base64(qr_data)

    try:
        result = badges().insert_one({
            "event_id":    oid_event,
            "name":        nombre,
            "description": descripcion,
            "icon":        icon,
            "token":       token,
            "qr_base64":   qr_b64,
            "created_at":  datetime.utcnow(),
        })
    except DuplicateKeyError:
        return jsonify(error="Ya existe un badge con ese token"), 409

    new_badge = badges().find_one({"_id": result.inserted_id})
    return jsonify({
        "id":          str(new_badge["_id"]),
        "icon":        new_badge.get("icon", "🏅"),
        "nombre":      new_badge.get("name", ""),
        "descripcion": new_badge.get("description", ""),
        "token":       new_badge.get("token", ""),
        "qr_image":    new_badge.get("qr_base64", None),
    }), 201


@app.route("/admin/events/<event_id>/badges/<badge_id>", methods=["DELETE"])
@jwt_required()
def delete_badge(event_id, badge_id):
    if not require_admin():
        return jsonify(error="Acceso denegado"), 403
    oid = valid_oid(badge_id)
    if not oid:
        return jsonify(error="ID inválido"), 400
    badges().delete_one({"_id": oid})
    scans().delete_many({"badge_id": oid})
    return jsonify(mensaje="Badge eliminado"), 200


@app.route("/admin/badges/<badge_id>/regenerate-qr", methods=["POST"])
@jwt_required()
def regenerate_qr(badge_id):
    if not require_admin():
        return jsonify(error="Acceso denegado"), 403

    oid = valid_oid(badge_id)
    if not oid:
        return jsonify(error="ID inválido"), 400

    badge = badges().find_one({"_id": oid})
    if not badge:
        return jsonify(error="Badge no encontrado"), 404

    new_token = str(uuid.uuid4())
    event_id  = str(badge.get("event_id", ""))
    base_url  = os.getenv("APP_BASE_URL", "http://localhost:5500")
    qr_data   = f"{base_url}/redeem.html?event={event_id}&token={new_token}"
    qr_b64    = generate_qr_base64(qr_data)

    badges().update_one({"_id": oid}, {"$set": {"token": new_token, "qr_base64": qr_b64}})

    updated   = badges().find_one({"_id": oid})
    canjeados = scans().count_documents({"badge_id": oid})
    return jsonify(fmt_admin_badge(updated, canjeados=canjeados, base_url=base_url)), 200


# ──────────────────────────────────────────────
# EVENTOS — unirse (join)
# ──────────────────────────────────────────────

@app.route("/events/<event_id>/join", methods=["POST"])
@jwt_required()
def join_event(event_id):
    uid = get_jwt_identity()
    oid = valid_oid(event_id)
    if not oid:
        return jsonify(error="ID inválido"), 400
    event = events().find_one({"_id": oid, "active": True})
    if not event:
        return jsonify(error="Evento no encontrado o inactivo"), 404
    user_oid = ObjectId(uid)
    already = event_joins().find_one({"user_id": user_oid, "event_id": oid})
    if not already:
        event_joins().insert_one({
            "user_id":    user_oid,
            "event_id":   oid,
            "joined_at":  datetime.utcnow(),
        })
    return jsonify({
        "status": "already_joined" if already else "joined",
        "event": fmt_event(event)
    }), 200


# ──────────────────────────────────────────────
# ADMIN — foto y QR de acceso al evento
# ──────────────────────────────────────────────

@app.route("/admin/events/<event_id>/access-qr", methods=["POST"])
@jwt_required()
def generate_event_access_qr(event_id):
    if not require_admin():
        return jsonify(error="Acceso denegado"), 403
    oid = valid_oid(event_id)
    if not oid:
        return jsonify(error="ID inválido"), 400
    event = events().find_one({"_id": oid})
    if not event:
        return jsonify(error="Evento no encontrado"), 404
    base_url = os.getenv("APP_BASE_URL", "http://localhost:5500")
    qr_data  = f"{base_url}/join.html?event={event_id}"
    qr_b64   = generate_qr_base64(qr_data)
    events().update_one({"_id": oid}, {"$set": {"access_qr": qr_b64}})
    return jsonify({"access_qr": qr_b64, "join_url": qr_data}), 200


@app.route("/admin/events/<event_id>/photo", methods=["POST"])
@jwt_required()
def update_event_photo(event_id):
    if not require_admin():
        return jsonify(error="Acceso denegado"), 403
    oid = valid_oid(event_id)
    if not oid:
        return jsonify(error="ID inválido"), 400
    data = request.get_json() or {}
    photo = data.get("photo", "")
    if not photo or not photo.startswith("data:image/"):
        return jsonify(error="Imagen inválida"), 400
    if len(photo) > 3 * 1024 * 1024:
        return jsonify(error="La imagen no puede superar 3MB"), 400
    events().update_one({"_id": oid}, {"$set": {"photo": photo}})
    return jsonify(ok=True), 200


# ──────────────────────────────────────────────
# ADMIN — dashboard y usuarios
# ──────────────────────────────────────────────

@app.route("/admin/dashboard", methods=["GET"])
@jwt_required()
def admin_dashboard():
    if not require_admin():
        return jsonify(error="Acceso denegado"), 403

    total_participantes    = users().count_documents({"role": "participant"})
    total_eventos          = events().count_documents({})
    total_badges_creados   = badges().count_documents({})
    total_badges_canjeados = scans().count_documents({})

    progreso = []
    for e in events().find({}):
        eid     = e["_id"]
        total_b = badges().count_documents({"event_id": eid})
        total_c = scans().count_documents({"event_id": eid})
        unicos  = len(scans().distinct("user_id", {"event_id": eid}))
        pct     = round((total_c / total_b) * 100, 1) if total_b > 0 else 0.0
        progreso.append({
            "id":                   str(eid),
            "nombre":               e.get("title", ""),
            "total_badges":         total_b,
            "total_canjeados":      total_c,
            "porcentaje":           pct,
            "participantes_unicos": unicos,
        })

    return jsonify({
        "total_participantes":    total_participantes,
        "total_eventos":          total_eventos,
        "total_badges_creados":   total_badges_creados,
        "total_badges_canjeados": total_badges_canjeados,
        "progreso_por_evento":    progreso,
    }), 200


@app.route("/admin/users", methods=["GET"])
@jwt_required()
def admin_list_users():
    if not require_admin():
        return jsonify(error="Acceso denegado"), 403
    docs = list(users().find({}, {"password_hash": 0}))
    result = []
    for u in docs:
        try:
            result.append({
                "id":         str(u["_id"]),
                "nombre":     u.get("name", ""),
                "email":      u.get("email", ""),
                "rol":        u.get("role", "participant"),
                "created_at": u.get("created_at", "").isoformat() if u.get("created_at") else None
            })
        except Exception:
            continue
    return jsonify(result), 200


@app.route("/admin/users/<user_id>/role", methods=["PATCH"])
@jwt_required()
def change_user_role(user_id):
    admin = require_admin()
    if not admin:
        return jsonify(error="Acceso denegado"), 403

    if str(admin["_id"]) == user_id:
        return jsonify(error="No podés cambiar tu propio rol"), 400

    oid = valid_oid(user_id)
    if not oid:
        return jsonify(error="ID inválido"), 400

    data     = request.get_json() or {}
    new_role = data.get("rol", "")
    if new_role not in ("admin", "participant"):
        return jsonify(error="Rol inválido. Usar 'admin' o 'participant'"), 400

    user = users().find_one({"_id": oid})
    if not user:
        return jsonify(error="Usuario no encontrado"), 404

    users().update_one({"_id": oid}, {"$set": {"role": new_role}})
    return jsonify(fmt_user(users().find_one({"_id": oid}))), 200


# ──────────────────────────────────────────────
# LEADERBOARD
# ──────────────────────────────────────────────

@app.route("/leaderboard", methods=["GET"])
@jwt_required()
def leaderboard():
    user_list = list(users().find({}, {"password_hash": 0}))
    result = []
    for u in user_list:
        uid = u["_id"]
        total_badges = scans().count_documents({"user_id": uid})
        result.append({
            "id":     str(uid),
            "nombre": u.get("name", ""),
            "avatar": u.get("avatar", None),
            "badges": total_badges
        })
    result.sort(key=lambda x: x["badges"], reverse=True)
    return jsonify(result), 200


# ──────────────────────────────────────────────
# HEALTHCHECK
# ──────────────────────────────────────────────

@app.route("/health", methods=["GET"])
def health():
    return jsonify(status="ok", service="lyfter-badge-api"), 200


if __name__ == "__main__":
    port  = int(os.getenv("PORT", 5000))
    debug = os.getenv("FLASK_ENV") == "development"
    app.run(host="0.0.0.0", port=port, debug=debug)

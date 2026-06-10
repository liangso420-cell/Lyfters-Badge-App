# backend/app.py — Lyfter Badge App
# Campos y rutas ajustados al contrato que espera el frontend (api.js modo backend)

import io
import os
import uuid
import base64
from datetime import datetime, timedelta

import bcrypt
import qrcode
from bson import ObjectId
from bson.errors import InvalidId
from dotenv import load_dotenv
from flask import Flask, request, jsonify
from flask_cors import CORS
from flask_jwt_extended import (
    JWTManager, create_access_token,
    jwt_required, get_jwt_identity
)

from db import users, events, badges, scans

load_dotenv()

app = Flask(__name__)
app.config["JWT_SECRET_KEY"] = os.getenv("JWT_SECRET", "dev_secret_cambia_esto")
app.config["JWT_ACCESS_TOKEN_EXPIRES"] = timedelta(hours=24)

jwt = JWTManager(app)

# CORS — permite el frontend en puerto 5500
cors_origins = os.getenv(
    "CORS_ORIGINS",
    "http://localhost:5500,http://127.0.0.1:5500"
).split(",")
CORS(app, origins=cors_origins, supports_credentials=True)


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


# ── Serializadores con campos en español ──────

def fmt_user(doc):
    return {
        "id":     str(doc["_id"]),
        "nombre": doc.get("name", ""),
        "email":  doc.get("email", ""),
        "rol":    doc.get("role", "participant"),
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
    }


def fmt_badge(doc, obtenido=False):
    return {
        "id":          str(doc["_id"]),
        "icon":        doc.get("icon", "🏅"),
        "nombre":      doc.get("name", ""),
        "descripcion": doc.get("description", ""),
        "obtenido":    obtenido,
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
        "redeem_url":  f"{base_url}/redeem/{event_id}/{token}",
        "canjeados":   canjeados,
        "qr_image":    doc.get("qr_base64", None),
    }


# ──────────────────────────────────────────────
# AUTH
# ──────────────────────────────────────────────

@app.route("/auth/register", methods=["POST"])
def register():
    data     = request.get_json() or {}
    name     = (data.get("nombre") or data.get("name") or "").strip()
    email    = (data.get("email") or "").strip().lower()
    password = data.get("password") or ""

    if not name or not email or len(password) < 6:
        return jsonify(error="nombre, email y password (min 6 chars) son requeridos"), 400

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


@app.route("/auth/login", methods=["POST"])
def login():
    data     = request.get_json() or {}
    email    = (data.get("email") or "").strip().lower()
    password = (data.get("password") or "").encode()

    user = users().find_one({"email": email})
    if not user or not bcrypt.checkpw(password, user["password_hash"].encode()):
        return jsonify(error="Credenciales invalidas"), 401

    token = create_access_token(identity=str(user["_id"]))
    return jsonify(token=token, user=fmt_user(user)), 200


# ──────────────────────────────────────────────
# EVENTOS — participante / público
# ──────────────────────────────────────────────

@app.route("/events/", methods=["GET"])
@app.route("/events",  methods=["GET"])
def list_events():
    docs = events().find({"active": True})
    return jsonify([fmt_event(e) for e in docs]), 200


@app.route("/events/<event_id>", methods=["GET"])
@jwt_required(optional=True)
def get_event(event_id):
    oid = valid_oid(event_id)
    if not oid:
        return jsonify(error="ID invalido"), 400

    event = events().find_one({"_id": oid})
    if not event:
        return jsonify(error="Evento no encontrado"), 404

    uid      = get_jwt_identity()
    user_oid = ObjectId(uid) if uid else None

    badge_docs = list(badges().find({"event_id": oid}))
    total      = len(badge_docs)

    scanned_ids = set()
    if user_oid:
        scanned_ids = {
            s["badge_id"]
            for s in scans().find({"user_id": user_oid, "event_id": oid}, {"badge_id": 1})
        }

    badge_list = [fmt_badge(b, obtenido=(b["_id"] in scanned_ids)) for b in badge_docs]
    obtenidos  = len(scanned_ids)
    completado = total > 0 and obtenidos >= total

    return jsonify({
        "id":             str(event["_id"]),
        "nombre":         event.get("title", ""),
        "premio":         event.get("prize", ""),
        "badges":         badge_list,
        "total_badges":   total,
        "obtenidos":      obtenidos,
        "completado":     completado,
        "premio_revelado": event.get("prize") if completado else None,
    }), 200


# ──────────────────────────────────────────────
# REDENCIÓN — POST (el QR genera un POST al escanear)
# ──────────────────────────────────────────────

@app.route("/redeem/<event_id>/<token>", methods=["POST", "GET"])
@jwt_required()
def redeem_badge(event_id, token):
    uid       = get_jwt_identity()
    oid_event = valid_oid(event_id)
    if not oid_event:
        return jsonify(error="Evento invalido"), 400

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

    total_b   = badges().count_documents({"event_id": oid_event})
    user_scns = scans().count_documents({"user_id": user_oid, "event_id": oid_event})
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


# El frontend llama POST /admin/event (singular)
@app.route("/admin/event",  methods=["POST"])
@app.route("/admin/events", methods=["POST"])
@jwt_required()
def create_event():
    admin = require_admin()
    if not admin:
        return jsonify(error="Acceso denegado"), 403

    data = request.get_json() or {}
    nombre      = (data.get("nombre")      or data.get("title")       or "").strip()
    descripcion = (data.get("descripcion") or data.get("description") or "").strip()
    premio      = (data.get("premio")      or data.get("prize")       or "").strip()
    fecha_ini   = data.get("fecha_inicio") or data.get("start_date")
    fecha_fin   = data.get("fecha_fin")    or data.get("end_date")

    if not nombre or not fecha_ini or not fecha_fin:
        return jsonify(error="nombre, fecha_inicio y fecha_fin son requeridos"), 400

    try:
        start = datetime.fromisoformat(str(fecha_ini))
        end   = datetime.fromisoformat(str(fecha_fin))
    except ValueError:
        return jsonify(error="fechas deben ser ISO 8601 (ej: 2026-07-01)"), 400

    result = events().insert_one({
        "title":       nombre,
        "description": descripcion,
        "start_date":  start,
        "end_date":    end,
        "prize":       premio,
        "active":      data.get("active", True),
        "created_by":  admin["_id"],
        "created_at":  datetime.utcnow(),
    })

    new_event = events().find_one({"_id": result.inserted_id})
    return jsonify(fmt_event(new_event)), 201


@app.route("/admin/events/<event_id>", methods=["PATCH"])
@jwt_required()
def update_event(event_id):
    if not require_admin():
        return jsonify(error="Acceso denegado"), 403

    oid = valid_oid(event_id)
    if not oid:
        return jsonify(error="ID invalido"), 400

    data    = request.get_json() or {}
    updates = {}
    if "nombre"      in data: updates["title"]       = data["nombre"]
    if "title"       in data: updates["title"]       = data["title"]
    if "descripcion" in data: updates["description"] = data["descripcion"]
    if "description" in data: updates["description"] = data["description"]
    if "premio"      in data: updates["prize"]       = data["premio"]
    if "prize"       in data: updates["prize"]       = data["prize"]
    if "active"      in data: updates["active"]      = data["active"]
    if "activo"      in data: updates["active"]      = data["activo"]

    for field, key in [("fecha_inicio", "start_date"), ("fecha_fin", "end_date"),
                       ("start_date", "start_date"),   ("end_date",  "end_date")]:
        if field in data:
            updates[key] = datetime.fromisoformat(str(data[field]))

    if not updates:
        return jsonify(error="Nada que actualizar"), 400

    events().update_one({"_id": oid}, {"$set": updates})
    return jsonify(fmt_event(events().find_one({"_id": oid}))), 200


# ──────────────────────────────────────────────
# ADMIN — badges
# ──────────────────────────────────────────────

# GET lista badges del evento + stats de canjes
@app.route("/admin/events/<event_id>/badges", methods=["GET"])
@jwt_required()
def admin_list_badges(event_id):
    if not require_admin():
        return jsonify(error="Acceso denegado"), 403

    oid = valid_oid(event_id)
    if not oid:
        return jsonify(error="ID invalido"), 400

    event = events().find_one({"_id": oid})
    if not event:
        return jsonify(error="Evento no encontrado"), 404

    base_url   = os.getenv("APP_BASE_URL", "http://localhost:5000")
    badge_docs = list(badges().find({"event_id": oid}))

    result_badges = []
    for b in badge_docs:
        canjeados = scans().count_documents({"badge_id": b["_id"]})
        result_badges.append(fmt_admin_badge(b, canjeados=canjeados, base_url=base_url))

    return jsonify({
        "evento": {
            "id":     str(event["_id"]),
            "nombre": event.get("title", ""),
        },
        "badges": result_badges,
    }), 200


# POST crea badge — el frontend llama /badge (singular)
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
    nombre      = (data.get("nombre")      or data.get("name")        or "").strip()
    descripcion = (data.get("descripcion") or data.get("description") or "").strip()
    icon        = (data.get("icon")        or "🏅").strip()

    if not nombre:
        return jsonify(error="nombre es requerido"), 400

    token    = str(uuid.uuid4())
    base_url = os.getenv("APP_BASE_URL", "http://localhost:5000")
    qr_data  = f"{base_url}/redeem/{event_id}/{token}"
    qr_b64   = generate_qr_base64(qr_data)

    result = badges().insert_one({
        "event_id":    oid_event,
        "name":        nombre,
        "description": descripcion,
        "icon":        icon,
        "token":       token,
        "qr_base64":   qr_b64,
        "created_at":  datetime.utcnow(),
    })

    new_badge = badges().find_one({"_id": result.inserted_id})
    return jsonify({
        "id":          str(new_badge["_id"]),
        "icon":        new_badge.get("icon", "🏅"),
        "nombre":      new_badge.get("name", ""),
        "descripcion": new_badge.get("description", ""),
        "token":       new_badge.get("token", ""),
        "qr_image":    new_badge.get("qr_base64", None),
    }), 201


# ──────────────────────────────────────────────
# HEALTHCHECK
# ──────────────────────────────────────────────

@app.route("/health", methods=["GET"])
def health():
    return jsonify(status="ok", service="lyfter-badge-api"), 200


if __name__ == "__main__":
    port = int(os.getenv("PORT", 5000))
    app.run(debug=True, port=port)

# backend/routes/admin.py — rutas /admin/*

import os
import uuid
from datetime import datetime

from pymongo.errors import DuplicateKeyError
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt, get_jwt_identity
from bson import ObjectId

from db import users, events, badges, scans, workspace_members, workspaces, event_joins, reviews, ip_bans
from utils import (
    require_admin, valid_oid, sanitize,
    generate_qr_base64, fmt_event, fmt_admin_badge, fmt_user, compute_event_status
)

admin_bp = Blueprint("admin", __name__)


def get_caller_role():
    return get_jwt().get("role", "participant")

def is_god_admin():
    return get_caller_role() == "god_admin"

def is_superadmin_or_above():
    return get_caller_role() in ("superadmin", "god_admin")

def is_admin_or_above():
    return get_caller_role() in ("admin", "superadmin", "god_admin")


def _get_ws_id():
    """Devuelve el workspace_id del JWT como ObjectId, o None si no hay workspace seleccionado."""
    claims = get_jwt()
    ws = claims.get("workspace_id")
    if not ws:
        ws = request.headers.get("X-Workspace-Id")
    return ObjectId(ws) if ws else None


def verify_event_ownership(event_id):
    """Verifica que el evento pertenece al workspace del admin actual."""
    ws_id = _get_ws_id()
    claims = get_jwt()
    if ws_id is None and claims.get("role") == "god_admin":
        return True  # god_admin sin workspace seleccionado puede acceder a todo
    event = events().find_one({"_id": ObjectId(event_id)})
    if not event:
        return False
    return str(event.get("workspace_id", "")) == str(ws_id)


def _parse_int_in_range(value, lo, hi, field):
    """
    Convierte `value` a int y valida que esté en [lo, hi].
    Retorna (int|None, error_msg|None). Si value es None retorna (None, None)
    para que el llamador aplique su default.
    """
    if value is None:
        return None, None
    try:
        n = int(value)
    except (TypeError, ValueError):
        return None, f"{field} debe ser un número entero"
    if n < lo or n > hi:
        return None, f"{field} debe estar entre {lo} y {hi}"
    return n, None


# ──────────────────────────────────────────────
# ADMIN — eventos
# ──────────────────────────────────────────────

@admin_bp.route("/events", methods=["GET"])
@jwt_required()
def admin_list_events():
    if not require_admin():
        return jsonify(error="Acceso denegado"), 403
    ws_id = _get_ws_id()
    role = get_caller_role()
    claims = get_jwt()
    if ws_id is None:
        # god_admin sin workspace seleccionado — ve todo
        query = {}
    elif role == "admin":
        # Admin ve todos los eventos de su workspace
        query = {"workspace_id": ws_id}
    else:
        # superadmin o god_admin con workspace seleccionado — todos los eventos del workspace
        query = {"workspace_id": ws_id}
    docs = list(events().find(query))
    # Build workspace name cache to avoid N+1 queries
    ws_ids = {e["workspace_id"] for e in docs if e.get("workspace_id")}
    ws_names = {
        str(ws["_id"]): ws.get("name", "")
        for ws in workspaces().find({"_id": {"$in": list(ws_ids)}}, {"name": 1})
    }
    return jsonify([fmt_event(e) for e in docs]), 200


@admin_bp.route("/event",  methods=["POST"])
@admin_bp.route("/events", methods=["POST"])
@jwt_required()
def create_event():
    admin = require_admin()
    if not admin:
        return jsonify(error="Acceso denegado"), 403

    data        = request.get_json() or {}
    nombre      = sanitize(data.get("nombre")      or data.get("title")       or "", max_len=100)
    descripcion = sanitize(data.get("descripcion") or data.get("description") or "", max_len=500)
    premio      = sanitize(data.get("premio")      or data.get("prize")       or "", max_len=200)
    location    = sanitize(data.get("location", ""), max_len=200)
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

    # Configuración de XP del evento (opcional, con defaults).
    xp_first_scan, err = _parse_int_in_range(data.get("xp_first_scan"), 0, 1000, "xp_first_scan")
    if err:
        return jsonify(error=err), 400
    xp_rare_bonus, err = _parse_int_in_range(data.get("xp_rare_bonus"), 0, 1000, "xp_rare_bonus")
    if err:
        return jsonify(error=err), 400
    xp_completion_bonus, err = _parse_int_in_range(data.get("xp_completion_bonus"), 0, 1000, "xp_completion_bonus")
    if err:
        return jsonify(error=err), 400

    ws_id = _get_ws_id()
    new_event_doc = {
        "title":       nombre,
        "description": descripcion,
        "start_date":  start,
        "end_date":    end,
        "prize":       premio,
        "location":    location,
        "active":      bool(data.get("active", True)),
        "xp_first_scan":       xp_first_scan if xp_first_scan is not None else 5,
        "xp_rare_bonus":       xp_rare_bonus if xp_rare_bonus is not None else 15,
        "xp_completion_bonus": xp_completion_bonus if xp_completion_bonus is not None else 50,
        "created_by":  ObjectId(get_jwt_identity()),
        "created_at":  datetime.utcnow(),
    }
    if ws_id:
        new_event_doc["workspace_id"] = ws_id
    result = events().insert_one(new_event_doc)

    new_event = events().find_one({"_id": result.inserted_id})
    ws_name = None
    if ws_id:
        ws_doc = workspaces().find_one({"_id": ws_id}, {"name": 1})
        ws_name = ws_doc.get("name") if ws_doc else None
    return jsonify(fmt_event(new_event, ws_name)), 201


@admin_bp.route("/events/<event_id>", methods=["DELETE"])
@jwt_required()
def delete_event(event_id):
    if not require_admin():
        return jsonify(error="Acceso denegado"), 403
    oid = valid_oid(event_id)
    if not oid:
        return jsonify(error="ID inválido"), 400
    if not verify_event_ownership(event_id):
        return jsonify(error="No tenés acceso a este evento"), 403

    if not events().find_one({"_id": oid}):
        return jsonify(error="Evento no encontrado"), 404

    badge_oids = [b["_id"] for b in badges().find({"event_id": oid}, {"_id": 1})]
    scans().delete_many({"badge_id": {"$in": badge_oids}})
    badges().delete_many({"event_id": oid})
    events().delete_one({"_id": oid})
    return jsonify(mensaje="Evento eliminado"), 200


@admin_bp.route("/events/<event_id>", methods=["PATCH"])
@jwt_required()
def update_event(event_id):
    if not require_admin():
        return jsonify(error="Acceso denegado"), 403

    oid = valid_oid(event_id)
    if not oid:
        return jsonify(error="ID inválido"), 400
    if not verify_event_ownership(event_id):
        return jsonify(error="No tenés acceso a este evento"), 403

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
    if "status"      in data: updates["status"]      = data["status"]
    if "location"    in data: updates["location"]    = sanitize(data["location"], max_len=200)

    # Campos de XP del evento (solo afectan scans futuros).
    for field in ("xp_first_scan", "xp_rare_bonus", "xp_completion_bonus"):
        if field in data:
            n, err = _parse_int_in_range(data[field], 0, 1000, field)
            if err:
                return jsonify(error=err), 400
            updates[field] = n

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
    updated = events().find_one({"_id": oid})
    ws_name = None
    if updated and updated.get("workspace_id"):
        ws_doc = workspaces().find_one({"_id": updated["workspace_id"]}, {"name": 1})
        ws_name = ws_doc.get("name") if ws_doc else None
    return jsonify(fmt_event(updated, ws_name)), 200


@admin_bp.route("/events/<event_id>/location", methods=["POST"])
@jwt_required()
def update_event_location(event_id):
    if not require_admin():
        return jsonify(error="Acceso denegado"), 403
    oid = valid_oid(event_id)
    if not oid:
        return jsonify(error="ID inválido"), 400
    data = request.get_json() or {}
    location = sanitize(data.get("location", ""), max_len=200)
    events().update_one({"_id": oid}, {"$set": {"location": location}})
    return jsonify(ok=True), 200


@admin_bp.route("/events/<event_id>/coordinates", methods=["POST"])
@jwt_required()
def update_event_coordinates(event_id):
    if not require_admin():
        return jsonify(error="Acceso denegado"), 403
    oid = valid_oid(event_id)
    if not oid:
        return jsonify(error="ID inválido"), 400
    data = request.get_json() or {}
    lat = data.get("lat")
    lng = data.get("lng")
    if lat is None or lng is None:
        return jsonify(error="Se requieren lat y lng"), 400
    try:
        lat, lng = float(lat), float(lng)
    except (TypeError, ValueError):
        return jsonify(error="lat y lng deben ser números"), 400
    events().update_one({"_id": oid}, {"$set": {"lat": lat, "lng": lng}})
    return jsonify(ok=True), 200


# ──────────────────────────────────────────────
# ADMIN — badges
# ──────────────────────────────────────────────

@admin_bp.route("/events/<event_id>/badges", methods=["GET"])
@jwt_required()
def admin_list_badges(event_id):
    if not require_admin():
        return jsonify(error="Acceso denegado"), 403

    oid = valid_oid(event_id)
    if not oid:
        return jsonify(error="ID inválido"), 400
    if not verify_event_ownership(event_id):
        return jsonify(error="No tenés acceso a este evento"), 403

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
        "event": {
            "id":        str(event["_id"]),
            "name":      event.get("title", event.get("name", "")),
            "access_qr": event.get("access_qr", None),
            "photo":     event.get("photo", event.get("photo_url", None)),
            "status":    compute_event_status(event),
            "lat":       event.get("lat"),
            "lng":       event.get("lng"),
        },
        "badges": result_badges,
    }), 200


@admin_bp.route("/events/<event_id>/badge",  methods=["POST"])
@admin_bp.route("/events/<event_id>/badges", methods=["POST"])
@jwt_required()
def create_badge(event_id):
    if not require_admin():
        return jsonify(error="Acceso denegado"), 403

    oid_event = valid_oid(event_id)
    if not oid_event:
        return jsonify(error="ID inválido"), 400
    if not verify_event_ownership(event_id):
        return jsonify(error="No tenés acceso a este evento"), 403
    if not events().find_one({"_id": oid_event}):
        return jsonify(error="Evento no encontrado"), 404

    data        = request.get_json() or {}
    nombre      = sanitize(data.get("nombre")      or data.get("name")        or "", max_len=100)
    descripcion = sanitize(data.get("descripcion") or data.get("description") or "", max_len=500)
    icon        = sanitize(data.get("icon") or "🏅", max_len=10)
    icon_url    = data.get("icon_url") or None

    if not nombre:
        return jsonify(error="El nombre del badge es requerido"), 400

    # XP del badge (opcional). xp_value en [1, 500]; is_rare booleano.
    xp_value, err = _parse_int_in_range(data.get("xp_value"), 1, 500, "xp_value")
    if err:
        return jsonify(error=err), 400
    is_rare = bool(data.get("is_rare", False))

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
            "icon_url":    icon_url,
            "token":       token,
            "qr_base64":   qr_b64,
            "xp_value":    xp_value if xp_value is not None else 10,
            "is_rare":     is_rare,
            "created_at":  datetime.utcnow(),
        })
    except DuplicateKeyError:
        return jsonify(error="Ya existe un badge con ese token"), 409

    new_badge = badges().find_one({"_id": result.inserted_id})
    return jsonify({
        "id":          str(new_badge["_id"]),
        "icon":        new_badge.get("icon", "🏅"),
        "icon_url":    new_badge.get("icon_url", None),
        "nombre":      new_badge.get("name", ""),
        "descripcion": new_badge.get("description", ""),
        "token":       new_badge.get("token", ""),
        "qr_image":    new_badge.get("qr_base64", None),
        "xp_value":    new_badge.get("xp_value", 10),
        "is_rare":     bool(new_badge.get("is_rare", False)),
    }), 201


@admin_bp.route("/events/<event_id>/badges/<badge_id>", methods=["PATCH"])
@jwt_required()
def update_badge(event_id, badge_id):
    if not require_admin():
        return jsonify(error="Acceso denegado"), 403

    if not valid_oid(event_id):
        return jsonify(error="ID inválido"), 400
    if not verify_event_ownership(event_id):
        return jsonify(error="No tenés acceso a este evento"), 403

    oid = valid_oid(badge_id)
    if not oid:
        return jsonify(error="ID inválido"), 400

    badge = badges().find_one({"_id": oid})
    if not badge:
        return jsonify(error="Badge no encontrado"), 404

    data    = request.get_json() or {}
    updates = {}
    if "nombre"      in data: updates["name"]        = sanitize(data["nombre"], max_len=100)
    if "name"        in data: updates["name"]        = sanitize(data["name"], max_len=100)
    if "descripcion" in data: updates["description"] = sanitize(data["descripcion"], max_len=500)
    if "description" in data: updates["description"] = sanitize(data["description"], max_len=500)
    if "icon"        in data: updates["icon"]        = sanitize(data["icon"] or "🏅", max_len=10)

    if "xp_value" in data:
        xp_value, err = _parse_int_in_range(data["xp_value"], 1, 500, "xp_value")
        if err:
            return jsonify(error=err), 400
        if xp_value is not None:
            updates["xp_value"] = xp_value
    if "is_rare" in data:
        updates["is_rare"] = bool(data["is_rare"])

    # El nombre no puede quedar vacío si se envió.
    if "name" in updates and not updates["name"]:
        return jsonify(error="El nombre del badge es requerido"), 400

    if not updates:
        return jsonify(error="Nada que actualizar"), 400

    badges().update_one({"_id": oid}, {"$set": updates})

    base_url  = os.getenv("APP_BASE_URL", "http://localhost:5500")
    updated   = badges().find_one({"_id": oid})
    canjeados = scans().count_documents({"badge_id": oid})
    return jsonify(fmt_admin_badge(updated, canjeados=canjeados, base_url=base_url)), 200


@admin_bp.route("/events/<event_id>/badges/<badge_id>", methods=["DELETE"])
@jwt_required()
def delete_badge(event_id, badge_id):
    if not require_admin():
        return jsonify(error="Acceso denegado"), 403
    if not valid_oid(event_id):
        return jsonify(error="ID inválido"), 400
    if not verify_event_ownership(event_id):
        return jsonify(error="No tenés acceso a este evento"), 403
    oid = valid_oid(badge_id)
    if not oid:
        return jsonify(error="ID inválido"), 400
    badges().delete_one({"_id": oid})
    scans().delete_many({"badge_id": oid})
    return jsonify(mensaje="Badge eliminado"), 200


@admin_bp.route("/badges/<badge_id>/regenerate-qr", methods=["POST"])
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
# ADMIN — foto y QR de acceso al evento
# ──────────────────────────────────────────────

@admin_bp.route("/events/<event_id>/access-qr", methods=["POST"])
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


@admin_bp.route("/events/<event_id>/photo", methods=["POST"])
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


@admin_bp.route("/events/<event_id>/tags", methods=["POST"])
@jwt_required()
def update_event_tags(event_id):
    if not require_admin():
        return jsonify(error="Acceso denegado"), 403
    oid = valid_oid(event_id)
    if not oid:
        return jsonify(error="ID inválido"), 400
    data = request.get_json() or {}
    tags = data.get("tags", [])
    if not isinstance(tags, list):
        return jsonify(error="tags debe ser una lista"), 400
    tags = [sanitize(t, max_len=50) for t in tags if t][:20]
    events().update_one({"_id": oid}, {"$set": {"tags": tags}})
    return jsonify(ok=True), 200


# ──────────────────────────────────────────────
# ADMIN — dashboard y usuarios
# ──────────────────────────────────────────────

@admin_bp.route("/dashboard", methods=["GET"])
@jwt_required()
def admin_dashboard():
    if not require_admin():
        return jsonify(error="Acceso denegado"), 403

    ws_id = _get_ws_id()
    ws_filter = {"workspace_id": ws_id} if ws_id else {}

    if ws_id:
        # Contar solo participantes del workspace
        member_ids = [m["user_id"] for m in workspace_members().find({"workspace_id": ws_id})]
        total_participantes = len([m for m in workspace_members().find({"workspace_id": ws_id}) if True])
    else:
        total_participantes = users().count_documents({"role": "participant"})

    total_eventos          = events().count_documents(ws_filter)
    total_badges_creados   = badges().count_documents(ws_filter)
    event_ids_ws           = [e["_id"] for e in events().find(ws_filter, {"_id": 1})]
    event_ids_ws           = [e["_id"] for e in events().find(ws_filter, {"_id": 1})]
    total_badges_creados   = badges().count_documents({"event_id": {"$in": event_ids_ws}}) if event_ids_ws else 0
    total_badges_canjeados = scans().count_documents({"event_id": {"$in": event_ids_ws}}) if event_ids_ws else 0

    progreso = []
    for e in events().find(ws_filter):
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


@admin_bp.route("/users", methods=["GET"])
@jwt_required()
def admin_list_users():
    if not require_admin():
        return jsonify(error="Acceso denegado"), 403

    ws_id = _get_ws_id()
    if ws_id:
        members  = list(workspace_members().find({"workspace_id": ws_id}))
        user_ids = [m["user_id"] for m in members]
        docs     = list(users().find({"_id": {"$in": user_ids}}, {"password_hash": 0}))
    else:
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


@admin_bp.route("/users/<user_id>/role", methods=["PATCH"])
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
    if user.get("role") == "god_admin" and get_jwt().get("role") != "god_admin":
        return jsonify(error="No tenés permiso para modificar a un God Admin"), 403

    users().update_one({"_id": oid}, {"$set": {"role": new_role}})
    return jsonify(fmt_user(users().find_one({"_id": oid}))), 200


@admin_bp.route("/leaderboard/xp", methods=["GET"])
@jwt_required()
def xp_leaderboard():
    if not require_admin():
        return jsonify(error="Acceso denegado"), 403
    pipeline = [
        {"$match": {"$or": [
            {"privacy.show_in_leaderboard": {"$ne": False}},
            {"privacy": {"$exists": False}},
        ]}},
        {"$sort": {"xp_total": -1}},
        {"$limit": 8},
        {"$project": {"_id": 1, "name": 1, "avatar": 1, "xp_total": 1, "level": 1}}
    ]
    result = []
    for u in users().aggregate(pipeline):
        result.append({
            "id":     str(u["_id"]),
            "nombre": u.get("name", ""),
            "avatar": u.get("avatar", None),
            "xp":     u.get("xp_total", 0),
            "level":  u.get("level", 1)
        })
    return jsonify(result), 200


@admin_bp.route("/stats/global", methods=["GET"])
@jwt_required()
def global_stats():
    if get_jwt().get("role") != "god_admin":
        return jsonify(error="Solo god_admin"), 403
    total_users = users().count_documents({})
    total_events = events().count_documents({})
    total_redeemed = scans().count_documents({})
    total_badges = badges().count_documents({})
    return jsonify(
        total_users=total_users,
        total_events=total_events,
        total_redeemed=total_redeemed,
        total_badges=total_badges
    ), 200


@admin_bp.route("/events/<event_id>/stats", methods=["GET"])
@jwt_required()
def event_stats_detail(event_id):
    if not require_admin():
        return jsonify(error="Acceso denegado"), 403
    try:
        oid = ObjectId(event_id)
    except Exception:
        return jsonify(error="ID inválido"), 400

    joins = list(event_joins().find({"event_id": oid}))
    badge_list = list(badges().find({"event_id": oid}))
    total_b = len(badge_list)
    badge_ids = [b["_id"] for b in badge_list]

    participants = []
    for j in joins:
        user_doc = users().find_one({"_id": j["user_id"]}, {"name": 1, "email": 1})
        user_scans = scans().count_documents({"user_id": j["user_id"], "badge_id": {"$in": badge_ids}})
        pct = round((user_scans / total_b) * 100) if total_b else 0
        participants.append({
            "name": user_doc.get("name", "") if user_doc else "",
            "email": user_doc.get("email", "") if user_doc else "",
            "badges_obtained": user_scans,
            "total_badges": total_b,
            "progress": pct
        })

    badge_stats = []
    for b in badge_list:
        count = scans().count_documents({"badge_id": b["_id"]})
        badge_stats.append({"name": b.get("name", ""), "count": count})
    badge_stats.sort(key=lambda x: x["count"], reverse=True)

    from collections import defaultdict
    hourly = defaultdict(int)
    for s in scans().find({"badge_id": {"$in": badge_ids}}):
        if s.get("redeemed_at"):
            hourly[s["redeemed_at"].hour] += 1
    hourly_stats = [{"hour": h, "count": hourly[h]} for h in range(24) if hourly[h] > 0]

    event_reviews = list(reviews().find({"event_id": oid}))
    total_reviews = len(event_reviews)
    avg_rating = round(sum(r.get("rating", 0) for r in event_reviews) / total_reviews, 1) if total_reviews else 0
    rating_distribution = {i: sum(1 for r in event_reviews if r.get("rating") == i) for i in range(1, 6)}

    return jsonify(
        participants=participants,
        badge_stats=badge_stats,
        hourly_scans=hourly_stats,
        reviews={
            "total": total_reviews,
            "avg_rating": avg_rating,
            "distribution": rating_distribution
        }
    ), 200


# ──────────────────────────────────────────────
# GESTIÓN DE IP BANS (god_admin / superadmin)
# ──────────────────────────────────────────────

@admin_bp.route("/ip-bans", methods=["GET"])
@jwt_required()
def list_ip_bans():
    if not is_superadmin_or_above():
        return jsonify(error="Acceso denegado"), 403
    now_dt = datetime.utcnow()
    bans = list(ip_bans().find({}, {"_id": 0}).sort("created_at", -1).limit(200))
    result = []
    for b in bans:
        exp = b.get("expires_at")
        result.append({
            "ip":         b.get("ip"),
            "reason":     b.get("reason", ""),
            "permanent":  exp is not None and exp.year >= 9999,
            "expires_at": exp.isoformat() if exp else None,
            "created_at": b.get("created_at", datetime.utcnow()).isoformat(),
            "active":     exp is not None and exp > now_dt,
        })
    return jsonify(result), 200


@admin_bp.route("/ip-ban", methods=["POST"])
@jwt_required()
def create_ip_ban():
    if not is_superadmin_or_above():
        return jsonify(error="Acceso denegado"), 403
    data      = request.get_json() or {}
    ip        = (data.get("ip") or "").strip()
    reason    = sanitize(data.get("reason") or "", max_len=200)
    days      = int(data.get("days") or 0)
    permanent = bool(data.get("permanent", False))
    if not ip:
        return jsonify(error="IP requerida"), 400
    now_dt = datetime.utcnow()
    if permanent:
        expires_at = datetime(9999, 12, 31, 23, 59, 59)
    elif days > 0:
        from datetime import timedelta
        expires_at = now_dt + timedelta(days=days)
    else:
        return jsonify(error="Especificá duración en días o permanent=true"), 400
    ip_bans().update_one(
        {"ip": ip},
        {"$set": {"ip": ip, "reason": reason, "expires_at": expires_at, "created_at": now_dt}},
        upsert=True
    )
    return jsonify(ok=True, ip=ip, permanent=permanent, expires_at=expires_at.isoformat()), 200


@admin_bp.route("/ip-ban/<path:ip>", methods=["DELETE"])
@jwt_required()
def delete_ip_ban(ip):
    if not is_superadmin_or_above():
        return jsonify(error="Acceso denegado"), 403
    result = ip_bans().delete_one({"ip": ip})
    if result.deleted_count == 0:
        return jsonify(error="IP no encontrada en la lista de bans"), 404
    return jsonify(ok=True), 200

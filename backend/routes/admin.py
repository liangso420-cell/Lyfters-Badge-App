# backend/routes/admin.py — rutas /admin/*

import os
import uuid
from datetime import datetime

from pymongo.errors import DuplicateKeyError
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required

from db import users, events, badges, scans
from utils import (
    require_admin, valid_oid, sanitize,
    generate_qr_base64, fmt_event, fmt_admin_badge, fmt_user
)

admin_bp = Blueprint("admin", __name__)


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
    docs = events().find({})
    return jsonify([fmt_event(e) for e in docs]), 200


@admin_bp.route("/events/<event_id>/stats", methods=["GET"])
@jwt_required()
def event_stats(event_id):
    if not require_admin():
        return jsonify(error="Acceso denegado"), 403
    oid = valid_oid(event_id)
    if not oid:
        return jsonify(error="ID inválido"), 400
    event = events().find_one({"_id": oid})
    if not event:
        return jsonify(error="Evento no encontrado"), 404

    badge_docs = list(badges().find({"event_id": oid}))
    total_badges = len(badge_docs)

    participantes_activos = len(scans().distinct("user_id", {"event_id": oid}))

    completaron = 0
    progreso_dist = {"0-25": 0, "26-50": 0, "51-75": 0, "76-100": 0}
    if total_badges > 0:
        pipeline = [
            {"$match": {"event_id": oid}},
            {"$group": {"_id": "$user_id", "count": {"$sum": 1}}}
        ]
        for row in scans().aggregate(pipeline):
            pct = (row["count"] / total_badges) * 100
            if pct >= 100: completaron += 1
            if pct <= 25: progreso_dist["0-25"] += 1
            elif pct <= 50: progreso_dist["26-50"] += 1
            elif pct <= 75: progreso_dist["51-75"] += 1
            else: progreso_dist["76-100"] += 1

    total_canjeados = scans().count_documents({"event_id": oid})
    pct_canjeados = round((total_canjeados / (total_badges * max(participantes_activos, 1))) * 100, 1) if total_badges > 0 else 0

    badge_ranking = []
    for b in badge_docs:
        count = scans().count_documents({"badge_id": b["_id"]})
        badge_ranking.append({"id": str(b["_id"]), "nombre": b.get("name", ""), "icon": b.get("icon", "🏅"), "count": count})
    badge_ranking.sort(key=lambda x: x["count"], reverse=True)

    top_users = []
    pipeline2 = [
        {"$match": {"event_id": oid}},
        {"$group": {"_id": "$user_id", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}},
        {"$limit": 10}
    ]
    for row in scans().aggregate(pipeline2):
        u = users().find_one({"_id": row["_id"]}, {"name": 1, "avatar": 1})
        if u:
            top_users.append({"nombre": u.get("name", ""), "avatar": u.get("avatar", None), "badges": row["count"]})

    pipeline3 = [
        {"$match": {"event_id": oid, "scanned_at": {"$exists": True}}},
        {"$group": {"_id": {"$hour": "$scanned_at"}, "count": {"$sum": 1}}},
        {"$sort": {"_id": 1}}
    ]
    actividad_hora = [{"hora": row["_id"], "count": row["count"]} for row in scans().aggregate(pipeline3)]

    return jsonify({
        "evento": {"id": str(event["_id"]), "nombre": event.get("title", "")},
        "participantes_activos": participantes_activos,
        "completaron": completaron,
        "no_completaron": max(0, participantes_activos - completaron),
        "pct_completaron": round((completaron / max(participantes_activos, 1)) * 100, 1),
        "total_badges": total_badges,
        "total_canjeados": total_canjeados,
        "pct_canjeados": pct_canjeados,
        "progreso_distribucion": progreso_dist,
        "badge_ranking": badge_ranking[:10],
        "top_usuarios": top_users,
        "actividad_por_hora": actividad_hora,
    }), 200


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

    result = events().insert_one({
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
        "created_by":  admin["_id"],
        "created_at":  datetime.utcnow(),
    })

    new_event = events().find_one({"_id": result.inserted_id})
    return jsonify(fmt_event(new_event)), 201


@admin_bp.route("/events/<event_id>", methods=["DELETE"])
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


@admin_bp.route("/events/<event_id>", methods=["PATCH"])
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
    return jsonify(fmt_event(events().find_one({"_id": oid}))), 200


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


@admin_bp.route("/events/<event_id>/badge",  methods=["POST"])
@admin_bp.route("/events/<event_id>/badges", methods=["POST"])
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


@admin_bp.route("/users", methods=["GET"])
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

    users().update_one({"_id": oid}, {"$set": {"role": new_role}})
    return jsonify(fmt_user(users().find_one({"_id": oid}))), 200


@admin_bp.route("/leaderboard/xp", methods=["GET"])
@jwt_required()
def xp_leaderboard():
    if not require_admin():
        return jsonify(error="Acceso denegado"), 403
    pipeline = [
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

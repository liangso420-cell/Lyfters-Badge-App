# backend/routes/reports.py — sistema de reports de usuarios

from datetime import datetime, timezone

from bson import ObjectId
from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required, get_jwt_identity, get_jwt

from db import reports, users, events
from utils import valid_oid, sanitize

reports_bp = Blueprint("reports", __name__)

ALLOWED_REASONS = [
    "spam", "abuso", "contenido_inapropiado", "suplantacion", "otro"
]


def _is_admin_or_above():
    role = get_jwt().get("role", "participant")
    return role in ("admin", "superadmin", "god_admin")


def _is_superadmin_or_above():
    role = get_jwt().get("role", "participant")
    return role in ("superadmin", "god_admin")


# ──────────────────────────────────────────────
# CREAR REPORTE
# ──────────────────────────────────────────────

@reports_bp.route("/", methods=["POST"])
@jwt_required()
def create_report():
    uid  = get_jwt_identity()
    data = request.get_json() or {}

    reported_id = (data.get("reported_user_id") or "").strip()
    reason      = (data.get("reason") or "otro").strip()
    description = sanitize(data.get("description") or "", max_len=500)
    event_id    = (data.get("event_id") or "").strip()

    if not reported_id:
        return jsonify(error="reported_user_id requerido"), 400

    reported_oid = valid_oid(reported_id)
    if not reported_oid:
        return jsonify(error="ID de usuario inválido"), 400

    if reported_id == uid:
        return jsonify(error="No podés reportarte a vos mismo"), 400

    if reason not in ALLOWED_REASONS:
        reason = "otro"

    reported_user = users().find_one({"_id": reported_oid}, {"name": 1, "email": 1})
    if not reported_user:
        return jsonify(error="Usuario reportado no encontrado"), 404

    event_oid = valid_oid(event_id) if event_id else None
    event_doc = events().find_one({"_id": event_oid}, {"title": 1}) if event_oid else None

    now = datetime.now(timezone.utc)
    doc = {
        "reporter_id":     ObjectId(uid),
        "reported_id":     reported_oid,
        "reported_name":   reported_user.get("name", ""),
        "reported_email":  reported_user.get("email", ""),
        "reason":          reason,
        "description":     description,
        "event_id":        event_oid,
        "event_title":     (event_doc or {}).get("title", "") if event_doc else "",
        "status":          "pending",
        "created_at":      now,
        "updated_at":      now,
    }
    result = reports().insert_one(doc)
    return jsonify(ok=True, report_id=str(result.inserted_id)), 201


# ──────────────────────────────────────────────
# LISTAR REPORTES (admin+)
# ──────────────────────────────────────────────

@reports_bp.route("/", methods=["GET"])
@jwt_required()
def list_reports():
    if not _is_admin_or_above():
        return jsonify(error="Acceso denegado"), 403

    status = request.args.get("status", "")
    query  = {}
    if status in ("pending", "dismissed", "confirmed"):
        query["status"] = status

    docs = list(reports().find(query).sort("created_at", -1).limit(200))
    result = []
    for d in docs:
        result.append({
            "id":             str(d["_id"]),
            "reporter_id":    str(d.get("reporter_id", "")),
            "reported_id":    str(d.get("reported_id", "")),
            "reported_name":  d.get("reported_name", ""),
            "reported_email": d.get("reported_email", ""),
            "reason":         d.get("reason", ""),
            "description":    d.get("description", ""),
            "event_title":    d.get("event_title", ""),
            "status":         d.get("status", "pending"),
            "created_at":     d["created_at"].isoformat() if d.get("created_at") else None,
            "action_taken":   d.get("action_taken", ""),
        })
    return jsonify(result), 200


# ──────────────────────────────────────────────
# DESCARTAR REPORTE
# ──────────────────────────────────────────────

@reports_bp.route("/<report_id>/dismiss", methods=["POST"])
@jwt_required()
def dismiss_report(report_id):
    if not _is_admin_or_above():
        return jsonify(error="Acceso denegado"), 403

    oid = valid_oid(report_id)
    if not oid:
        return jsonify(error="ID inválido"), 400

    result = reports().update_one(
        {"_id": oid},
        {"$set": {"status": "dismissed", "updated_at": datetime.now(timezone.utc)}}
    )
    if result.matched_count == 0:
        return jsonify(error="Reporte no encontrado"), 404
    return jsonify(ok=True), 200


# ──────────────────────────────────────────────
# CONFIRMAR REPORTE Y BANEAR USUARIO
# ──────────────────────────────────────────────

@reports_bp.route("/<report_id>/confirm", methods=["POST"])
@jwt_required()
def confirm_report(report_id):
    if not _is_superadmin_or_above():
        return jsonify(error="Acceso denegado — requiere superadmin o superior"), 403

    oid = valid_oid(report_id)
    if not oid:
        return jsonify(error="ID inválido"), 400

    data         = request.get_json() or {}
    action       = (data.get("action") or "warn").strip()
    ban_days     = int(data.get("ban_days") or 0)
    permanent    = bool(data.get("permanent", False))
    ban_reason   = sanitize(data.get("ban_reason") or "Reporte confirmado por admin", max_len=200)

    report_doc = reports().find_one({"_id": oid})
    if not report_doc:
        return jsonify(error="Reporte no encontrado"), 404

    now = datetime.now(timezone.utc)
    action_taken = action

    if action == "ban" and report_doc.get("reported_id"):
        if permanent:
            banned_until = datetime(9999, 12, 31, 23, 59, 59)
        elif ban_days > 0:
            from datetime import timedelta
            banned_until = datetime.utcnow() + timedelta(days=ban_days)
        else:
            return jsonify(error="Especificá ban_days o permanent=true"), 400

        users().update_one(
            {"_id": report_doc["reported_id"]},
            {"$set": {
                "banned_until": banned_until,
                "ban_reason":   ban_reason,
                "banned_at":    now,
            }}
        )
        action_taken = f"ban:{ban_days}d" if not permanent else "ban:permanent"

    reports().update_one(
        {"_id": oid},
        {"$set": {
            "status":       "confirmed",
            "action_taken": action_taken,
            "updated_at":   now,
        }}
    )
    return jsonify(ok=True, action=action_taken), 200

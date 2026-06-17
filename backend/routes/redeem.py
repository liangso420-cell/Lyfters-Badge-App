# backend/routes/redeem.py — rutas /redeem/*

from datetime import datetime

from bson import ObjectId
from flask import Blueprint, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity

from db import events, badges, scans
from utils import valid_oid
from security.limiter import redeem_limit

redeem_bp = Blueprint("redeem", __name__)


# ──────────────────────────────────────────────
# REDENCIÓN
# ──────────────────────────────────────────────

@redeem_bp.route("/<event_id>/<token>", methods=["POST", "GET"])
@jwt_required()
@redeem_limit
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

# backend/routes/redeem.py — rutas /redeem/*

from datetime import datetime

from bson import ObjectId
from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required, get_jwt_identity

from db import users, events, badges, scans
from utils import valid_oid, haversine
from security.limiter import redeem_limit
from services.xp import award_xp, compute_level
from services.achievements import check_and_unlock

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

    body = request.get_json(silent=True) or {}
    user_lat = body.get("lat")
    user_lng = body.get("lng")
    event_lat = event.get("lat")
    event_lng = event.get("lng")
    if event_lat is not None and event_lng is not None and user_lat is not None and user_lng is not None:
        try:
            dist = haversine(float(user_lat), float(user_lng), float(event_lat), float(event_lng))
            if dist > 1000:
                return jsonify(error="Estás demasiado lejos del evento (máx 1km)"), 403
        except (TypeError, ValueError):
            pass

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

    # ── XP y logros ────────────────────────────────────────
    # Solo se otorga XP / se evalúan logros en scans NUEVOS (no duplicados).
    if not already:
        # recién insertado: si ahora tiene 1 scan en el evento, es el primero
        is_first_scan = (user_scns == 1)
        is_completion = completado
        xp_result = award_xp(user_oid, badge, event, is_first_scan, is_completion)
        new_achievements = check_and_unlock(user_oid, oid_event)
    else:
        u = users().find_one({"_id": user_oid}, {"xp_total": 1})
        xp_total = int((u or {}).get("xp_total", 0))
        xp_result = {
            "xp_gained": 0,
            "xp_total":  xp_total,
            "level":     compute_level(xp_total),
            "level_up":  False,
        }
        new_achievements = []

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
        # Campos del sistema de XP
        "xp_gained":             xp_result["xp_gained"],
        "xp_total":              xp_result["xp_total"],
        "level":                 xp_result["level"],
        "level_up":              xp_result["level_up"],
        "achievements_unlocked": new_achievements,
    }), 200

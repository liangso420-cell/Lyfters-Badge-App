# backend/routes/redeem.py — rutas /redeem/*

from datetime import datetime, timezone

from bson import ObjectId
from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required, get_jwt_identity
from pymongo.errors import DuplicateKeyError

from db import users, events, badges, scans, event_joins
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

    # Verificar que el usuario esté unido al evento
    if not event_joins().find_one({"user_id": user_oid, "event_id": oid_event}):
        return jsonify(
            status="not_joined",
            error="Debes unirte al evento primero escaneando el QR del evento."
        ), 403

    # ── Insert atómico: el índice único (user_id, badge_id) en MongoDB garantiza
    # que dos requests simultáneas no puedan insertar el mismo scan dos veces.
    try:
        result = scans().update_one(
            {"user_id": user_oid, "badge_id": badge_oid},
            {"$setOnInsert": {
                "user_id":     user_oid,
                "badge_id":    badge_oid,
                "event_id":    oid_event,
                "redeemed_at": datetime.now(timezone.utc),
                "scanned_at":  datetime.now(timezone.utc),
            }},
            upsert=True
        )
        print(f"[redeem] user={user_oid} badge={badge_oid} matched={result.matched_count} upserted={result.upserted_id}", flush=True)
        if result.matched_count > 0:
            print(f"[redeem] DUPLICADO DETECTADO - retornando already_redeemed", flush=True)
            return jsonify(status="already_redeemed", message="Badge ya canjeado", badge={"name": badge.get("name", ""), "icon_url": badge.get("icon_url", "")}), 200
    except DuplicateKeyError:
        return jsonify(status="already_redeemed", message="Badge ya canjeado", badge={"name": badge.get("name", ""), "icon_url": badge.get("icon_url", "")}), 200

    # ── Scan recién insertado — calcular progreso, XP y logros ──
    total_b    = badges().count_documents({"event_id": oid_event})
    user_scns  = scans().count_documents({"user_id": user_oid, "event_id": oid_event, "badge_id": {"$exists": True}})
    completado = user_scns >= total_b

    is_first_scan = (user_scns == 1)
    xp_result = award_xp(user_oid, badge, event, is_first_scan, completado)
    new_achievements = check_and_unlock(user_oid, oid_event)

    badge_is_rare = bool(badge.get("is_rare", False))
    return jsonify({
        "status":     "ok",
        "badge": {
            "icon":        badge.get("icon", "🏅"),
            "icon_url":    badge.get("icon_url", ""),
            "nombre":      badge.get("name", ""),
            "descripcion": badge.get("description", ""),
            "is_rare":     badge_is_rare,
            "rarity":      "rare" if badge_is_rare else "normal",
            "xp_value":    int(badge.get("xp_value", 10)),
        },
        "completado": completado,
        "premio":     event.get("prize") if completado else None,
        "progreso":   {"obtenidos": user_scns, "total": total_b},
        "xp_gained":             xp_result["xp_gained"],
        "xp_total":              xp_result["xp_total"],
        "level":                 xp_result["level"],
        "level_up":              xp_result["level_up"],
        "xp_badge":              xp_result["xp_base"],
        "xp_first_scan_bonus":   xp_result["xp_first_scan_bonus"],
        "xp_rare_bonus":         xp_result["xp_rare_bonus"],
        "xp_event_bonus":        xp_result["xp_completion_bonus"],
        "achievements_unlocked": new_achievements,
    }), 200

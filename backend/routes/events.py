"""Rutas de eventos (participante autenticado) y badges del usuario."""
from datetime import datetime, timezone

from bson import ObjectId
from bson.errors import InvalidId
from flask import Blueprint, jsonify, g

from db import events as events_col
from models.event import serialize_event
from models.badge import list_by_event, serialize_badge
from models.scan import scanned_badge_ids_for_event
from middleware.auth_guard import require_auth

events_bp = Blueprint("events", __name__)


@events_bp.route("/events/", methods=["GET"])
@require_auth
def list_events():
    """Lista eventos activos (cuya fecha_fin no ha pasado)."""
    now = datetime.now(timezone.utc)
    cursor = events_col.find(
        {"$or": [{"fecha_fin": {"$gte": now}}, {"fecha_fin": None}]}
    ).sort("createdAt", -1)
    return jsonify([serialize_event(e) for e in cursor]), 200


@events_bp.route("/events/<event_id>", methods=["GET"])
@require_auth
def event_detail(event_id):
    """Detalle del evento + sus badges + progreso del usuario."""
    try:
        event = events_col.find_one({"_id": ObjectId(event_id)})
    except InvalidId:
        return jsonify({"error": "ID de evento inválido"}), 400
    if not event:
        return jsonify({"error": "Evento no encontrado"}), 404

    user_id = g.user["sub"]
    obtained = scanned_badge_ids_for_event(user_id, event_id)
    badge_docs = list_by_event(event_id)

    badges = []
    for b in badge_docs:
        item = serialize_badge(b, include_qr=False)
        item["obtenido"] = item["id"] in obtained
        badges.append(item)

    completado = len(badge_docs) > 0 and len(obtained) >= len(badge_docs)
    data = serialize_event(event)
    data["badges"] = badges
    data["total_badges"] = len(badge_docs)
    data["obtenidos"] = len(obtained)
    data["completado"] = completado
    # El premio solo se revela si el evento está completado
    data["premio_revelado"] = event.get("premio") if completado else None
    return jsonify(data), 200


@events_bp.route("/me/badges", methods=["GET"])
@require_auth
def my_badges():
    """Badges del usuario agrupados por evento, con conteo y premio."""
    user_id = g.user["sub"]
    result = []
    for event in events_col.find().sort("createdAt", -1):
        event_id = str(event["_id"])
        badge_docs = list_by_event(event_id)
        if not badge_docs:
            continue
        obtained = scanned_badge_ids_for_event(user_id, event_id)
        # Incluir el evento solo si el usuario tiene al menos un badge en él
        if not obtained:
            continue

        completado = len(obtained) >= len(badge_docs)
        badges = []
        for b in badge_docs:
            item = serialize_badge(b, include_qr=False)
            item["obtenido"] = item["id"] in obtained
            badges.append(item)

        result.append({
            "event_id": event_id,
            "evento": event.get("nombre"),
            "total_badges": len(badge_docs),
            "obtenidos": len(obtained),
            "completado": completado,
            "premio": event.get("premio") if completado else None,
            "badges": badges,
        })
    return jsonify(result), 200

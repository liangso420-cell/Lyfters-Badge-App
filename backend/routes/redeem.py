"""Ruta de redención de badges. El frontend la invoca tras validar la sesión.

El QR físico apunta a la URL del frontend (/redeem/<event_id>/<token>); el
frontend, si no hay sesión, redirige a login y luego llama a este endpoint.
"""
from bson import ObjectId
from bson.errors import InvalidId
from flask import Blueprint, jsonify, g

from db import events as events_col
from models.badge import find_by_token, list_by_event
from models.scan import has_scanned, create_scan, scanned_badge_ids_for_event
from middleware.auth_guard import require_auth

redeem_bp = Blueprint("redeem", __name__)


@redeem_bp.route("/redeem/<event_id>/<token>", methods=["POST"])
@require_auth
def redeem(event_id, token):
    user_id = g.user["sub"]

    # 1. Validar token
    badge = find_by_token(token)
    if not badge or str(badge.get("event_id")) != str(event_id):
        return jsonify({"error": "QR inválido"}), 404

    badge_id = str(badge["_id"])

    # 2. ¿Ya canjeado por este usuario?
    if has_scanned(user_id, badge_id):
        return jsonify({
            "status": "duplicado",
            "message": "Ya tienes este badge",
            "badge": {
                "id": badge_id,
                "nombre": badge["nombre"],
                "descripcion": badge.get("descripcion"),
                "icon": badge.get("icon", "🏅"),
            },
        }), 200

    # 3. Registrar la redención
    created = create_scan(user_id, badge_id, event_id)
    if not created:
        # carrera: otro request lo insertó primero
        return jsonify({"status": "duplicado", "message": "Ya tienes este badge"}), 200

    # 4. ¿Completó todos los badges del evento?
    all_badges = list_by_event(event_id)
    obtained = scanned_badge_ids_for_event(user_id, event_id)
    completado = len(all_badges) > 0 and len(obtained) >= len(all_badges)

    event = events_col.find_one({"_id": ObjectId(event_id)})
    premio = event.get("premio") if (event and completado) else None

    return jsonify({
        "status": "ok",
        "message": "¡Badge obtenido!",
        "badge": {
            "id": badge_id,
            "nombre": badge["nombre"],
            "descripcion": badge.get("descripcion"),
            "icon": badge.get("icon", "🏅"),
        },
        "completado": completado,
        "premio": premio,
        "progreso": {"obtenidos": len(obtained), "total": len(all_badges)},
    }), 201


# Endpoint auxiliar: info pública mínima del badge (para mostrar antes de canjear)
@redeem_bp.route("/redeem/<event_id>/<token>", methods=["GET"])
@require_auth
def redeem_info(event_id, token):
    badge = find_by_token(token)
    if not badge or str(badge.get("event_id")) != str(event_id):
        return jsonify({"error": "QR inválido"}), 404
    try:
        event = events_col.find_one({"_id": ObjectId(event_id)})
    except InvalidId:
        event = None
    return jsonify({
        "badge": {
            "nombre": badge["nombre"],
            "descripcion": badge.get("descripcion"),
            "icon": badge.get("icon", "🏅"),
        },
        "evento": event.get("nombre") if event else None,
        "ya_obtenido": has_scanned(g.user["sub"], str(badge["_id"])),
    }), 200

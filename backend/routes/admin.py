"""Rutas de administración: crear eventos, agregar badges (UUID + QR) y seguimiento."""
from datetime import datetime

from bson import ObjectId
from bson.errors import InvalidId
from flask import Blueprint, request, jsonify, g

from db import events as events_col
from models.event import create_event, serialize_event
from models.badge import create_badge, list_by_event, serialize_badge
from models.scan import count_by_badge
from middleware.auth_guard import require_admin
from utils.qr import redeem_url, generate_qr_base64

admin_bp = Blueprint("admin", __name__, url_prefix="/admin")


def _parse_date(value):
    if not value:
        return None
    try:
        return datetime.fromisoformat(value.replace("Z", "+00:00"))
    except (ValueError, AttributeError):
        return None


@admin_bp.route("/event", methods=["POST"])
@require_admin
def crear_evento():
    data = request.get_json(silent=True) or {}
    nombre = (data.get("nombre") or "").strip()
    if not nombre:
        return jsonify({"error": "El nombre del evento es obligatorio"}), 400

    event = create_event(
        nombre=nombre,
        descripcion=(data.get("descripcion") or "").strip(),
        fecha_inicio=_parse_date(data.get("fecha_inicio")),
        fecha_fin=_parse_date(data.get("fecha_fin")),
        premio=(data.get("premio") or "").strip(),
        admin_id=g.user["sub"],
    )
    return jsonify(serialize_event(event)), 201


@admin_bp.route("/events", methods=["GET"])
@require_admin
def listar_eventos_admin():
    """Eventos creados por el admin autenticado."""
    cursor = events_col.find({"admin_id": ObjectId(g.user["sub"])}).sort("createdAt", -1)
    return jsonify([serialize_event(e) for e in cursor]), 200


@admin_bp.route("/events/<event_id>/badge", methods=["POST"])
@require_admin
def agregar_badge(event_id):
    """Crea un badge: genera UUID token + imagen QR en base64."""
    try:
        event = events_col.find_one({"_id": ObjectId(event_id)})
    except InvalidId:
        return jsonify({"error": "ID de evento inválido"}), 400
    if not event:
        return jsonify({"error": "Evento no encontrado"}), 404

    data = request.get_json(silent=True) or {}
    nombre = (data.get("nombre") or "").strip()
    if not nombre:
        return jsonify({"error": "El nombre del badge es obligatorio"}), 400

    # Primero creamos el badge para obtener su token UUID, luego generamos el QR
    badge = create_badge(
        event_id=event_id,
        nombre=nombre,
        descripcion=(data.get("descripcion") or "").strip(),
        qr_image="",  # se completa abajo
        icon=(data.get("icon") or "🏅").strip(),
    )
    url = redeem_url(event_id, badge["token"])
    qr_image = generate_qr_base64(url)

    from db import badges as badges_col
    badges_col.update_one({"_id": badge["_id"]}, {"$set": {"qr_image": qr_image}})
    badge["qr_image"] = qr_image

    result = serialize_badge(badge)
    result["redeem_url"] = url
    return jsonify(result), 201


@admin_bp.route("/events/<event_id>/badges", methods=["GET"])
@require_admin
def listar_badges_con_estado(event_id):
    """Lista los badges del evento con su estado de redención (canjeados)."""
    try:
        event = events_col.find_one({"_id": ObjectId(event_id)})
    except InvalidId:
        return jsonify({"error": "ID de evento inválido"}), 400
    if not event:
        return jsonify({"error": "Evento no encontrado"}), 404

    badge_docs = list_by_event(event_id)
    items = []
    for b in badge_docs:
        item = serialize_badge(b)
        item["redeem_url"] = redeem_url(event_id, b["token"])
        item["canjeados"] = count_by_badge(b["_id"])
        items.append(item)

    return jsonify({
        "evento": serialize_event(event),
        "badges": items,
    }), 200

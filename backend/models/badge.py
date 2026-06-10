"""Modelo / helpers de la colección badges."""
import uuid
from datetime import datetime, timezone

from bson import ObjectId

from db import badges


def create_badge(event_id, nombre, descripcion, qr_image, icon="🏅"):
    """Crea un badge con un token UUID único. qr_image es la imagen QR en base64."""
    doc = {
        "event_id": ObjectId(event_id),
        "nombre": nombre,
        "descripcion": descripcion,
        "icon": icon,
        "token": str(uuid.uuid4()),
        "qr_image": qr_image,
        "createdAt": datetime.now(timezone.utc),
    }
    result = badges.insert_one(doc)
    doc["_id"] = result.inserted_id
    return doc


def find_by_token(token):
    return badges.find_one({"token": token})


def list_by_event(event_id):
    return list(badges.find({"event_id": ObjectId(event_id)}))


def serialize_badge(badge, include_qr=True):
    data = {
        "id": str(badge["_id"]),
        "event_id": str(badge["event_id"]),
        "nombre": badge.get("nombre"),
        "descripcion": badge.get("descripcion"),
        "icon": badge.get("icon", "🏅"),
        "token": badge.get("token"),
        "createdAt": _iso(badge.get("createdAt")),
    }
    if include_qr:
        data["qr_image"] = badge.get("qr_image")
    return data


def _iso(value):
    if isinstance(value, datetime):
        return value.isoformat()
    return value

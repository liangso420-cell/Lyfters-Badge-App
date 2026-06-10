"""Modelo / helpers de la colección events."""
from datetime import datetime, timezone

from bson import ObjectId

from db import events


def create_event(nombre, descripcion, fecha_inicio, fecha_fin, premio, admin_id):
    doc = {
        "nombre": nombre,
        "descripcion": descripcion,
        "fecha_inicio": fecha_inicio,
        "fecha_fin": fecha_fin,
        "premio": premio,
        "admin_id": ObjectId(admin_id),
        "createdAt": datetime.now(timezone.utc),
    }
    result = events.insert_one(doc)
    doc["_id"] = result.inserted_id
    return doc


def serialize_event(event, include_premio=True):
    """Convierte un documento de evento a JSON-serializable."""
    data = {
        "id": str(event["_id"]),
        "nombre": event.get("nombre"),
        "descripcion": event.get("descripcion"),
        "fecha_inicio": _iso(event.get("fecha_inicio")),
        "fecha_fin": _iso(event.get("fecha_fin")),
        "admin_id": str(event.get("admin_id")) if event.get("admin_id") else None,
        "createdAt": _iso(event.get("createdAt")),
    }
    if include_premio:
        data["premio"] = event.get("premio")
    return data


def _iso(value):
    if isinstance(value, datetime):
        return value.isoformat()
    return value

"""Modelo / helpers de la colección scans (redenciones)."""
from datetime import datetime, timezone

from bson import ObjectId
from pymongo.errors import DuplicateKeyError

from db import scans


def has_scanned(user_id, badge_id):
    return scans.find_one(
        {"user_id": ObjectId(user_id), "badge_id": ObjectId(badge_id)}
    ) is not None


def create_scan(user_id, badge_id, event_id):
    """Inserta una redención. Retorna True si se creó, False si ya existía (duplicado)."""
    doc = {
        "user_id": ObjectId(user_id),
        "badge_id": ObjectId(badge_id),
        "event_id": ObjectId(event_id),
        "redeemedAt": datetime.now(timezone.utc),
    }
    try:
        scans.insert_one(doc)
        return True
    except DuplicateKeyError:
        return False


def scanned_badge_ids_for_event(user_id, event_id):
    """IDs de badges (str) que el usuario ya canjeó en un evento."""
    cursor = scans.find(
        {"user_id": ObjectId(user_id), "event_id": ObjectId(event_id)},
        {"badge_id": 1},
    )
    return {str(s["badge_id"]) for s in cursor}


def count_by_badge(badge_id):
    return scans.count_documents({"badge_id": ObjectId(badge_id)})


def scans_for_event(event_id):
    return list(scans.find({"event_id": ObjectId(event_id)}))

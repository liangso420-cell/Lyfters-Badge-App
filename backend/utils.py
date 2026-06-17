# backend/utils.py — helpers y serializadores compartidos

import io
import math
import base64
from datetime import datetime

import qrcode
from bson import ObjectId
from bson.errors import InvalidId
from flask_jwt_extended import get_jwt_identity

from db import users


# ──────────────────────────────────────────────
# HELPERS
# ──────────────────────────────────────────────

def valid_oid(s):
    try:
        return ObjectId(s)
    except (InvalidId, TypeError):
        return None


def generate_qr_base64(data: str) -> str:
    img = qrcode.make(data)
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    return "data:image/png;base64," + base64.b64encode(buf.getvalue()).decode()


def require_admin():
    uid = get_jwt_identity()
    user = users().find_one({"_id": ObjectId(uid)})
    if not user or user.get("role") != "admin":
        return None
    return user


def sanitize(s, max_len=100):
    return str(s or "").strip()[:max_len]


# ── Serializadores ──────────────────────────

def fmt_user(doc):
    created = doc.get("created_at")
    return {
        "id":         str(doc["_id"]),
        "nombre":     doc.get("name", ""),
        "email":      doc.get("email", ""),
        "rol":        doc.get("role", "participant"),
        "created_at": created.isoformat() if created else None,
    }


def compute_event_status(doc):
    manual_status = doc.get("status", None)
    if manual_status in ("draft", "pending", "cancelled", "postponed", "archived", "paused"):
        return manual_status
    now = datetime.utcnow()
    start = doc.get("start_date")
    end = doc.get("end_date")
    if start and end:
        if now < start:
            return "upcoming"
        elif start <= now <= end:
            return "ongoing"
        elif now > end:
            return "finished"
    return manual_status or "draft"


def haversine(lat1, lon1, lat2, lon2):
    R = 6371000  # metros
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lon2 - lon1)
    a = math.sin(dphi/2)**2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlambda/2)**2
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1-a))


def fmt_event(doc):
    return {
        "id":           str(doc["_id"]),
        "nombre":       doc.get("title", ""),
        "descripcion":  doc.get("description", ""),
        "description":  doc.get("description", ""),
        "fecha_inicio": doc.get("start_date", datetime.utcnow()).isoformat(),
        "fecha_fin":    doc.get("end_date",   datetime.utcnow()).isoformat(),
        "premio":       doc.get("prize", ""),
        "activo":       doc.get("active", True),
        "status":       compute_event_status(doc),
        "photo":        doc.get("photo", None),
        "access_qr":    doc.get("access_qr", None),
        "tags":         doc.get("tags", []),
        "location":     doc.get("location", ""),
        "lat":          doc.get("lat", None),
        "lng":          doc.get("lng", None),
    }


def fmt_badge(doc, obtenido=False, scanned_at=None):
    return {
        "id":          str(doc["_id"]),
        "icon":        doc.get("icon", "🏅"),
        "nombre":      doc.get("name", ""),
        "descripcion": doc.get("description", ""),
        "obtenido":    obtenido,
        "scanned_at":  scanned_at.isoformat() if scanned_at else None,
    }


def fmt_admin_badge(doc, canjeados=0, base_url=""):
    event_id = str(doc.get("event_id", ""))
    token    = doc.get("token", "")
    return {
        "id":          str(doc["_id"]),
        "icon":        doc.get("icon", "🏅"),
        "nombre":      doc.get("name", ""),
        "descripcion": doc.get("description", ""),
        "token":       token,
        "redeem_url":  f"{base_url}/redeem.html?event={event_id}&token={token}",
        "canjeados":   canjeados,
        "qr_image":    doc.get("qr_base64", None),
    }

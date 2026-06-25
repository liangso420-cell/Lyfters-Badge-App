# backend/utils.py — helpers y serializadores compartidos

import io
import math
import base64
from datetime import datetime, timedelta

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
    if not user or user.get("role") not in ("admin", "superadmin", "god_admin"):
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
    if manual_status in ("draft", "pending", "cancelled", "postponed", "archived", "paused", "open", "closed"):
        return manual_status
    now = datetime.utcnow()
    start = doc.get("start_date") or doc.get("fecha_inicio")
    end   = doc.get("end_date")   or doc.get("fecha_fin")
    if start and end:
        if hasattr(start, 'tzinfo') and start.tzinfo:
            start = start.replace(tzinfo=None)
        if hasattr(end, 'tzinfo') and end.tzinfo:
            end = end.replace(tzinfo=None)
        end_adjusted = end + timedelta(hours=6)
        if now < start:
            return "upcoming"
        elif start <= now <= end_adjusted:
            return "ongoing"
        elif now > end_adjusted:
            return "finished"
    return manual_status or "draft"


def haversine(lat1, lon1, lat2, lon2):
    R = 6371000  # metros
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lon2 - lon1)
    a = math.sin(dphi/2)**2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlambda/2)**2
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1-a))


def fmt_event(doc, ws_name=None):
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
        "xp_first_scan":       doc.get("xp_first_scan", 5),
        "xp_rare_bonus":       doc.get("xp_rare_bonus", 15),
        "xp_completion_bonus": doc.get("xp_completion_bonus", 50),
        "workspace_id":   str(doc["workspace_id"]) if doc.get("workspace_id") else None,
        "workspace_name": ws_name,
    }


def fmt_badge(doc, obtenido=False, scanned_at=None):
    is_rare = bool(doc.get("is_rare", False))
    return {
        "id":          str(doc["_id"]),
        "icon":        doc.get("icon", "🏅"),
        "icon_url":    doc.get("icon_url", None),
        "nombre":      doc.get("name", ""),
        "descripcion": doc.get("description", ""),
        "obtenido":    obtenido,
        "scanned_at":  scanned_at.isoformat() if scanned_at else None,
        "is_rare":     is_rare,
        "rarity":      "rare" if is_rare else "normal",
    }


def fmt_admin_badge(doc, canjeados=0, base_url=""):
    event_id = str(doc.get("event_id", ""))
    token    = doc.get("token", "")
    return {
        "id":          str(doc["_id"]),
        "icon":        doc.get("icon", "🏅"),
        "icon_url":    doc.get("icon_url", None),
        "nombre":      doc.get("name", ""),
        "descripcion": doc.get("description", ""),
        "token":       token,
        "redeem_url":  f"{base_url}/redeem.html?event={event_id}&token={token}",
        "canjeados":   canjeados,
        "qr_image":    doc.get("qr_base64", None),
        "xp_value":    doc.get("xp_value", 10),
        "is_rare":     bool(doc.get("is_rare", False)),
    }

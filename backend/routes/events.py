# backend/routes/events.py — rutas /events/* y /leaderboard

from datetime import datetime

from bson import ObjectId
from flask import Blueprint, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity

from db import users, events, badges, scans, event_joins
from utils import valid_oid, fmt_event, fmt_badge, compute_event_status

events_bp = Blueprint("events", __name__)
# /leaderboard no cuelga de /events, va en su propio blueprint sin prefix
leaderboard_bp = Blueprint("leaderboard", __name__)


# ──────────────────────────────────────────────
# EVENTOS — participante / público
# ──────────────────────────────────────────────

@events_bp.route("/", methods=["GET"])
@events_bp.route("",  methods=["GET"])
def list_events():
    now = datetime.utcnow()
    docs = list(events().find({"active": True, "end_date": {"$gte": now}}))
    visible_statuses = ("ongoing", "open", "upcoming", "postponed")
    result = []
    for e in docs:
        status = compute_event_status(e)
        if status not in ("draft", "pending", "cancelled", "archived", "finished"):
            result.append(fmt_event(e))
    return jsonify(result), 200


@events_bp.route("/joined", methods=["GET"])
@jwt_required()
def joined_events():
    uid = get_jwt_identity()
    user_oid = ObjectId(uid)
    joined = event_joins().find({"user_id": user_oid})
    event_ids = [j["event_id"] for j in joined]
    result = []
    for eid in event_ids:
        e = events().find_one({"_id": eid, "active": True})
        if e:
            result.append(fmt_event(e))
    return jsonify(result), 200


@events_bp.route("/recommended", methods=["GET"])
@jwt_required()
def recommended_events():
    uid = get_jwt_identity()
    user = users().find_one({"_id": ObjectId(uid)})
    user_interests = user.get("interests", []) if user else []
    now = datetime.utcnow()
    all_events = list(events().find({"active": True, "end_date": {"$gte": now}}))
    if not user_interests:
        return jsonify([fmt_event(e) for e in all_events[:5]]), 200
    scored = []
    for e in all_events:
        event_tags = e.get("tags", [])
        score = len(set(user_interests) & set(event_tags))
        if score > 0:
            scored.append((score, e))
    scored.sort(key=lambda x: x[0], reverse=True)
    result = [fmt_event(e) for _, e in scored[:5]]
    return jsonify(result), 200


@events_bp.route("/<event_id>", methods=["GET"])
@jwt_required(optional=True)
def get_event(event_id):
    oid = valid_oid(event_id)
    if not oid:
        return jsonify(error="ID inválido"), 400

    event = events().find_one({"_id": oid})
    if not event:
        return jsonify(error="Evento no encontrado"), 404

    uid      = get_jwt_identity()
    user_oid = ObjectId(uid) if uid else None

    badge_docs = list(badges().find({"event_id": oid}))
    total      = len(badge_docs)

    scans_data = {}
    if user_oid:
        for s in scans().find({"user_id": user_oid, "event_id": oid, "badge_id": {"$exists": True}}):
            scans_data[s["badge_id"]] = s.get("scanned_at")

    badge_list = [
        fmt_badge(b, obtenido=(b["_id"] in scans_data), scanned_at=scans_data.get(b["_id"]))
        for b in badge_docs
    ]
    obtenidos  = len(scans_data)
    completado = total > 0 and obtenidos >= total

    return jsonify({
        "id":              str(event["_id"]),
        "nombre":          event.get("title", ""),
        "premio":          event.get("prize", ""),
        "badges":          badge_list,
        "total_badges":    total,
        "obtenidos":       obtenidos,
        "completado":      completado,
        "premio_revelado": event.get("prize") if completado else None,
    }), 200


# ──────────────────────────────────────────────
# EVENTOS — unirse (join)
# ──────────────────────────────────────────────

@events_bp.route("/<event_id>/join", methods=["POST"])
@jwt_required()
def join_event(event_id):
    uid = get_jwt_identity()
    oid = valid_oid(event_id)
    if not oid:
        return jsonify(error="ID inválido"), 400
    event = events().find_one({"_id": oid, "active": True})
    if not event:
        return jsonify(error="Evento no encontrado o inactivo"), 404
    user_oid = ObjectId(uid)
    already = event_joins().find_one({"user_id": user_oid, "event_id": oid})
    if not already:
        event_joins().insert_one({
            "user_id":    user_oid,
            "event_id":   oid,
            "joined_at":  datetime.utcnow(),
        })
    return jsonify({
        "status": "already_joined" if already else "joined",
        "event": fmt_event(event)
    }), 200


# ──────────────────────────────────────────────
# LEADERBOARD
# ──────────────────────────────────────────────

@leaderboard_bp.route("/leaderboard", methods=["GET"])
@jwt_required()
def leaderboard():
    user_list = list(users().find({}, {"password_hash": 0}))
    result = []
    for u in user_list:
        uid = u["_id"]
        total_badges = scans().count_documents({"user_id": uid})
        result.append({
            "id":     str(uid),
            "nombre": u.get("name", ""),
            "avatar": u.get("avatar", None),
            "badges": total_badges
        })
    result.sort(key=lambda x: x["badges"], reverse=True)
    return jsonify(result), 200

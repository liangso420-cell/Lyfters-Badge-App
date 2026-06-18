# backend/routes/events.py — rutas /events/* y /leaderboard

from datetime import datetime

from bson import ObjectId
from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required, get_jwt_identity

from db import users, events, badges, scans, event_joins, user_achievements
from utils import valid_oid, fmt_event, fmt_badge, compute_event_status, haversine
from services.xp import compute_level, level_name

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
    visible_statuses = ("upcoming", "open", "ongoing")
    docs = list(events().find({"active": True, "end_date": {"$gte": now}}))
    result = [fmt_event(e) for e in docs if compute_event_status(e) in visible_statuses]
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

    # Solo estados que tienen sentido recomendar
    visible_statuses = ("upcoming", "open", "ongoing")

    all_events = list(events().find({"active": True, "end_date": {"$gte": now}}))

    # Filtrar por estado visible
    visible_events = [e for e in all_events if compute_event_status(e) in visible_statuses]

    if not user_interests:
        return jsonify([fmt_event(e) for e in visible_events[:5]]), 200

    scored = []
    for e in visible_events:
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


# ──────────────────────────────────────────────
# LEADERBOARD — ranking por evento (público)
# ──────────────────────────────────────────────

@leaderboard_bp.route("/leaderboard/<event_id>", methods=["GET"])
@jwt_required(optional=True)
def event_leaderboard(event_id):
    oid = valid_oid(event_id)
    if not oid:
        return jsonify(error="ID inválido"), 400

    event = events().find_one({"_id": oid})
    if not event:
        return jsonify(error="Evento no encontrado"), 404

    total_badges = badges().count_documents({"event_id": oid})

    # 1+2. Agrupar scans del evento por usuario y traer datos del usuario.
    pipeline = [
        {"$match": {"event_id": oid}},
        {"$group": {"_id": "$user_id", "badges_in_event": {"$sum": 1}}},
        {"$lookup": {
            "from": "users", "localField": "_id",
            "foreignField": "_id", "as": "user",
        }},
        {"$unwind": "$user"},
    ]
    rows = list(scans().aggregate(pipeline))

    entries = []
    for r in rows:
        uid = r["_id"]
        u = r.get("user", {})
        xp_total = int(u.get("xp_total", 0))
        badges_in_event = r["badges_in_event"]
        entries.append({
            "user_id":         str(uid),
            "name":            u.get("name", ""),
            "badges_in_event": badges_in_event,
            "badges_total":    scans().count_documents({"user_id": uid}),
            "completed":       total_badges > 0 and badges_in_event >= total_badges,
            "xp_total":        xp_total,
            "level":           compute_level(xp_total),
            "level_name":      level_name(compute_level(xp_total)),
            "_uid":            uid,
        })

    # 5. Ordenar: badges_in_event DESC, desempate por xp_total DESC.
    entries.sort(key=lambda e: (e["badges_in_event"], e["xp_total"]), reverse=True)

    my_position = None
    me = get_jwt_identity()
    me_oid = ObjectId(me) if me else None
    for i, e in enumerate(entries):
        e["position"] = i + 1
        if me_oid and e["_uid"] == me_oid:
            my_position = {
                "position":        e["position"],
                "xp_total":        e["xp_total"],
                "level":           e["level"],
                "badges_in_event": e["badges_in_event"],
            }
        del e["_uid"]

    return jsonify({"ranking": entries, "my_position": my_position}), 200


# ──────────────────────────────────────────────
# LEADERBOARD — ranking global (público)
# ──────────────────────────────────────────────

@leaderboard_bp.route("/leaderboard/global", methods=["GET"])
@jwt_required(optional=True)
def global_leaderboard():
    def stats_for(uid):
        """badges_total, events_participated y achievements_count de un usuario."""
        badges_total = scans().count_documents({"user_id": uid})
        events_participated = len(scans().distinct("event_id", {"user_id": uid}))
        achievements_count = user_achievements().count_documents({"user_id": uid})
        return badges_total, events_participated, achievements_count

    # Top 50 por XP total.
    top = list(users().find({}, {"name": 1, "xp_total": 1}).sort("xp_total", -1).limit(50))

    ranking = []
    for i, u in enumerate(top):
        uid = u["_id"]
        xp_total = int(u.get("xp_total", 0))
        badges_total, events_participated, achievements_count = stats_for(uid)
        lvl = compute_level(xp_total)
        ranking.append({
            "position":            i + 1,
            "user_id":             str(uid),
            "name":                u.get("name", ""),
            "xp_total":            xp_total,
            "level":               lvl,
            "level_name":          level_name(lvl),
            "badges_total":        badges_total,
            "events_participated": events_participated,
            "achievements_count":  achievements_count,
        })

    my_position = None
    me = get_jwt_identity()
    if me:
        me_oid = ObjectId(me)
        u = users().find_one({"_id": me_oid}, {"xp_total": 1})
        if u:
            my_xp = int(u.get("xp_total", 0))
            # Posición global = cuántos usuarios tienen estrictamente más XP + 1.
            ahead = users().count_documents({"xp_total": {"$gt": my_xp}})
            badges_total, _ev, _ac = stats_for(me_oid)
            my_position = {
                "position": ahead + 1,
                "xp_total": my_xp,
                "level":    compute_level(my_xp),
                "badges_total": badges_total,
            }

    return jsonify({"ranking": ranking, "my_position": my_position}), 200

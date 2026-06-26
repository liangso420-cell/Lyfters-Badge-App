# backend/routes/events.py — rutas /events/* y /leaderboard

from datetime import datetime, timezone

from bson import ObjectId
from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required, get_jwt_identity, get_jwt, verify_jwt_in_request

from db import users, events, badges, scans, event_joins, user_achievements, workspaces, reviews, saved_events
from utils import valid_oid, fmt_event, fmt_badge, compute_event_status, haversine
from services.xp import compute_level, level_name

events_bp = Blueprint("events", __name__)
# /leaderboard no cuelga de /events, va en su propio blueprint sin prefix
leaderboard_bp = Blueprint("leaderboard", __name__)

_PRIVACY_VISIBLE = {"$or": [
    {"privacy.show_in_leaderboard": {"$ne": False}},
    {"privacy": {"$exists": False}},
]}


def _get_ws_id_optional():
    """Devuelve workspace_id del JWT como ObjectId si hay sesión activa, sino None."""
    try:
        verify_jwt_in_request(optional=True)
        claims = get_jwt()
        ws = claims.get("workspace_id") if claims else None
        if ws and claims.get("role") != "god_admin":
            return ObjectId(ws)
    except Exception:
        pass
    return None


# ──────────────────────────────────────────────
# EVENTOS — participante / público
# ──────────────────────────────────────────────

@events_bp.route("/", methods=["GET"])
@events_bp.route("",  methods=["GET"])
def list_events():
    visible_statuses = ("upcoming", "open", "ongoing", "finished")
    docs = list(events().find({"active": True}))
    visible = [e for e in docs if compute_event_status(e) in visible_statuses]
    ws_ids = {e["workspace_id"] for e in visible if e.get("workspace_id")}
    ws_names = {
        str(ws["_id"]): ws.get("name", "")
        for ws in workspaces().find({"_id": {"$in": list(ws_ids)}}, {"name": 1})
    }
    result = [fmt_event(e, ws_names.get(str(e.get("workspace_id", "")))) for e in visible]
    return jsonify(result), 200


@events_bp.route("/joined", methods=["GET"])
@jwt_required()
def joined_events():
    uid = get_jwt_identity()
    user_oid = ObjectId(uid)

    joined_docs = list(event_joins().find({"user_id": user_oid}))
    event_ids = [j["event_id"] for j in joined_docs]

    # Último scan por evento para este usuario, para ordenar por actividad reciente.
    last_scan_by_event = {}
    for eid in event_ids:
        last_scan = scans().find_one(
            {"user_id": user_oid, "event_id": eid},
            sort=[("scanned_at", -1)]
        )
        last_scan_by_event[str(eid)] = last_scan["scanned_at"] if last_scan else None

    result = []
    for eid in event_ids:
        e = events().find_one({"_id": eid, "active": True})
        if e:
            ev_dto = fmt_event(e)
            ts = last_scan_by_event.get(str(eid))
            ev_dto["last_scan_at"] = ts.isoformat() if ts else None
            result.append(ev_dto)

    # El más recientemente escaneado primero.
    result.sort(key=lambda x: x.get("last_scan_at") or "", reverse=True)
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
    user_list = list(users().find(_PRIVACY_VISIBLE, {"password_hash": 0}))
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
    return jsonify(result[:8]), 200


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
        {"$match": {"$or": _PRIVACY_VISIBLE["$or"]}},
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

    # 5. Ordenar únicamente por xp_total DESC.
    entries.sort(key=lambda e: e["xp_total"], reverse=True)

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

    # Top 50 por XP total — solo usuarios que no ocultaron su perfil.
    top = list(users().find(_PRIVACY_VISIBLE, {"name": 1, "xp_total": 1}).sort("xp_total", -1).limit(8))

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


@events_bp.route("/<event_id>/review", methods=["POST"])
@jwt_required()
def submit_review(event_id):
    user_id = ObjectId(get_jwt_identity())
    try:
        oid = ObjectId(event_id)
    except Exception:
        return jsonify(error="ID inválido"), 400

    event = events().find_one({"_id": oid})
    if not event:
        return jsonify(error="Evento no encontrado"), 404

    existing = reviews().find_one({"user_id": user_id, "event_id": oid})
    if existing:
        return jsonify(error="Ya enviaste una reseña para este evento"), 400

    data = request.get_json() or {}
    rating = data.get("rating")
    recommend = data.get("recommend")
    best_part = data.get("best_part")
    return_again = data.get("return_again")

    if not rating or rating not in [1, 2, 3, 4, 5]:
        return jsonify(error="Calificación inválida"), 400

    reviews().insert_one({
        "user_id": user_id,
        "event_id": oid,
        "rating": rating,
        "recommend": recommend,
        "best_part": best_part,
        "return_again": return_again,
        "created_at": datetime.now(timezone.utc)
    })

    return jsonify(message="Reseña enviada correctamente"), 201


@events_bp.route("/<event_id>/reviews", methods=["GET"])
@jwt_required()
def get_reviews(event_id):
    try:
        oid = ObjectId(event_id)
    except Exception:
        return jsonify(error="ID inválido"), 400

    event_reviews = list(reviews().find(
        {"event_id": oid},
        {"user_id": 1, "rating": 1, "recommend": 1, "best_part": 1, "return_again": 1, "created_at": 1}
    ).sort("created_at", -1).limit(50))

    result = []
    for r in event_reviews:
        user_doc = users().find_one({"_id": r["user_id"]}, {"name": 1})
        result.append({
            "id": str(r["_id"]),
            "user_name": user_doc.get("name", "Usuario") if user_doc else "Usuario",
            "rating": r.get("rating", 0),
            "recommend": r.get("recommend"),
            "best_part": r.get("best_part"),
            "return_again": r.get("return_again"),
            "created_at": r.get("created_at", "").isoformat() if hasattr(r.get("created_at"), "isoformat") else ""
        })

    avg_rating = round(sum(r["rating"] for r in result) / len(result), 1) if result else 0

    return jsonify(reviews=result, total=len(result), avg_rating=avg_rating), 200


@events_bp.route("/reviews/<review_id>", methods=["DELETE"])
@jwt_required()
def delete_review(review_id):
    claims = get_jwt()
    if claims.get("role") not in ("admin", "superadmin", "god_admin"):
        return jsonify(error="Sin permisos"), 403
    try:
        oid = ObjectId(review_id)
    except Exception:
        return jsonify(error="ID inválido"), 400

    result = reviews().delete_one({"_id": oid})
    if result.deleted_count == 0:
        return jsonify(error="Reseña no encontrada"), 404
    return jsonify(message="Reseña eliminada"), 200


@events_bp.route("/<event_id>/save", methods=["POST"])
@jwt_required()
def save_event(event_id):
    user_oid = ObjectId(get_jwt_identity())
    try:
        oid = ObjectId(event_id)
    except Exception:
        return jsonify(error="ID inválido"), 400

    existing = saved_events().find_one({"user_id": user_oid, "event_id": oid})
    if existing:
        saved_events().delete_one({"_id": existing["_id"]})
        return jsonify(saved=False, message="Evento eliminado de guardados"), 200

    saved_events().insert_one({
        "user_id": user_oid,
        "event_id": oid,
        "saved_at": datetime.now(timezone.utc)
    })
    return jsonify(saved=True, message="Evento guardado"), 200


@events_bp.route("/<event_id>/save/status", methods=["GET"])
@jwt_required()
def save_status(event_id):
    user_oid = ObjectId(get_jwt_identity())
    try:
        oid = ObjectId(event_id)
    except Exception:
        return jsonify(saved=False), 200
    existing = saved_events().find_one({"user_id": user_oid, "event_id": oid})
    return jsonify(saved=bool(existing)), 200


@events_bp.route("/saved", methods=["GET"])
@jwt_required()
def get_saved_events():
    user_oid = ObjectId(get_jwt_identity())
    saves = list(saved_events().find({"user_id": user_oid}))
    result = []
    for s in saves:
        ev = events().find_one({"_id": s["event_id"]})
        if ev:
            result.append(fmt_event(ev))
    return jsonify(result), 200

# backend/routes/xp.py — rutas /profile/* (XP y logros del usuario autenticado)

from bson import ObjectId
from flask import Blueprint, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity

from db import users, achievements, user_achievements
from services.xp import level_progress

xp_bp = Blueprint("xp", __name__)


# ──────────────────────────────────────────────
# XP / NIVEL
# ──────────────────────────────────────────────

@xp_bp.route("/xp", methods=["GET"])
@jwt_required()
def get_xp():
    uid = get_jwt_identity()
    user = users().find_one({"_id": ObjectId(uid)}, {"xp_total": 1})
    if not user:
        return jsonify(error="Usuario no encontrado"), 404
    xp_total = int(user.get("xp_total", 0))
    # level_progress ya devuelve level, level_name, xp_total, xp_next_level,
    # xp_for_next y progress_pct.
    return jsonify(level_progress(xp_total)), 200


# ──────────────────────────────────────────────
# LOGROS
# ──────────────────────────────────────────────

@xp_bp.route("/achievements", methods=["GET"])
@jwt_required()
def get_achievements():
    uid = get_jwt_identity()
    user_oid = ObjectId(uid)

    all_defs = list(achievements().find({}))

    # Map achievement_id -> unlocked_at del usuario
    owned = {
        ua["achievement_id"]: ua.get("unlocked_at")
        for ua in user_achievements().find({"user_id": user_oid})
    }

    unlocked, locked = [], []
    for ach in all_defs:
        if ach["_id"] in owned:
            unlocked_at = owned[ach["_id"]]
            unlocked.append({
                "slug":        ach.get("slug"),
                "name":        ach.get("name"),
                "description": ach.get("description"),
                "icon":        ach.get("icon"),
                "rarity":      ach.get("rarity"),
                "xp_reward":   ach.get("xp_reward"),
                "unlocked_at": unlocked_at.isoformat() if unlocked_at else None,
            })
        else:
            locked.append({
                "slug":   ach.get("slug"),
                "name":   ach.get("name"),
                "icon":   ach.get("icon"),
                "rarity": ach.get("rarity"),
                # Pista genérica, sin revelar la condición exacta.
                "hint":   ach.get("hint", "Seguí participando para desbloquearlo."),
            })

    return jsonify({"unlocked": unlocked, "locked": locked}), 200

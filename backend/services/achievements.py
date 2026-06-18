# backend/services/achievements.py — evaluación y desbloqueo de logros
#
# Reglas de oro:
#   - Las condiciones se evalúan consultando la base de datos, nunca con
#     lógica del cliente.
#   - El índice único (user_id, achievement_id) es la barrera real contra
#     duplicados: capturamos DuplicateKeyError silenciosamente.
#   - Si falla un logro individual, se loggea y se continúa — nunca tumba
#     el flujo del scan.
#   - Al desbloquear un logro se otorga su XP vía services.xp.grant_xp.

import logging
from datetime import datetime

from pymongo.errors import DuplicateKeyError

from db import scans, badges, users, achievements, user_achievements
from services.xp import grant_xp, compute_level

logger = logging.getLogger(__name__)


def compute_user_stats(user_oid) -> dict:
    """Reúne en una sola pasada las métricas que usan las condiciones."""
    total_badges = scans().count_documents({"user_id": user_oid})

    event_ids = scans().distinct("event_id", {"user_id": user_oid})
    distinct_events = len(event_ids)

    # Eventos completados: scans del usuario por evento vs total de badges.
    completed_events = 0
    pipeline = [
        {"$match": {"user_id": user_oid}},
        {"$group": {"_id": "$event_id", "count": {"$sum": 1}}},
    ]
    for row in scans().aggregate(pipeline):
        total = badges().count_documents({"event_id": row["_id"]})
        if total > 0 and row["count"] >= total:
            completed_events += 1

    # ¿Escaneó algún badge marcado is_rare?
    rare_ids = [b["_id"] for b in badges().find({"is_rare": True}, {"_id": 1})]
    has_rare = bool(rare_ids) and scans().count_documents(
        {"user_id": user_oid, "badge_id": {"$in": rare_ids}}
    ) > 0

    u = users().find_one({"_id": user_oid}, {"xp_total": 1})
    xp_total = int((u or {}).get("xp_total", 0))

    return {
        "total_badges":     total_badges,
        "distinct_events":  distinct_events,
        "completed_events": completed_events,
        "has_rare":         has_rare,
        "xp_total":         xp_total,
        "level":            compute_level(xp_total),
    }


# Cada condición recibe el dict de stats y retorna bool.
_CONDITIONS = {
    "first_scan":           lambda s: s["total_badges"] >= 1,
    "five_badges":          lambda s: s["total_badges"] >= 5,
    "twenty_five_badges":   lambda s: s["total_badges"] >= 25,
    "three_events":         lambda s: s["distinct_events"] >= 3,
    "five_events":          lambda s: s["distinct_events"] >= 5,
    "first_event_complete": lambda s: s["completed_events"] >= 1,
    "three_completions":    lambda s: s["completed_events"] >= 3,
    "rare_badge":           lambda s: s["has_rare"],
    "legend":               lambda s: s["level"] >= 4,
}


def _unlock(user_oid, ach) -> bool:
    """
    Intenta desbloquear un logro para el usuario. Retorna True si lo
    desbloqueó en esta llamada (False si ya lo tenía o falló).
    Otorga el XP del logro al desbloquearlo.
    """
    try:
        user_achievements().insert_one({
            "user_id":        user_oid,
            "achievement_id": ach["_id"],
            "unlocked_at":    datetime.utcnow(),
        })
    except DuplicateKeyError:
        # Otra request concurrente ya lo otorgó.
        return False
    except Exception as e:
        logger.error("Error desbloqueando logro %s: %s", ach.get("slug"), e)
        return False

    # XP del logro (no es bloqueante si falla).
    try:
        grant_xp(
            user_oid,
            int(ach.get("xp_reward", 0)),
            reason="achievement",
            ref_id=ach["_id"],
            event_id=None,
        )
    except Exception as e:
        logger.error("Error otorgando XP del logro %s: %s", ach.get("slug"), e)

    return True


def check_and_unlock(user_oid, event_oid=None) -> list:
    """
    Evalúa todos los logros que el usuario todavía no tiene y desbloquea los
    que cumplen condición. Retorna la lista de slugs desbloqueados en esta
    llamada.

    Itera en pasadas para resolver cascadas (p. ej. el XP de un logro puede
    empujar al usuario a nivel 4 y disparar "legend" en la misma evaluación).
    Cada pasada recalcula stats desde la base de datos.
    """
    unlocked_slugs = []

    try:
        all_defs = list(achievements().find({}))
    except Exception as e:
        logger.error("No se pudieron cargar las definiciones de logros: %s", e)
        return unlocked_slugs

    if not all_defs:
        return unlocked_slugs

    # IDs ya desbloqueados por el usuario.
    owned = set(
        ua["achievement_id"]
        for ua in user_achievements().find({"user_id": user_oid}, {"achievement_id": 1})
    )

    # Máximo de pasadas = cantidad de logros (cota segura contra loops).
    for _ in range(len(all_defs)):
        stats = compute_user_stats(user_oid)
        progressed = False

        for ach in all_defs:
            if ach["_id"] in owned:
                continue
            cond = _CONDITIONS.get(ach.get("slug"))
            if cond is None:
                continue
            try:
                meets = cond(stats)
            except Exception as e:
                logger.error("Error evaluando logro %s: %s", ach.get("slug"), e)
                continue
            if not meets:
                continue
            if _unlock(user_oid, ach):
                owned.add(ach["_id"])
                unlocked_slugs.append(ach["slug"])
                progressed = True

        if not progressed:
            break

    return unlocked_slugs

# backend/services/xp.py — lógica de XP y niveles
#
# Reglas de oro:
#   - Todo el cálculo de XP ocurre acá, en el servidor. El cliente nunca
#     propone ni informa valores de XP.
#   - xp_total se actualiza SIEMPRE con $inc atómico, nunca read-modify-write.
#   - El xp_log es append-only: una entrada por cada tipo de XP otorgado.
#   - El nivel NO se almacena: es una función pura de xp_total.

import logging
from datetime import datetime

from pymongo import ReturnDocument

from db import users, xp_log

logger = logging.getLogger(__name__)

# Umbrales de nivel: (nivel, nombre, xp_requerido). Ordenados ascendente.
LEVELS = [
    (1, "Explorador",     0),
    (2, "Coleccionista",  100),
    (3, "Maestro badge",  300),
    (4, "Leyenda Lyfter", 600),
]

# Defaults de configuración de XP (si faltan en los documentos)
DEFAULT_BADGE_XP        = 10
DEFAULT_FIRST_SCAN      = 5
DEFAULT_RARE_BONUS      = 15
DEFAULT_COMPLETION_BONUS = 50


def compute_level(xp_total: int) -> int:
    """Retorna el nivel 1-4 según umbrales. Pura, sin side effects."""
    level = 1
    for lvl, _name, threshold in LEVELS:
        if xp_total >= threshold:
            level = lvl
        else:
            break
    return level


def level_name(level: int) -> str:
    """Nombre del nivel dado su número."""
    for lvl, name, _threshold in LEVELS:
        if lvl == level:
            return name
    return LEVELS[0][1]


def level_progress(xp_total: int) -> dict:
    """
    Calcula el progreso hacia el siguiente nivel.
    Retorna: { level, level_name, xp_total, xp_next_level, xp_for_next, progress_pct }
      - xp_next_level: XP total necesario para alcanzar el siguiente nivel
                       (igual al threshold actual si ya está en el máximo).
      - xp_for_next:   XP que falta para subir (0 si está en el nivel máximo).
      - progress_pct:  0-100, porcentaje del tramo actual recorrido
                       (100 si está en el nivel máximo).
    """
    level = compute_level(xp_total)
    current_threshold = next(t for lvl, _n, t in LEVELS if lvl == level)
    next_entry = next((e for e in LEVELS if e[0] == level + 1), None)

    if next_entry is None:
        # Nivel máximo: progreso completo, no falta nada.
        return {
            "level":         level,
            "level_name":    level_name(level),
            "xp_total":      xp_total,
            "xp_next_level": current_threshold,
            "xp_for_next":   0,
            "progress_pct":  100,
        }

    next_threshold = next_entry[2]
    span = next_threshold - current_threshold
    gained = xp_total - current_threshold
    pct = int(round((gained / span) * 100)) if span > 0 else 0
    pct = max(0, min(100, pct))

    return {
        "level":         level,
        "level_name":    level_name(level),
        "xp_total":      xp_total,
        "xp_next_level": next_threshold,
        "xp_for_next":   max(0, next_threshold - xp_total),
        "progress_pct":  pct,
    }


def grant_xp(user_oid, amount, reason, ref_id=None, event_id=None) -> int:
    """
    Otorga `amount` de XP a un usuario: inserta una entrada en xp_log
    (append-only) y aplica $inc atómico sobre users.xp_total.

    Retorna el xp_total resultante (post-incremento).

    Es la primitiva de bajo nivel usada tanto por award_xp (scans) como por
    el módulo de logros. No valida duplicados — el llamador garantiza que el
    XP corresponde a un evento nuevo.
    """
    if amount <= 0:
        # No registramos otorgamientos vacíos.
        u = users().find_one({"_id": user_oid}, {"xp_total": 1})
        return int((u or {}).get("xp_total", 0))

    xp_log().insert_one({
        "user_id":    user_oid,
        "amount":     int(amount),
        "reason":     reason,
        "ref_id":     ref_id,
        "event_id":   event_id,
        "created_at": datetime.utcnow(),
    })

    updated = users().find_one_and_update(
        {"_id": user_oid},
        {"$inc": {"xp_total": int(amount)}},
        return_document=ReturnDocument.AFTER,
    )
    return int((updated or {}).get("xp_total", 0))


def award_xp(user_oid, badge_doc, event_doc, is_first_scan, is_completion) -> dict:
    """
    Calcula y otorga el XP correspondiente a un scan NUEVO (no duplicado).
    El llamador debe garantizar que el scan no es duplicado.

    Componentes (cada uno como entrada separada en xp_log):
      - base:       badge.xp_value
      - first_scan: event.xp_first_scan        (si es el primer badge del evento)
      - rare:       event.xp_rare_bonus         (si el badge es is_rare)
      - completion: event.xp_completion_bonus   (si este scan completa el evento)

    Retorna: { xp_gained, xp_total, level, level_up }
    """
    badge_oid = badge_doc["_id"]
    event_oid = event_doc["_id"]

    # XP total ANTES de este scan, para detectar level_up.
    u = users().find_one({"_id": user_oid}, {"xp_total": 1})
    xp_before = int((u or {}).get("xp_total", 0))
    level_before = compute_level(xp_before)

    # Construir la lista de otorgamientos a aplicar.
    grants = []  # (amount, reason)

    base = int(badge_doc.get("xp_value", DEFAULT_BADGE_XP))
    grants.append((base, "scan"))

    if is_first_scan:
        grants.append((int(event_doc.get("xp_first_scan", DEFAULT_FIRST_SCAN)), "first_scan_bonus"))

    if badge_doc.get("is_rare"):
        grants.append((int(event_doc.get("xp_rare_bonus", DEFAULT_RARE_BONUS)), "rare_bonus"))

    if is_completion:
        grants.append((int(event_doc.get("xp_completion_bonus", DEFAULT_COMPLETION_BONUS)), "completion_bonus"))

    xp_total = xp_before
    xp_gained = 0
    components = {"scan": 0, "first_scan_bonus": 0, "rare_bonus": 0, "completion_bonus": 0}
    for amount, reason in grants:
        if amount <= 0:
            continue
        ref = badge_oid if reason == "scan" else badge_oid
        xp_total = grant_xp(user_oid, amount, reason, ref_id=ref, event_id=event_oid)
        xp_gained += amount
        components[reason] = components.get(reason, 0) + amount

    level_after = compute_level(xp_total)

    return {
        "xp_gained":            xp_gained,
        "xp_total":             xp_total,
        "level":                level_after,
        "level_up":             level_after > level_before,
        "xp_base":              components["scan"],
        "xp_first_scan_bonus":  components["first_scan_bonus"],
        "xp_rare_bonus":        components["rare_bonus"],
        "xp_completion_bonus":  components["completion_bonus"],
    }

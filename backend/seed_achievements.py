"""
seed_achievements.py — siembra (idempotente) las definiciones de logros.

Ejecutar:  python seed_achievements.py

Usa update_one con upsert=True filtrando por slug, así que se puede correr
múltiples veces sin duplicar. Las definiciones son fijas: no las crea el admin.

El XP por logro es fijo según rareza:
  common: 15, rare: 30, epic: 75, legendary: 100
"""
from db import achievements, init_indexes

# slug, name, description, hint (genérico, sin spoilear), icon, rarity, xp_reward
ACHIEVEMENTS = [
    ("first_scan",           "Primer paso",   "Escaneaste tu primer badge.",
     "Escaneá tu primer badge.",                          "👣", "common",    15),
    ("five_badges",          "Coleccionista", "Acumulaste 5 badges en total.",
     "Seguí coleccionando badges.",                       "🎖️", "common",    15),
    ("twenty_five_badges",   "Adictx",        "Acumulaste 25 badges en total.",
     "Coleccioná muchísimos badges.",                     "🔥", "rare",      30),
    ("first_event_complete", "Completista",   "Completaste todos los badges de un evento.",
     "Completá todos los badges de un evento.",           "✅", "rare",      30),
    ("three_completions",    "Perfeccionista","Completaste 3 eventos distintos.",
     "Completá varios eventos.",                          "💯", "epic",      75),
    ("three_events",         "Viajero",       "Participaste en 3 eventos distintos.",
     "Participá en varios eventos.",                      "🧳", "rare",      30),
    ("five_events",          "Veterano",      "Participaste en 5 eventos distintos.",
     "Participá en muchos eventos.",                      "🎓", "epic",      75),
    ("rare_badge",           "Ojo de halcón", "Escaneaste un badge raro.",
     "Encontrá un badge especial.",                       "🦅", "rare",      30),
    ("legend",               "Leyenda",       "Alcanzaste el nivel máximo (Leyenda Lyfter).",
     "Alcanzá el nivel máximo.",                          "👑", "legendary", 100),
]


def main():
    # Garantiza el índice único en slug antes de upsert.
    init_indexes()

    print("\nSembrando definiciones de logros...\n")
    for slug, name, description, hint, icon, rarity, xp_reward in ACHIEVEMENTS:
        achievements().update_one(
            {"slug": slug},
            {"$set": {
                "slug":        slug,
                "name":        name,
                "description": description,
                "hint":        hint,
                "icon":        icon,
                "xp_reward":   xp_reward,
                "rarity":      rarity,
            }},
            upsert=True,
        )
        print(f"  OK  {slug:22s} ({rarity}, {xp_reward} XP)")

    total = achievements().count_documents({})
    print(f"\nListo. {total} logros en la coleccion 'achievements'.\n")


if __name__ == "__main__":
    main()

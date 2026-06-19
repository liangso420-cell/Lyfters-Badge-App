"""
seed_achievements.py — siembra (idempotente) las definiciones de logros.

Ejecutar:  python seed_achievements.py

Usa update_one con upsert=True filtrando por slug, así que se puede correr
múltiples veces sin duplicar. Las definiciones son fijas: no las crea el admin.
"""
from db import achievements, init_indexes

ACHIEVEMENTS = [
    {
        "slug":        "primer_paso",
        "name":        "Primer Paso",
        "description": "Escanea tu primer badge y da el primer paso en tu aventura",
        "hint":        "Escaneá tu primer badge.",
        "icon":        "assets/icons/achievements/Primer paso.png",
        "rarity":      "common",
        "xp_reward":   10,
    },
    {
        "slug":        "coleccionista",
        "name":        "Coleccionista",
        "description": "Obtén 10 badges en diferentes eventos",
        "hint":        "Seguí coleccionando badges.",
        "icon":        "assets/icons/achievements/coleccionista.png",
        "rarity":      "rare",
        "xp_reward":   25,
    },
    {
        "slug":        "vertigo",
        "name":        "Vértigo",
        "description": "Escanea 5 badges en menos de una hora",
        "hint":        "Coleccioná badges rápidamente.",
        "icon":        "assets/icons/achievements/vertigo.png",
        "rarity":      "rare",
        "xp_reward":   30,
    },
    {
        "slug":        "completista",
        "name":        "Completista",
        "description": "Completa todos los badges de un evento",
        "hint":        "Completá todos los badges de un evento.",
        "icon":        "assets/icons/achievements/icono de Perfeccionista .png",
        "rarity":      "epic",
        "xp_reward":   50,
    },
    {
        "slug":        "perfeccionista",
        "name":        "Perfeccionista",
        "description": "Completa 3 eventos al 100% sin fallar ningún badge",
        "hint":        "Completá varios eventos al 100%.",
        "icon":        "assets/icons/achievements/icono de Perfeccionista .png",
        "rarity":      "epic",
        "xp_reward":   75,
    },
    {
        "slug":        "viajero",
        "name":        "Viajero",
        "description": "Únete a 5 eventos diferentes",
        "hint":        "Participá en varios eventos.",
        "icon":        "assets/icons/achievements/viajero.png",
        "rarity":      "rare",
        "xp_reward":   40,
    },
    {
        "slug":        "veterano",
        "name":        "Veterano",
        "description": "Lleva más de 30 días activo en la plataforma",
        "hint":        "Seguí activo en la plataforma.",
        "icon":        "assets/icons/achievements/Veterano.png",
        "rarity":      "epic",
        "xp_reward":   60,
    },
    {
        "slug":        "ojo_halcon",
        "name":        "Ojo de Halcón",
        "description": "Escanea un badge en menos de 10 segundos después de unirte a un evento",
        "hint":        "Encontrá un badge especial rápidamente.",
        "icon":        "assets/icons/achievements/ojo de halcon.png",
        "rarity":      "legendary",
        "xp_reward":   100,
    },
    {
        "slug":        "leyenda",
        "name":        "Leyenda",
        "description": "Alcanza el top 3 del ranking global",
        "hint":        "Alcanzá el top del ranking.",
        "icon":        "assets/icons/achievements/Leyenda.png",
        "rarity":      "legendary",
        "xp_reward":   150,
    },
]


def main():
    init_indexes()
    print("\nSembrando definiciones de logros...\n")
    for a in ACHIEVEMENTS:
        achievements().update_one(
            {"slug": a["slug"]},
            {"$set": a},
            upsert=True,
        )
        print(f"  OK  {a['slug']:22s} ({a['rarity']}, {a['xp_reward']} XP)")

    total = achievements().count_documents({})
    print(f"\nListo. {total} logros en la coleccion 'achievements'.\n")


if __name__ == "__main__":
    main()

"""
Migración: crea el workspace de Lyfter y asigna todos los datos existentes a él.
Ejecutar UNA sola vez: python migrate_workspaces.py
"""
import os
import sys

# Asegurar que el directorio del backend esté en el path
sys.path.insert(0, os.path.dirname(__file__))

from db import get_db, init_indexes
from bson import ObjectId
from datetime import datetime, timezone
import bcrypt

db = get_db()
init_indexes()

# 1. Crear workspace de Lyfter
lyfter_ws = db["workspaces"].find_one({"slug": "lyfter"})
if not lyfter_ws:
    ws_id = ObjectId()
    db["workspaces"].insert_one({
        "_id":        ws_id,
        "name":       "Lyfter",
        "slug":       "lyfter",
        "logo_url":   None,
        "owner_id":   None,
        "plan":       "enterprise",
        "active":     True,
        "created_at": datetime.now(timezone.utc),
    })
    print(f"Workspace Lyfter creado: {ws_id}")
else:
    ws_id = lyfter_ws["_id"]
    print(f"Workspace Lyfter ya existe: {ws_id}")

# 2. Asignar workspace_id a colecciones existentes
for col_name in ["events", "badges", "scans", "event_joins", "xp_log", "user_achievements"]:
    result = db[col_name].update_many(
        {"workspace_id": {"$exists": False}},
        {"$set": {"workspace_id": ws_id}}
    )
    print(f"{col_name}: {result.modified_count} docs actualizados")

# 3. Actualizar el validator de users para aceptar los nuevos roles
db.command("collMod", "users", validator={
    "$jsonSchema": {
        "bsonType": "object",
        "required": ["name", "email", "password_hash", "role", "created_at"],
        "properties": {
            "name":          {"bsonType": "string"},
            "email":         {"bsonType": "string"},
            "password_hash": {"bsonType": "string"},
            "role":          {"bsonType": "string", "enum": ["participant", "admin", "superadmin", "god_admin"]},
            "created_at":    {"bsonType": "date"},
        }
    }
}, validationAction="warn")
print("Validator de users actualizado")

# 4. Crear god_admin si no existe
god_email = os.getenv("GOD_ADMIN_EMAIL", "god@lyfter.app")
god_pass  = os.getenv("GOD_ADMIN_PASSWORD", "lyfter_god_2026")
existing  = db["users"].find_one({"email": god_email})
if not existing:
    h = bcrypt.hashpw(god_pass.encode(), bcrypt.gensalt()).decode()
    god_id = ObjectId()
    db["users"].insert_one({
        "_id":           god_id,
        "name":          "God Admin",
        "email":         god_email,
        "password_hash": h,
        "role":          "god_admin",
        "created_at":    datetime.now(timezone.utc),
    })
    print(f"God admin creado: {god_email} / {god_pass}")
else:
    god_id = existing["_id"]
    db["users"].update_one({"_id": god_id}, {"$set": {"role": "god_admin"}})
    print(f"God admin ya existe: {god_email}")

# 5. Asignar todos los usuarios existentes al workspace Lyfter
all_users = list(db["users"].find({}))
for u in all_users:
    role_in_ws = "superadmin" if u.get("role") in ("admin", "god_admin") else "participant"
    db["workspace_members"].update_one(
        {"workspace_id": ws_id, "user_id": u["_id"]},
        {"$setOnInsert": {
            "workspace_id": ws_id,
            "user_id":      u["_id"],
            "role":         role_in_ws,
            "joined_at":    datetime.now(timezone.utc),
        }},
        upsert=True,
    )
print(f"{len(all_users)} usuarios migrados como members del workspace Lyfter")

print("\nMigración completada.")

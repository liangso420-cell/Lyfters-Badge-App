# fix_passwords.py — actualiza los placeholders del seed con hashes bcrypt reales
import sys
import os
sys.path.insert(0, os.path.dirname(__file__))

import bcrypt
from db import get_db

db = get_db()

admin_hash = bcrypt.hashpw(b"admin123", bcrypt.gensalt()).decode()
user_hash  = bcrypt.hashpw(b"user123",  bcrypt.gensalt()).decode()

r1 = db["users"].update_many({"role": "admin"},       {"$set": {"password_hash": admin_hash}})
r2 = db["users"].update_many({"role": "participant"}, {"$set": {"password_hash": user_hash}})

print(f"Admins actualizados:        {r1.modified_count}")
print(f"Participantes actualizados: {r2.modified_count}")
print("")
print("Credenciales:")
print("  admin@lyfter.app   -> admin123")
print("  ana@lyfter.app     -> user123")
print("  carlos@lyfter.app  -> user123")

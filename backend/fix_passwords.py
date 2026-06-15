"""
fix_passwords.py — regenera hashes bcrypt reales para los usuarios del seed.
Ejecutar una vez después del seed:  python fix_passwords.py
"""
import bcrypt
from db import users

PASSWORDS = {
    "admin@lyfter.app":   "admin123",
    "ana@lyfter.app":     "ana123",
    "carlos@lyfter.app":  "carlos123",
    "lucia@lyfter.app":   "lucia123",
}

def main():
    print("\nActualizando hashes de contrasenas...\n")
    for email, password in PASSWORDS.items():
        pw_hash = bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()
        result = users().update_one(
            {"email": email},
            {"$set": {"password_hash": pw_hash}}
        )
        if result.matched_count:
            print(f"  OK  {email} -> hash actualizado")
        else:
            print(f"  WARN {email} -> usuario no encontrado (corre el seed primero)")
    print("\nListo. Podes hacer login con las credenciales del seed.\n")

if __name__ == "__main__":
    main()

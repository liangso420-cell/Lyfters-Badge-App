"""
fix_passwords.py — regenera hashes bcrypt reales para los usuarios del seed.

Las contraseñas se leen desde variables de entorno (NO se escriben en el código):

    SEED_PW_ADMIN    -> admin@lyfter.app
    SEED_PW_ANA      -> ana@lyfter.app
    SEED_PW_CARLOS   -> carlos@lyfter.app
    SEED_PW_LUCIA    -> lucia@lyfter.app

Ejecutar una vez después del seed:

    SEED_PW_ADMIN=... SEED_PW_ANA=... SEED_PW_CARLOS=... SEED_PW_LUCIA=... python fix_passwords.py
"""
import os
import bcrypt
from db import users

# Mapea cada email del seed a la variable de entorno que contiene su contraseña.
ENV_VARS = {
    "admin@lyfter.app":   "SEED_PW_ADMIN",
    "ana@lyfter.app":     "SEED_PW_ANA",
    "carlos@lyfter.app":  "SEED_PW_CARLOS",
    "lucia@lyfter.app":   "SEED_PW_LUCIA",
}

def main():
    # Resolver contraseñas desde el entorno y avisar de las que falten.
    passwords = {}
    missing = []
    for email, env_var in ENV_VARS.items():
        password = os.environ.get(env_var)
        if password:
            passwords[email] = password
        else:
            missing.append((email, env_var))

    if missing:
        print("\n!! ADVERTENCIA: faltan variables de entorno con contraseñas:")
        for email, env_var in missing:
            print(f"     {env_var} (para {email}) -> NO definida, se omite")
        print("   Definí esas variables antes de correr el script para actualizar esos usuarios.\n")

    if not passwords:
        print("No hay contraseñas para actualizar (ninguna variable de entorno definida). Abortando.\n")
        return

    print("\nActualizando hashes de contrasenas...\n")
    for email, password in passwords.items():
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

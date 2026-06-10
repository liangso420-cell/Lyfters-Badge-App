"""Modelo / helpers de la colección users."""
from datetime import datetime, timezone

from werkzeug.security import generate_password_hash, check_password_hash

from db import users

ROLES = ("participante", "admin")


def create_user(nombre, email, password, rol="participante"):
    """Crea un usuario con la contraseña hasheada. Retorna el documento insertado."""
    doc = {
        "nombre": nombre,
        "email": email.lower().strip(),
        "password": generate_password_hash(password),
        "rol": rol if rol in ROLES else "participante",
        "createdAt": datetime.now(timezone.utc),
    }
    result = users.insert_one(doc)
    doc["_id"] = result.inserted_id
    return doc


def find_by_email(email):
    return users.find_one({"email": email.lower().strip()})


def verify_password(user, password):
    return check_password_hash(user["password"], password)


def public_user(user):
    """Versión segura del usuario (sin password) para enviar al cliente."""
    return {
        "id": str(user["_id"]),
        "nombre": user["nombre"],
        "email": user["email"],
        "rol": user["rol"],
    }

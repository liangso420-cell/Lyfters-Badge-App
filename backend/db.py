"""Conexión a MongoDB vía PyMongo y acceso a las colecciones."""
from pymongo import MongoClient, ASCENDING

from config import config

_client = MongoClient(config.MONGO_URI)
db = _client[config.MONGO_DB]

# Colecciones
users = db["users"]
events = db["events"]
badges = db["badges"]
scans = db["scans"]


def ensure_indexes():
    """Crea los índices necesarios (idempotente)."""
    users.create_index([("email", ASCENDING)], unique=True)
    badges.create_index([("token", ASCENDING)], unique=True)
    # Un usuario no puede canjear el mismo badge dos veces
    scans.create_index(
        [("user_id", ASCENDING), ("badge_id", ASCENDING)], unique=True
    )

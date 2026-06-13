# backend/db.py
# Conexión Flask-PyMongo para Lyfter Badge App

from pymongo import MongoClient
from pymongo.errors import ConnectionFailure
import os
import logging
from dotenv import load_dotenv

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(message)s'
)
logger = logging.getLogger(__name__)

load_dotenv()

_client = None
_db     = None

def get_db():
    """
    Retorna la instancia de la base de datos lyfter_db.
    Reutiliza la conexión si ya existe (patrón singleton).
    """
    global _client, _db

    if _db is not None:
        return _db

    mongo_uri = os.getenv("MONGO_URI", "mongodb://localhost:27017")

    try:
        _client = MongoClient(mongo_uri, serverSelectionTimeoutMS=5000)
        _client.admin.command("ping")  # verifica que MongoDB esté corriendo
        _db = _client["lyfter_db"]
        logger.info("Conectado a MongoDB - lyfter_db")
        return _db
    except ConnectionFailure as e:
        logger.error(f"No se pudo conectar a MongoDB: {e}")
        raise

# Accesos directos a cada colección
def users():  return get_db()["users"]
def events(): return get_db()["events"]
def badges(): return get_db()["badges"]
def scans():  return get_db()["scans"]


def init_indexes():
    from pymongo import ASCENDING
    # Email único por usuario
    users().create_index("email", unique=True)
    # Token único por badge
    badges().create_index("token", unique=True)
    # Un usuario no puede escanear el mismo badge dos veces
    scans().create_index(
        [("user_id", ASCENDING), ("badge_id", ASCENDING)],
        unique=True
    )
    # Búsquedas rápidas de badges por evento
    badges().create_index("event_id")
    # Búsquedas rápidas de scans por usuario y evento
    scans().create_index([("user_id", ASCENDING), ("event_id", ASCENDING)])

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

    mongo_uri = os.getenv("MONGO_URI")
    if not mongo_uri:
        raise RuntimeError("MONGO_URI no está configurada en las variables de entorno")

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
def users():       return get_db()["users"]
def events():      return get_db()["events"]
def badges():      return get_db()["badges"]
def scans():       return get_db()["scans"]
def event_joins(): return get_db()["event_joins"]

# Colecciones del sistema de XP y logros
def achievements():      return get_db()["achievements"]
def user_achievements(): return get_db()["user_achievements"]
def xp_log():            return get_db()["xp_log"]

# Colecciones del sistema multi-tenant
def workspaces():        return get_db()["workspaces"]
def workspace_members(): return get_db()["workspace_members"]
def invitations():       return get_db()["invitations"]
def reviews():           return get_db()["reviews"]
def saved_events():      return get_db()["saved_events"]
def ip_bans():           return get_db()["ip_bans"]
def reports():           return get_db()["reports"]


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

    # ── Sistema de XP y logros ──────────────────────────────
    # Slug único por definición de logro
    achievements().create_index("slug", unique=True)
    # Un logro solo se puede desbloquear una vez por usuario.
    # Este índice es la barrera real contra duplicados (no la lógica Python).
    user_achievements().create_index(
        [("user_id", ASCENDING), ("achievement_id", ASCENDING)],
        unique=True
    )
    # Auditoría de XP por usuario, ordenable por fecha
    xp_log().create_index([("user_id", ASCENDING), ("created_at", ASCENDING)])

    # ── Sistema multi-tenant ────────────────────────────────
    workspaces().create_index("slug", unique=True)
    workspace_members().create_index(
        [("workspace_id", ASCENDING), ("user_id", ASCENDING)], unique=True
    )
    invitations().create_index("token", unique=True)
    invitations().create_index("code", unique=True)
    invitations().create_index("expires_at", expireAfterSeconds=0)

    # ── Baneo de IPs ────────────────────────────────
    ip_bans().create_index("ip", unique=True)
    ip_bans().create_index("expires_at", expireAfterSeconds=0)

    # ── Reports de usuarios ─────────────────────────
    reports().create_index([("reporter_id", ASCENDING), ("event_id", ASCENDING)])
    reports().create_index("status")
    reports().create_index("created_at")

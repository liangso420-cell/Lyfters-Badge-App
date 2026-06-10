"""Carga y centraliza la configuración desde variables de entorno (.env)."""
import os
from dotenv import load_dotenv

load_dotenv()


class Config:
    MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017/")
    MONGO_DB = os.getenv("MONGO_DB", "lyfter_badges")

    JWT_SECRET = os.getenv("JWT_SECRET", "dev-secret-change-me")
    JWT_EXP_HOURS = int(os.getenv("JWT_EXP_HOURS", "24"))

    PORT = int(os.getenv("PORT", "5000"))

    # URL del frontend, usada para construir el contenido del QR
    FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5173").rstrip("/")

    # Orígenes permitidos para CORS
    CORS_ORIGINS = [
        o.strip()
        for o in os.getenv("CORS_ORIGINS", "http://localhost:5173").split(",")
        if o.strip()
    ]


config = Config()

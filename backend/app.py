# backend/app.py — Lyfter Badge App

import os
import re
from datetime import timedelta

from dotenv import load_dotenv
from flask import Flask, jsonify, redirect, request
from flask_cors import CORS
from werkzeug.middleware.proxy_fix import ProxyFix
from flask_jwt_extended import JWTManager

from db import init_indexes
from routes.auth import auth_bp
from routes.events import events_bp, leaderboard_bp
from routes.admin import admin_bp
from routes.redeem import redeem_bp
from routes.xp import xp_bp
from routes.workspaces import ws_bp
from routes.reports import reports_bp
from security import init_security

load_dotenv()

app = Flask(__name__)

# Render sirve la app detrás de UN solo proxy (su load balancer/edge).
# ProxyFix con x_for=1 hace que request.remote_addr sea el último hop de
# X-Forwarded-For (el que añade el proxy de confianza = IP real del cliente),
# en vez de la IP del proxy. Confiamos en exactamente 1 proxy para que un
# cliente no pueda falsear su IP inyectando hops extra en X-Forwarded-For.
app.wsgi_app = ProxyFix(app.wsgi_app, x_for=1, x_proto=1, x_host=1)

app.config["JWT_SECRET_KEY"] = os.getenv("JWT_SECRET")
if not app.config["JWT_SECRET_KEY"]:
    raise RuntimeError("JWT_SECRET no está configurada en las variables de entorno")
app.config["JWT_ACCESS_TOKEN_EXPIRES"] = timedelta(hours=8)

jwt = JWTManager(app)
init_indexes()

_env_origins = [
    o.strip() for o in os.getenv(
        "CORS_ORIGINS",
        "http://localhost:5500,http://localhost:3000,http://127.0.0.1:5500"
    ).split(",") if o.strip()
]
_cors_origins = _env_origins + [
    "https://lyfters-badge-app.vercel.app",
    "https://lyfters-badge-psgwxf1jw-lyfter-s-projects2.vercel.app",
]
CORS(app, origins=_cors_origins, supports_credentials=True,
     allow_headers=["Content-Type", "Authorization", "X-Workspace-Id"],
     expose_headers=["Authorization"],
     methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"])

# ──────────────────────────────────────────────
# BLUEPRINTS
# ──────────────────────────────────────────────
app.register_blueprint(auth_bp,        url_prefix="/auth")
app.register_blueprint(events_bp,      url_prefix="/events")
app.register_blueprint(leaderboard_bp)
app.register_blueprint(admin_bp,       url_prefix="/admin")
app.register_blueprint(redeem_bp,      url_prefix="/redeem")
app.register_blueprint(xp_bp,          url_prefix="/profile")
app.register_blueprint(ws_bp,          url_prefix="/workspaces")
app.register_blueprint(reports_bp,     url_prefix="/reports")

# Capa de seguridad (ProxyFix + rate limiting + IP guard).
# No hace nada si FLASK_ENV=development.
init_security(app)


# ──────────────────────────────────────────────
# INDEX
# ──────────────────────────────────────────────

@app.route("/", methods=["GET"])
def index():
    return redirect("https://liangso420-cell.github.io/Lyfters-Badge-App/", code=302)


# ──────────────────────────────────────────────
# HEALTHCHECK
# ──────────────────────────────────────────────

@app.route("/health", methods=["GET"])
def health():
    return jsonify(status="ok", service="lyfter-badge-api"), 200


if __name__ == "__main__":
    port  = int(os.getenv("PORT", 5000))
    debug = os.getenv("FLASK_ENV") == "development"
    app.run(host="0.0.0.0", port=port, debug=debug)

# backend/app.py — Lyfter Badge App

import os
import re
from datetime import timedelta

from dotenv import load_dotenv
from flask import Flask, jsonify, redirect
from flask_cors import CORS
from flask_jwt_extended import JWTManager

from db import init_indexes
from routes.auth import auth_bp
from routes.events import events_bp, leaderboard_bp
from routes.admin import admin_bp
from routes.redeem import redeem_bp

load_dotenv()

app = Flask(__name__)
app.config["JWT_SECRET_KEY"] = os.getenv("JWT_SECRET", "dev_secret_cambia_esto")
app.config["JWT_ACCESS_TOKEN_EXPIRES"] = timedelta(hours=8)

jwt = JWTManager(app)
init_indexes()

_env_origins = [
    o.strip() for o in os.getenv(
        "CORS_ORIGINS",
        "http://localhost:5500,http://127.0.0.1:5500"
    ).split(",") if o.strip()
]
# Also accept any *.vercel.app URL (preview and production deployments)
_cors_origins = _env_origins + [re.compile(r"^https://[a-zA-Z0-9][a-zA-Z0-9\-]*\.vercel\.app$")]
CORS(app, origins=_cors_origins, supports_credentials=True,
     methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"])

# ──────────────────────────────────────────────
# BLUEPRINTS
# ──────────────────────────────────────────────
app.register_blueprint(auth_bp,        url_prefix="/auth")
app.register_blueprint(events_bp,      url_prefix="/events")
app.register_blueprint(leaderboard_bp)
app.register_blueprint(admin_bp,       url_prefix="/admin")
app.register_blueprint(redeem_bp,      url_prefix="/redeem")


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

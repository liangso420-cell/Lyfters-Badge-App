# backend/app.py — Lyfter Badge App

import os
import re
from datetime import timedelta

from dotenv import load_dotenv
from flask import Flask, jsonify, redirect
from flask_cors import CORS
<<<<<<< HEAD
from flask_jwt_extended import JWTManager
=======
from werkzeug.middleware.proxy_fix import ProxyFix
from flask_jwt_extended import (
    JWTManager, create_access_token,
    jwt_required, get_jwt_identity
)
from google.oauth2 import id_token
from google.auth.transport import requests as grequests
>>>>>>> 4b4917e (Arreglar error login admin)

from db import init_indexes
from routes.auth import auth_bp
from routes.events import events_bp, leaderboard_bp
from routes.admin import admin_bp
from routes.redeem import redeem_bp
from security import init_security

load_dotenv()

app = Flask(__name__)

# Render sirve la app detrás de UN solo proxy (su load balancer/edge).
# ProxyFix con x_for=1 hace que request.remote_addr sea el último hop de
# X-Forwarded-For (el que añade el proxy de confianza = IP real del cliente),
# en vez de la IP del proxy. Confiamos en exactamente 1 proxy para que un
# cliente no pueda falsear su IP inyectando hops extra en X-Forwarded-For.
app.wsgi_app = ProxyFix(app.wsgi_app, x_for=1, x_proto=1, x_host=1)

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

<<<<<<< HEAD
# Capa de seguridad (ProxyFix + rate limiting + IP guard).
# No hace nada si FLASK_ENV=development.
init_security(app)
=======

def client_ip():
    # Gracias a ProxyFix(x_for=1), request.remote_addr ya es la IP real del
    # cliente (el hop de confianza que añade el proxy de Render), no la del
    # proxy ni un valor falseable. No parseamos X-Forwarded-For a mano porque
    # su primer hop es controlable por el cliente y permitiría spoofing.
    return request.remote_addr or "unknown"


def rate_limit_key(email):
    # Llave combinada IP + email: cada IP tiene su propio contador
    # independiente, así una IP no bloquea a otras para el mismo email.
    return f"{client_ip()}:{email}"


def check_rate_limit(email):
    key = rate_limit_key(email)
    now = datetime.utcnow()
    cutoff = now - timedelta(minutes=5)
    _login_attempts[key] = [t for t in _login_attempts[key] if t > cutoff]
    return len(_login_attempts[key]) < 5


def record_failed_attempt(email):
    _login_attempts[rate_limit_key(email)].append(datetime.utcnow())


def clear_attempts(email):
    _login_attempts.pop(rate_limit_key(email), None)


# ──────────────────────────────────────────────
# HELPERS
# ──────────────────────────────────────────────

def valid_oid(s):
    try:
        return ObjectId(s)
    except (InvalidId, TypeError):
        return None


def generate_qr_base64(data: str) -> str:
    img = qrcode.make(data)
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    return "data:image/png;base64," + base64.b64encode(buf.getvalue()).decode()


def require_admin():
    uid = get_jwt_identity()
    user = users().find_one({"_id": ObjectId(uid)})
    if not user or user.get("role") != "admin":
        return None
    return user


def sanitize(s, max_len=100):
    return str(s or "").strip()[:max_len]


# ── Serializadores ──────────────────────────

def fmt_user(doc):
    created = doc.get("created_at")
    return {
        "id":         str(doc["_id"]),
        "nombre":     doc.get("name", ""),
        "email":      doc.get("email", ""),
        "rol":        doc.get("role", "participant"),
        "created_at": created.isoformat() if created else None,
    }


def compute_event_status(doc):
    manual_status = doc.get("status", None)
    if manual_status in ("draft", "pending", "cancelled", "postponed", "archived", "paused"):
        return manual_status
    now = datetime.utcnow()
    start = doc.get("start_date")
    end = doc.get("end_date")
    if start and end:
        if now < start:
            return "upcoming"
        elif start <= now <= end:
            return "ongoing"
        elif now > end:
            return "finished"
    return manual_status or "draft"


def fmt_event(doc):
    return {
        "id":           str(doc["_id"]),
        "nombre":       doc.get("title", ""),
        "descripcion":  doc.get("description", ""),
        "description":  doc.get("description", ""),
        "fecha_inicio": doc.get("start_date", datetime.utcnow()).isoformat(),
        "fecha_fin":    doc.get("end_date",   datetime.utcnow()).isoformat(),
        "premio":       doc.get("prize", ""),
        "activo":       doc.get("active", True),
        "status":       compute_event_status(doc),
        "photo":        doc.get("photo", None),
        "access_qr":    doc.get("access_qr", None),
        "tags":         doc.get("tags", []),
        "location":     doc.get("location", ""),
    }


def fmt_badge(doc, obtenido=False, scanned_at=None):
    return {
        "id":          str(doc["_id"]),
        "icon":        doc.get("icon", "🏅"),
        "nombre":      doc.get("name", ""),
        "descripcion": doc.get("description", ""),
        "obtenido":    obtenido,
        "scanned_at":  scanned_at.isoformat() if scanned_at else None,
    }


def fmt_admin_badge(doc, canjeados=0, base_url=""):
    event_id = str(doc.get("event_id", ""))
    token    = doc.get("token", "")
    return {
        "id":          str(doc["_id"]),
        "icon":        doc.get("icon", "🏅"),
        "nombre":      doc.get("name", ""),
        "descripcion": doc.get("description", ""),
        "token":       token,
        "redeem_url":  f"{base_url}/redeem.html?event={event_id}&token={token}",
        "canjeados":   canjeados,
        "qr_image":    doc.get("qr_base64", None),
    }
>>>>>>> 4b4917e (Arreglar error login admin)


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

"""Entrada principal de la API Flask — Lyfter Badge App."""
from flask import Flask, jsonify
from flask_cors import CORS

from config import config
from db import ensure_indexes
from routes.auth import auth_bp
from routes.events import events_bp
from routes.admin import admin_bp
from routes.redeem import redeem_bp


def create_app():
    app = Flask(__name__)

    CORS(app, resources={r"/*": {"origins": config.CORS_ORIGINS}})

    # Índices de MongoDB (idempotente)
    try:
        ensure_indexes()
    except Exception as exc:  # no impedir el arranque si Atlas tarda
        app.logger.warning("No se pudieron crear los índices: %s", exc)

    # Blueprints
    app.register_blueprint(auth_bp)
    app.register_blueprint(events_bp)
    app.register_blueprint(admin_bp)
    app.register_blueprint(redeem_bp)

    @app.route("/")
    def health():
        return jsonify({"status": "ok", "service": "lyfter-badge-app"}), 200

    # Manejo de errores global → respuestas JSON claras
    @app.errorhandler(404)
    def not_found(_):
        return jsonify({"error": "Recurso no encontrado"}), 404

    @app.errorhandler(405)
    def method_not_allowed(_):
        return jsonify({"error": "Método no permitido"}), 405

    @app.errorhandler(500)
    def server_error(_):
        return jsonify({"error": "Error interno del servidor"}), 500

    return app


app = create_app()

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=config.PORT, debug=True)

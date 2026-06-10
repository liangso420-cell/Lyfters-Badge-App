"""Rutas de autenticación: registro y login."""
import re

from flask import Blueprint, request, jsonify
from pymongo.errors import DuplicateKeyError

from models.user import create_user, find_by_email, verify_password, public_user
from middleware.auth_guard import generate_token

auth_bp = Blueprint("auth", __name__, url_prefix="/auth")

EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")


@auth_bp.route("/register", methods=["POST"])
def register():
    data = request.get_json(silent=True) or {}
    nombre = (data.get("nombre") or "").strip()
    email = (data.get("email") or "").strip().lower()
    password = data.get("password") or ""

    if not nombre or not email or not password:
        return jsonify({"error": "Nombre, email y contraseña son obligatorios"}), 400
    if not EMAIL_RE.match(email):
        return jsonify({"error": "Email inválido"}), 400
    if len(password) < 6:
        return jsonify({"error": "La contraseña debe tener al menos 6 caracteres"}), 400

    # El registro público siempre crea participantes
    try:
        user = create_user(nombre, email, password, rol="participante")
    except DuplicateKeyError:
        return jsonify({"error": "Ese email ya está registrado"}), 409

    token = generate_token(user)
    return jsonify({"token": token, "user": public_user(user)}), 201


@auth_bp.route("/login", methods=["POST"])
def login():
    data = request.get_json(silent=True) or {}
    email = (data.get("email") or "").strip().lower()
    password = data.get("password") or ""

    if not email or not password:
        return jsonify({"error": "Email y contraseña son obligatorios"}), 400

    user = find_by_email(email)
    if not user or not verify_password(user, password):
        return jsonify({"error": "Credenciales incorrectas"}), 401

    token = generate_token(user)
    return jsonify({"token": token, "user": public_user(user)}), 200

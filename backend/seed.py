"""Carga datos de prueba: un admin, un evento y varios badges con QR.

Uso (con el .env configurado y dependencias instaladas):
    python seed.py
"""
from datetime import datetime, timezone, timedelta

from db import users, ensure_indexes
from models.user import create_user, find_by_email
from models.event import create_event
from models.badge import create_badge
from utils.qr import redeem_url, generate_qr_base64
from db import badges as badges_col

ADMIN_EMAIL = "admin@lyfter.cc"
ADMIN_PASS = "admin123"

BADGES = [
    ("🚀", "Bienvenida", "Check-in en recepción"),
    ("🎤", "Keynote", "Asististe a la charla principal"),
    ("☕", "Networking", "Participaste en el coffee break"),
    ("💡", "Workshop", "Completaste un taller"),
    ("🏗️", "Demo", "Visitaste la zona de demos"),
    ("🍕", "Almuerzo", "Compartiste el almuerzo"),
    ("🎁", "Stand", "Pasaste por un stand patrocinador"),
    ("🌟", "Cierre", "Te quedaste hasta el cierre"),
]


def run():
    ensure_indexes()

    admin = find_by_email(ADMIN_EMAIL)
    if not admin:
        admin = create_user("Admin Lyfter", ADMIN_EMAIL, ADMIN_PASS, rol="admin")
        print(f"✅ Admin creado: {ADMIN_EMAIL} / {ADMIN_PASS}")
    else:
        print(f"ℹ️  Admin ya existía: {ADMIN_EMAIL}")

    now = datetime.now(timezone.utc)
    event = create_event(
        nombre="Lyfter Summit 2026",
        descripcion="Evento de demostración con badges coleccionables.",
        fecha_inicio=now,
        fecha_fin=now + timedelta(days=30),
        premio="Entrada VIP al after-party",
        admin_id=str(admin["_id"]),
    )
    event_id = str(event["_id"])
    print(f"✅ Evento creado: {event['nombre']} ({event_id})")

    for icon, nombre, desc in BADGES:
        badge = create_badge(event_id, nombre, desc, qr_image="", icon=icon)
        url = redeem_url(event_id, badge["token"])
        qr = generate_qr_base64(url)
        badges_col.update_one({"_id": badge["_id"]}, {"$set": {"qr_image": qr}})
        print(f"   🏅 {icon} {nombre} → {url}")

    print("\n✅ Datos de prueba cargados.")


if __name__ == "__main__":
    run()

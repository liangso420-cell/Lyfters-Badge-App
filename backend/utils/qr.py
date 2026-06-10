"""Generación de imágenes QR como data URI base64 (PNG)."""
import base64
from io import BytesIO

import qrcode

from config import config


def redeem_url(event_id, token):
    """URL pública (frontend) a la que apunta el QR físico."""
    return f"{config.FRONTEND_URL}/redeem/{event_id}/{token}"


def generate_qr_base64(data):
    """Genera un PNG del QR y lo devuelve como data URI base64 listo para <img src>."""
    qr = qrcode.QRCode(
        version=None,
        error_correction=qrcode.constants.ERROR_CORRECT_M,
        box_size=10,
        border=2,
    )
    qr.add_data(data)
    qr.make(fit=True)
    img = qr.make_image(fill_color="black", back_color="white")

    buffer = BytesIO()
    img.save(buffer, format="PNG")
    encoded = base64.b64encode(buffer.getvalue()).decode("ascii")
    return f"data:image/png;base64,{encoded}"

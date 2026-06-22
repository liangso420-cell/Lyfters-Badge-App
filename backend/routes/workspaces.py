from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required, get_jwt_identity, get_jwt
from bson import ObjectId
from datetime import datetime, timezone, timedelta
import bcrypt, uuid, os

from db import workspaces, workspace_members, users, invitations, events, badges, scans
from workspace_utils import (
    get_user_workspace, generate_invite_code, slugify, workspace_filter
)

ws_bp = Blueprint("workspaces", __name__)


def _ws_to_dict(ws):
    return {
        "id":         str(ws["_id"]),
        "name":       ws.get("name"),
        "slug":       ws.get("slug"),
        "logo_url":   ws.get("logo_url"),
        "plan":       ws.get("plan", "free"),
        "active":     ws.get("active", True),
        "created_at": ws.get("created_at", "").isoformat() if ws.get("created_at") else None,
    }


def _member_to_dict(m, user_doc=None):
    d = {
        "user_id":   str(m["user_id"]),
        "role":      m.get("role"),
        "joined_at": m.get("joined_at", "").isoformat() if m.get("joined_at") else None,
    }
    if user_doc:
        d["name"]  = user_doc.get("name")
        d["email"] = user_doc.get("email")
    return d


# ── GET /workspaces/mine ──────────────────────────────────────
@ws_bp.route("/mine", methods=["GET"])
@jwt_required()
def get_my_workspace():
    uid = ObjectId(get_jwt_identity())
    member = workspace_members().find_one({"user_id": uid})
    if not member:
        return jsonify(error="No pertenecés a ningún workspace"), 404
    ws = workspaces().find_one({"_id": member["workspace_id"]})
    if not ws:
        return jsonify(error="Workspace no encontrado"), 404
    result = _ws_to_dict(ws)
    result["my_role"] = member["role"]
    return jsonify(result)


# ── POST /workspaces/creation-code  (solo god_admin) ─────────
@ws_bp.route("/creation-code", methods=["POST"])
@jwt_required()
def generate_creation_code():
    claims = get_jwt()
    if claims.get("role") != "god_admin":
        return jsonify(error="Solo god_admin puede generar códigos de creación"), 403

    code = generate_invite_code(10)
    while invitations().find_one({"code": code}):
        code = generate_invite_code(10)

    expires = datetime.now(timezone.utc) + timedelta(days=30)
    inv_id  = ObjectId()
    invitations().insert_one({
        "_id":        inv_id,
        "type":       "ws_creation",
        "code":       code,
        "created_by": ObjectId(get_jwt_identity()),
        "created_at": datetime.now(timezone.utc),
        "expires_at": expires,
        "status":     "pending",
    })
    return jsonify(code=code, expires_at=expires.isoformat()), 201


# ── POST /workspaces/ ─────────────────────────────────────────
@ws_bp.route("/", methods=["POST"])
@jwt_required()
def create_workspace():
    claims = get_jwt()
    role   = claims.get("role", "")
    uid    = ObjectId(get_jwt_identity())

    if role not in ("superadmin", "god_admin", "admin"):
        return jsonify(error="Solo admins pueden crear workspaces"), 403

    data = request.get_json() or {}
    name = (data.get("name") or "").strip()
    if not name or len(name) < 2:
        return jsonify(error="El nombre del workspace es requerido"), 400

    # No-god_admin debe presentar un código de creación válido
    if role != "god_admin":
        raw_code = (data.get("creation_code") or "").strip().upper()
        if not raw_code:
            return jsonify(error="Se requiere un código de creación emitido por god_admin"), 400
        inv = invitations().find_one({
            "type":   "ws_creation",
            "code":   raw_code,
            "status": "pending",
            "expires_at": {"$gt": datetime.now(timezone.utc)},
        })
        if not inv:
            return jsonify(error="Código de creación inválido o expirado"), 400
        # Marcar usado
        invitations().update_one({"_id": inv["_id"]}, {"$set": {"status": "used"}})

    slug = slugify(name)
    base_slug = slug
    i = 1
    while workspaces().find_one({"slug": slug}):
        slug = f"{base_slug}-{i}"; i += 1

    ws_id = ObjectId()
    workspaces().insert_one({
        "_id":        ws_id,
        "name":       name,
        "slug":       slug,
        "logo_url":   data.get("logo_url"),
        "owner_id":   uid,
        "plan":       "free",
        "active":     True,
        "created_at": datetime.now(timezone.utc),
    })

    workspace_members().insert_one({
        "workspace_id": ws_id,
        "user_id":      uid,
        "role":         "superadmin",
        "joined_at":    datetime.now(timezone.utc),
    })

    ws = workspaces().find_one({"_id": ws_id})
    return jsonify(_ws_to_dict(ws)), 201


# ── GET /workspaces/ — solo god_admin ────────────────────────
@ws_bp.route("/", methods=["GET"])
@jwt_required()
def list_workspaces():
    claims = get_jwt()
    if claims.get("role") != "god_admin":
        return jsonify(error="Solo god_admin puede listar todos los workspaces"), 403
    ws_list = list(workspaces().find({}).sort("created_at", -1))
    result = []
    for ws in ws_list:
        d = _ws_to_dict(ws)
        d["member_count"] = workspace_members().count_documents({"workspace_id": ws["_id"]})
        d["event_count"]  = events().count_documents({"workspace_id": ws["_id"]})
        result.append(d)
    return jsonify(result)


# ── PATCH /workspaces/<ws_id> ─────────────────────────────────
@ws_bp.route("/<ws_id>", methods=["PATCH"])
@jwt_required()
def update_workspace(ws_id):
    claims = get_jwt()
    uid    = ObjectId(get_jwt_identity())
    role   = claims.get("role", "")

    ws = workspaces().find_one({"_id": ObjectId(ws_id)})
    if not ws:
        return jsonify(error="Workspace no encontrado"), 404

    if role != "god_admin":
        member = workspace_members().find_one({"workspace_id": ObjectId(ws_id), "user_id": uid})
        if not member or member["role"] not in ("superadmin",):
            return jsonify(error="No autorizado"), 403

    data   = request.get_json() or {}
    update = {}
    if "name"     in data: update["name"]     = data["name"].strip()
    if "logo_url" in data: update["logo_url"] = data["logo_url"]
    if "active"   in data and role == "god_admin": update["active"] = bool(data["active"])

    if update:
        workspaces().update_one({"_id": ObjectId(ws_id)}, {"$set": update})

    ws = workspaces().find_one({"_id": ObjectId(ws_id)})
    return jsonify(_ws_to_dict(ws))


# ── DELETE /workspaces/<ws_id> — solo god_admin ───────────────
@ws_bp.route("/<ws_id>", methods=["DELETE"])
@jwt_required()
def delete_workspace(ws_id):
    claims = get_jwt()
    if claims.get("role") != "god_admin":
        return jsonify(error="Solo god_admin puede eliminar workspaces"), 403
    oid = ObjectId(ws_id)
    workspaces().delete_one({"_id": oid})
    workspace_members().delete_many({"workspace_id": oid})
    return jsonify(mensaje="Workspace eliminado")


# ── GET /workspaces/<ws_id>/members ───────────────────────────
@ws_bp.route("/<ws_id>/members", methods=["GET"])
@jwt_required()
def list_members(ws_id):
    claims = get_jwt()
    uid    = ObjectId(get_jwt_identity())
    oid    = ObjectId(ws_id)

    if claims.get("role") != "god_admin":
        member = workspace_members().find_one({"workspace_id": oid, "user_id": uid})
        if not member or member["role"] not in ("superadmin", "admin"):
            return jsonify(error="No autorizado"), 403

    members = list(workspace_members().find({"workspace_id": oid}))
    result = []
    for m in members:
        user_doc = users().find_one({"_id": m["user_id"]}, {"password_hash": 0})
        result.append(_member_to_dict(m, user_doc))
    return jsonify(result)


_ROLE_RANK = {"participant": 1, "admin": 2, "superadmin": 3, "god_admin": 4}


# ── PATCH /workspaces/<ws_id>/members/<uid> ───────────────────
@ws_bp.route("/<ws_id>/members/<uid>", methods=["PATCH"])
@jwt_required()
def update_member_role(ws_id, uid):
    claims      = get_jwt()
    caller_uid  = ObjectId(get_jwt_identity())
    caller_role = claims.get("role", "")
    oid         = ObjectId(ws_id)
    target_uid  = ObjectId(uid)

    if caller_role != "god_admin":
        caller_member = workspace_members().find_one({"workspace_id": oid, "user_id": caller_uid})
        if not caller_member or caller_member["role"] not in ("superadmin", "admin"):
            return jsonify(error="No autorizado"), 403
        caller_ws_role = caller_member["role"]
    else:
        caller_ws_role = "god_admin"

    # No se puede modificar a alguien de igual o mayor rango
    target_member = workspace_members().find_one({"workspace_id": oid, "user_id": target_uid})
    if not target_member:
        return jsonify(error="Miembro no encontrado"), 404

    target_rank = _ROLE_RANK.get(target_member["role"], 0)
    caller_rank = _ROLE_RANK.get(caller_ws_role, 0)
    if target_rank >= caller_rank:
        return jsonify(error="No podés modificar a un usuario con igual o mayor rango que el tuyo"), 403

    data     = request.get_json() or {}
    new_role = data.get("role")
    allowed  = ("admin", "participant", "superadmin") if caller_ws_role == "god_admin" else ("participant",) if caller_ws_role == "admin" else ("admin", "participant")
    if new_role not in allowed:
        return jsonify(error=f"No tenés permiso para asignar el rol '{new_role}'"), 403

    # Tampoco puede asignar un rango mayor o igual al suyo
    if _ROLE_RANK.get(new_role, 0) >= caller_rank:
        return jsonify(error="No podés asignar un rol mayor o igual al tuyo"), 403

    workspace_members().update_one(
        {"workspace_id": oid, "user_id": target_uid},
        {"$set": {"role": new_role}}
    )
    return jsonify(mensaje="Rol actualizado")


# ── DELETE /workspaces/<ws_id>/members/<uid> ──────────────────
@ws_bp.route("/<ws_id>/members/<uid>", methods=["DELETE"])
@jwt_required()
def remove_member(ws_id, uid):
    claims      = get_jwt()
    caller_uid  = ObjectId(get_jwt_identity())
    caller_role = claims.get("role", "")
    oid         = ObjectId(ws_id)
    target_uid  = ObjectId(uid)

    if caller_role != "god_admin":
        caller_member = workspace_members().find_one({"workspace_id": oid, "user_id": caller_uid})
        if not caller_member or caller_member["role"] not in ("superadmin",):
            return jsonify(error="No autorizado"), 403
        caller_ws_role = caller_member["role"]
    else:
        caller_ws_role = "god_admin"

    target_member = workspace_members().find_one({"workspace_id": oid, "user_id": target_uid})
    if target_member:
        target_rank = _ROLE_RANK.get(target_member["role"], 0)
        caller_rank = _ROLE_RANK.get(caller_ws_role, 0)
        if target_rank >= caller_rank:
            return jsonify(error="No podés remover a un usuario con igual o mayor rango"), 403

    workspace_members().delete_one({"workspace_id": oid, "user_id": target_uid})
    return jsonify(mensaje="Miembro removido")


# ── POST /workspaces/<ws_id>/invite ───────────────────────────
@ws_bp.route("/<ws_id>/invite", methods=["POST"])
@jwt_required()
def invite_member(ws_id):
    claims = get_jwt()
    caller = ObjectId(get_jwt_identity())
    oid    = ObjectId(ws_id)

    caller_role = claims.get("role", "")
    caller_ws_role = caller_role  # default for god_admin

    if caller_role != "god_admin":
        member = workspace_members().find_one({"workspace_id": oid, "user_id": caller})
        if not member or member["role"] not in ("superadmin", "admin"):
            return jsonify(error="No autorizado"), 403
        caller_ws_role = member["role"]

    data   = request.get_json() or {}
    email  = (data.get("email") or "").strip().lower() or None
    role   = data.get("role", "participant")
    method = data.get("method", "code")

    if role not in ("admin", "participant"):
        return jsonify(error="Rol inválido"), 400

    # Solo superadmin y god_admin pueden invitar como admin
    if role == "admin" and _ROLE_RANK.get(caller_ws_role, 0) < 3:
        return jsonify(error="Solo superadmin o god_admin pueden invitar como admin"), 403

    expires = datetime.now(timezone.utc) + timedelta(days=7)
    code    = generate_invite_code()
    token   = str(uuid.uuid4())

    while invitations().find_one({"code": code}):
        code = generate_invite_code()

    inv_id = ObjectId()
    invitations().insert_one({
        "_id":          inv_id,
        "workspace_id": oid,
        "invited_by":   caller,
        "email":        email,
        "code":         code,
        "token":        token,
        "role":         role,
        "status":       "pending",
        "expires_at":   expires,
        "created_at":   datetime.now(timezone.utc),
    })

    ws = workspaces().find_one({"_id": oid})
    ws_name = ws["name"] if ws else "Lyfter"

    result = {
        "id":         str(inv_id),
        "code":       code,
        "role":       role,
        "expires_at": expires.isoformat(),
    }

    if method == "email" and email:
        try:
            _send_invite_email(email, ws_name, token, code, role)
            result["email_sent"] = True
            result["email"]      = email
        except Exception as e:
            result["email_sent"]  = False
            result["email_error"] = str(e)

    result["invite_link"] = f"{os.getenv('APP_BASE_URL', '')}/join.html?token={token}"
    return jsonify(result), 201


def _send_invite_email(to_email, ws_name, token, code, role):
    base_url = os.getenv("APP_BASE_URL", "https://lyfters-badge-app.onrender.com")
    link = f"{base_url}/join.html?token={token}"

    sendgrid_key = os.getenv("SENDGRID_API_KEY")
    if sendgrid_key:
        import urllib.request, json as jsonlib
        payload = {
            "personalizations": [{"to": [{"email": to_email}]}],
            "from": {"email": os.getenv("FROM_EMAIL", "noreply@lyfter.app"), "name": "Lyfter"},
            "subject": f"Te invitaron a {ws_name} en Lyfter Badge App",
            "content": [{"type": "text/html", "value": f"""
                <h2>Fuiste invitado a {ws_name}</h2>
                <p>Tu rol: <strong>{role}</strong></p>
                <p><a href="{link}" style="background:#e68a8d;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:700;">Aceptar invitación</a></p>
                <p>O usá el código: <strong style="font-size:20px;letter-spacing:2px;">{code}</strong></p>
                <p style="color:#999;font-size:12px;">Este link expira en 7 días.</p>
            """}]
        }
        req = urllib.request.Request(
            "https://api.sendgrid.com/v3/mail/send",
            data=jsonlib.dumps(payload).encode(),
            headers={"Authorization": f"Bearer {sendgrid_key}", "Content-Type": "application/json"},
            method="POST"
        )
        urllib.request.urlopen(req)
    else:
        raise Exception("SENDGRID_API_KEY no configurado")


# ── POST /workspaces/join ─────────────────────────────────────
@ws_bp.route("/join", methods=["POST"])
@jwt_required()
def join_workspace():
    uid  = ObjectId(get_jwt_identity())
    data = request.get_json() or {}
    code  = (data.get("code")  or "").strip().upper() or None
    token = (data.get("token") or "").strip() or None

    if not code and not token:
        return jsonify(error="Se requiere código o token de invitación"), 400

    query = {"status": "pending"}
    if code:  query["code"]  = code
    if token: query["token"] = token

    inv = invitations().find_one(query)
    if not inv or inv.get("type") == "ws_creation":
        return jsonify(error="Código o link inválido o ya usado"), 404

    inv_expires = inv["expires_at"]
    if inv_expires.tzinfo is None:
        inv_expires = inv_expires.replace(tzinfo=timezone.utc)
    if inv_expires < datetime.now(timezone.utc):
        invitations().update_one({"_id": inv["_id"]}, {"$set": {"status": "expired"}})
        return jsonify(error="La invitación expiró"), 410

    ws_id = inv["workspace_id"]

    existing = workspace_members().find_one({"workspace_id": ws_id, "user_id": uid})
    if existing:
        return jsonify(error="Ya sos miembro de este workspace"), 409

    workspace_members().insert_one({
        "workspace_id": ws_id,
        "user_id":      uid,
        "role":         inv["role"],
        "joined_at":    datetime.now(timezone.utc),
    })

    invitations().update_one({"_id": inv["_id"]}, {"$set": {"status": "accepted"}})

    ws = workspaces().find_one({"_id": ws_id})
    return jsonify({
        "mensaje":      "Te uniste al workspace",
        "workspace_id": str(ws_id),
        "workspace":    ws["name"] if ws else "",
        "role":         inv["role"],
    })


# ── POST /workspaces/grant-god-admin  (solo god_admin) ───────
@ws_bp.route("/grant-god-admin", methods=["POST"])
@jwt_required()
def grant_god_admin():
    claims = get_jwt()
    if claims.get("role") != "god_admin":
        return jsonify(error="Solo god_admin puede otorgar este rol"), 403

    data  = request.get_json() or {}
    email = (data.get("email") or "").strip().lower()
    if not email:
        return jsonify(error="Email requerido"), 400

    target = users().find_one({"email": email})
    if not target:
        return jsonify(error="Usuario no encontrado"), 404

    users().update_one({"_id": target["_id"]}, {"$set": {"role": "god_admin"}})
    return jsonify(ok=True, name=target.get("name", ""), email=email)


# ── GET /workspaces/<ws_id>/invitations ───────────────────────
@ws_bp.route("/<ws_id>/invitations", methods=["GET"])
@jwt_required()
def list_invitations(ws_id):
    claims = get_jwt()
    caller = ObjectId(get_jwt_identity())
    oid    = ObjectId(ws_id)

    if claims.get("role") != "god_admin":
        member = workspace_members().find_one({"workspace_id": oid, "user_id": caller})
        if not member or member["role"] not in ("superadmin", "admin"):
            return jsonify(error="No autorizado"), 403

    invs = list(invitations().find({"workspace_id": oid}).sort("created_at", -1))
    return jsonify([{
        "id":         str(i["_id"]),
        "email":      i.get("email"),
        "code":       i.get("code"),
        "role":       i.get("role"),
        "status":     i.get("status"),
        "expires_at": i["expires_at"].isoformat() if i.get("expires_at") else None,
    } for i in invs])


# ── GET /workspaces/platform/users  (god_admin) ───────────────
@ws_bp.route("/platform/users", methods=["GET"])
@jwt_required()
def list_platform_users():
    claims = get_jwt()
    if claims.get("role") != "god_admin":
        return jsonify(error="Solo god_admin puede acceder"), 403

    now = datetime.utcnow()
    result = []
    for u in users().find({}, {"password_hash": 0, "reset_token": 0, "reset_token_expiry": 0}):
        bu = u.get("banned_until")
        if bu and getattr(bu, "tzinfo", None) is not None:
            bu = bu.replace(tzinfo=None)
        active_ban = bool(bu and bu > now)
        result.append({
            "id":            str(u["_id"]),
            "name":          u.get("name", ""),
            "email":         u.get("email", ""),
            "role":          u.get("role", "participant"),
            "created_at":    u["created_at"].isoformat() if u.get("created_at") else None,
            "banned":        active_ban,
            "banned_until":  bu.isoformat() if bu else None,
            "ban_permanent": active_ban and bu and bu.year >= 9999,
            "ban_ip":        u.get("ban_ip"),
            "ban_reason":    u.get("ban_reason", ""),
            "last_login_ip": u.get("last_login_ip"),
        })
    return jsonify(result)


# ── POST /workspaces/platform/users/<user_id>/ban  (god_admin) ─
@ws_bp.route("/platform/users/<user_id>/ban", methods=["POST"])
@jwt_required()
def ban_platform_user(user_id):
    claims = get_jwt()
    if claims.get("role") != "god_admin":
        return jsonify(error="Solo god_admin puede banear usuarios"), 403

    caller_id = ObjectId(get_jwt_identity())
    try:
        target_uid = ObjectId(user_id)
    except Exception:
        return jsonify(error="ID inválido"), 400

    if target_uid == caller_id:
        return jsonify(error="No podés banearte a vos mismo"), 400

    target = users().find_one({"_id": target_uid})
    if not target:
        return jsonify(error="Usuario no encontrado"), 404
    if target.get("role") == "god_admin":
        return jsonify(error="No podés banear a otro god_admin"), 403

    data           = request.get_json() or {}
    duration_hours = data.get("duration_hours")
    ban_scope      = data.get("ban_scope", "account")
    reason         = (data.get("reason") or "").strip()[:500]

    if duration_hours is not None:
        try:
            duration_hours = int(duration_hours)
            if duration_hours <= 0:
                return jsonify(error="La duración debe ser positiva"), 400
            banned_until = datetime.utcnow() + timedelta(hours=duration_hours)
        except (ValueError, TypeError):
            return jsonify(error="Duración inválida"), 400
    else:
        banned_until = datetime(9999, 12, 31, 23, 59, 59)

    update = {
        "banned_until": banned_until,
        "ban_reason":   reason,
        "banned_by":    caller_id,
        "banned_at":    datetime.utcnow(),
        "ban_ip":       None,
    }
    if ban_scope == "account_ip":
        last_ip = target.get("last_login_ip")
        if last_ip:
            update["ban_ip"] = last_ip

    users().update_one({"_id": target_uid}, {"$set": update})
    return jsonify(ok=True, banned_until=banned_until.isoformat(), ban_ip=update.get("ban_ip"))


# ── POST /workspaces/platform/users/<user_id>/unban  (god_admin) ─
@ws_bp.route("/platform/users/<user_id>/unban", methods=["POST"])
@jwt_required()
def unban_platform_user(user_id):
    claims = get_jwt()
    if claims.get("role") != "god_admin":
        return jsonify(error="Solo god_admin puede desbanear usuarios"), 403
    try:
        target_uid = ObjectId(user_id)
    except Exception:
        return jsonify(error="ID inválido"), 400

    if not users().find_one({"_id": target_uid}):
        return jsonify(error="Usuario no encontrado"), 404

    users().update_one(
        {"_id": target_uid},
        {"$unset": {"banned_until": "", "ban_ip": "", "ban_reason": "", "banned_by": "", "banned_at": ""}},
    )
    return jsonify(ok=True)


# ── DELETE /workspaces/platform/users/<user_id>  (god_admin) ──
@ws_bp.route("/platform/users/<user_id>", methods=["DELETE"])
@jwt_required()
def delete_platform_user(user_id):
    claims = get_jwt()
    if claims.get("role") != "god_admin":
        return jsonify(error="Solo god_admin puede eliminar usuarios"), 403

    caller_id = ObjectId(get_jwt_identity())
    try:
        target_uid = ObjectId(user_id)
    except Exception:
        return jsonify(error="ID inválido"), 400

    if target_uid == caller_id:
        return jsonify(error="No podés eliminar tu propia cuenta"), 400

    target = users().find_one({"_id": target_uid})
    if not target:
        return jsonify(error="Usuario no encontrado"), 404
    if target.get("role") == "god_admin":
        return jsonify(error="No podés eliminar a otro god_admin"), 403

    users().delete_one({"_id": target_uid})
    workspace_members().delete_many({"user_id": target_uid})
    scans().delete_many({"user_id": target_uid})
    return jsonify(ok=True)

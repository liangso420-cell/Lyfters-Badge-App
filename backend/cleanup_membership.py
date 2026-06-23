"""
One-time script: remove prueba@gmail.com from the Lyfter workspace.
Run with: python cleanup_membership.py
"""
from db import workspace_members, users, workspaces

lyfter_ws   = workspaces().find_one({"slug": "lyfter"})
prueba_user = users().find_one({"email": "prueba@gmail.com"})

if not lyfter_ws:
    print("ERROR: workspace 'lyfter' no encontrado")
elif not prueba_user:
    print("ERROR: usuario prueba@gmail.com no encontrado")
else:
    result = workspace_members().delete_one({
        "workspace_id": lyfter_ws["_id"],
        "user_id":      prueba_user["_id"],
    })
    print(f"Membresía eliminada: {result.deleted_count} documento(s)")

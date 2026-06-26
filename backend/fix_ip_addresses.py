import os, sys
sys.path.insert(0, '.')
from dotenv import load_dotenv
load_dotenv()
from db import get_db, users

db = get_db()

# Limpiar ip_address e last_ip que sean IPs privadas/proxy
# Las IPs privadas empiezan con: 10., 172.16-31., 192.168., 127.
import re
private_pattern = re.compile(
    r'^(10\.|172\.(1[6-9]|2\d|3[01])\.|192\.168\.|127\.|0\.0\.0\.0)'
)

result = users().update_many(
    {"ip_address": {"$regex": "^(10\\.|172\\.(1[6-9]|2[0-9]|3[01])\\.|192\\.168\\.|127\\.|0\\.0\\.0\\.0)"}},
    {"$unset": {"ip_address": "", "last_ip": "", "last_login_ip": ""}}
)
print(f"Usuarios con IP de proxy limpiados: {result.modified_count}")

# Mostrar sample de IPs que quedaron
sample = list(users().find({"ip_address": {"$exists": True}}, {"email": 1, "ip_address": 1, "last_ip": 1}).limit(10))
print("Sample de usuarios con IP guardada:")
for u in sample:
    print(f"  {u.get('email')} -> ip_address={u.get('ip_address')} last_ip={u.get('last_ip')}")

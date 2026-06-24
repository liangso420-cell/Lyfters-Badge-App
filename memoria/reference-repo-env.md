---
name: reference-repo-env
description: "Repo URL, environment gotchas, and local servers for the Lyfters Badge App"
metadata: 
  node_type: memory
  type: reference
  originSessionId: e47e75ca-3fde-4cf9-8057-8364a48df8e8
---

- **Repo:** https://github.com/liangso420-cell/Lyfters-Badge-App.git (origin). Working branch: `dev` (main branch: `main`). Git user: Arcadiaxz. Session-start HEAD: `0709c0d`.
- **Local web servers** (static frontend) started this session via `python -m http.server`:
  - `http://127.0.0.1:8080/` — project root (the app)
  - `http://127.0.0.1:8099/` — `.graphify/studio` (Ontology Studio)
  These are background tasks; serve from disk so they reflect edits on refresh (hard-refresh Ctrl+F5 for cached pages).
- **No local MongoDB** (port 27017 closed, no `mongod`/`mongosh`). `backend/app.py` calls `init_indexes()` at import, so the backend can't boot locally without Mongo. To run it: set `MONGO_URI`+`JWT_SECRET` in `.env`, `pip install -r backend/requirements.txt`, `python backend/app.py` (:5000), then `python backend/seed_achievements.py`.
- **Env:** Windows 11, PowerShell + Git Bash. Python at `C:\Python314\python.exe`. `terser` available via `npx`. Pillow/pymongo/mongomock installed into system Python this session.
- See [[project-graphify-state]] for the NODE_PATH gotcha when running graphify node scripts.

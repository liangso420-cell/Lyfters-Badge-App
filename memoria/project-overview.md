---
name: project-overview
description: What the Lyfters Badge App is — architecture and stack
metadata: 
  node_type: memory
  type: project
  originSessionId: e47e75ca-3fde-4cf9-8057-8364a48df8e8
---

Multi-tenant **badge/event gamification app**. Users join events via QR scan, earn badges, gain XP, unlock achievements, and appear on leaderboards. Roles: participant / admin / superadmin / god_admin. One user belongs to one workspace (multi-tenant).

**Stack:**
- Frontend: static HTML pages (~28) + vanilla JS (`js/config.js`, `js/api.js` = `LyfterAPI`, `js/utils.js` = `LyfterUtils` with i18n, `js/stars.js`, `js/particles.js`). No build step. Inline page scripts run immediately and depend on `window.LyfterAPI`/`LyfterUtils` already being loaded (so `defer` on core libs would break them).
- Backend: Flask (`backend/app.py`) + MongoDB (`backend/db.py`, collections via `users()`, `events()`, `badges()`, `scans()`, `event_joins()`, `user_achievements()`, `workspaces()`, `workspace_members()`). Routes in `backend/routes/`, services in `backend/services/`. Auth via JWT + Firebase Google sign-in; EmailJS for password reset / invites.
- Deploy: backend on Render (`render.yaml`, `lyfter-badge-api`, gunicorn `app:app`), frontend static (GitHub Pages/Vercel). `app.py` calls `init_indexes()` at import (needs Mongo to boot).

A `scan` document = one earned badge (has user_id, event_id, badge_id, scanned_at).

Related: [[project-perf-findings]], [[project-backend-n1-fixes]], [[reference-repo-env]]

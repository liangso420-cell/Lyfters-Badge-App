---
name: project-perf-findings
description: "Performance audit — why the site loads slowly, frontend and backend"
metadata: 
  node_type: memory
  type: project
  originSessionId: e47e75ca-3fde-4cf9-8057-8364a48df8e8
---

Senior-engineer audit of why the app loads slowly (esp. mobile). Two independent causes:

**Frontend asset delivery (page weight / first paint):**
- Achievement icons: 9 PNGs at 300–471 KB each (~3.1 MB); total images ~3.6 MB. Displayed at ≤80 px but stored at ~512 px. Biggest mobile cost. (FIXED in place — see [[project-frontend-perf-state]].)
- `utils.js` 89 KB + `api.js` 48 KB, unminified, render-blocking on every page. `api.js` also ships a full MOCK/localStorage demo layer alongside the real client (two `getProfile()` defs).
- 0 of 131 `<script>` tags use `defer`/`async`.
- `js/lottie.min.js` 298 KB is in the repo but loaded by no page (dead weight; `utils.js:446` guards `if(!window.lottie)return`).
- CDN sprawl: 5 different Google-Fonts URL variants, Tabler webfont `@latest` (unpinned), Firebase compat, Leaflet, jsQR, EmailJS.

**Backend data loading (the user's real complaint — server overload):**
- N+1 query loops: global leaderboard loaded ALL users then 1 count per user (`1+N`); event leaderboard counted per row; global XP leaderboard ~150 queries; admin dashboard ~3 queries/event; achievements `compute_user_stats` counted badges per event (hot path, runs every scan); workspaces counted per row. (FIXED — see [[project-backend-n1-fixes]].)

**Why:** mobile CPUs parse JS 3–5× slower and mobile networks have high latency, so the image weight + blocking JS dominate first paint, while the N+1 loops dominate time-to-data and fall over under load.

**How to apply:** time-to-data is now fixed (backend). Remaining first-paint gains are all frontend-code changes the user declined ([[feedback-frontend-hands-off]]); only image weight was addressed.

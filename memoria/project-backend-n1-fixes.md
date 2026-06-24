---
name: project-backend-n1-fixes
description: Backend N+1 query fixes applied (uncommitted) — the slow-data-loading fix
metadata: 
  node_type: memory
  type: project
  originSessionId: e47e75ca-3fde-4cf9-8057-8364a48df8e8
---

Rewrote 12 N+1 query loops into single aggregations / batched fetches. **Uncommitted working-tree changes** as of 2026-06-23 (not run against a live DB — there's no local Mongo). Files: `backend/db.py`, `backend/routes/events.py`, `backend/routes/admin.py`, `backend/routes/workspaces.py`, `backend/services/achievements.py`.

Key fixes:
- `events.leaderboard` (global badges): all-users + 1 count each → 1 aggregation (`$lookup` w/ `let`+sub-pipeline `$count`; keeps 0-badge users).
- `events.event_leaderboard`: per-row `badges_total` count folded into the aggregation.
- `events.global_leaderboard`: 3 queries × 50 users → 2 aggregations (`bulk_stats`).
- `events.joined_events`: find_one per event → one `{$in}` fetch.
- `services.achievements.compute_user_stats`: badge count per event → 1 aggregation (hot path, every scan).
- `admin.event_stats` / `admin.admin_list_badges` / `admin.admin_dashboard`: per-badge/per-event counts → aggregations + batch user fetch.
- `workspaces.get_my_workspaces_all` / `list_workspaces` / `list_members`: per-row counts/find_one → aggregations + batch fetch.
- `db.init_indexes`: added `users().create_index([("xp_total", ASCENDING)])` for leaderboard sort/range.

**Why:** the N+1 loops were the actual "server overload / slow data loading" cause.

**How to apply:** response shapes/field names unchanged → no frontend changes needed. Verified via `py_compile`, an N+1 scanner (now clean), and `mongomock` correctness tests. Caveat: `mongomock` does NOT implement `$lookup` with `let` (couldn't execute those two pipelines locally — they're valid MongoDB 5.0+ / Atlas syntax). The global badge leaderboard still returns ALL users (pagination is a separate, frontend-affecting improvement left undone). Changes are uncommitted — review/commit when ready.

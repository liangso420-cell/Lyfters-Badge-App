# Memory Index — Lyfters Badge App

One line per memory. Load this file each session; read the linked file when relevant.

## User
- [User profile](user-profile.md) — Lyfter team; performance/optimization focus; Spanish-language codebase

## Feedback (how to work)
- [Frontend hands-off](feedback-frontend-hands-off.md) — do NOT change frontend code/markup; in-place image optimization is the only accepted frontend perf change
- [Subagents can't write](feedback-subagent-no-write.md) — in this env, spawned agents have no Write/Bash/PowerShell; have them RETURN JSON and the parent saves it
- [Confirm scope before big edits](feedback-confirm-scope.md) — surface a plan + which files; user reverts work done outside the asked scope

## Project
- [Project overview](project-overview.md) — static HTML/JS frontend + Flask/MongoDB backend, multi-tenant badge/event gamification app
- [Performance audit findings](project-perf-findings.md) — root causes of slow loading (images, blocking JS, backend N+1)
- [Backend N+1 fixes (uncommitted)](project-backend-n1-fixes.md) — 12 endpoints rewritten to aggregations; the real "slow data loading" fix
- [Frontend perf state](project-frontend-perf-state.md) — frontend reverted to HEAD except images optimized in place
- [Graphify graph state](project-graphify-state.md) — graph built + incrementally updated; how to run node scripts here

## Reference
- [Repo, env, local servers](reference-repo-env.md) — GitHub URL, NODE_PATH gotcha, running static servers, no local Mongo

---
name: project-frontend-perf-state
description: Current frontend state — reverted to HEAD except in-place image optimization
metadata: 
  node_type: memory
  type: project
  originSessionId: e47e75ca-3fde-4cf9-8057-8364a48df8e8
---

As of 2026-06-23 the frontend is at committed HEAD **except** images were optimized in place:
- ~38 icon PNGs recompressed/resized (same filenames/extensions, no reference changes): achievements → max 256 px, badges → 256 px, UI icons → 128 px, root PNGs → 192 px. Total **3.68 MB → 1.14 MB (−68%)**. Done with Pillow (`Image.thumbnail` + `optimize=True`), only downscaling, RGBA preserved.
- All earlier JS/HTML optimizations (minified `*.min.js`, repointed `<script>` tags, `defer`, `lottie.min.js` delete) were **reverted** per [[feedback-frontend-hands-off]].

Independent of my work: **`login.html` has uncommitted user changes** (re-added a desktop "deco panel", widened card to 1100px) — I left it untouched and flagged it.

**Why:** image recompression is the only frontend perf change the user accepted; everything else must stay original.

**How to apply:** images are git-reversible (`git checkout -- assets *.png`). Further image gains need WebP (would change references → not accepted). Do not re-introduce reverted JS/HTML changes. Pillow/pymongo/mongomock were pip-installed into the system Python during this work.

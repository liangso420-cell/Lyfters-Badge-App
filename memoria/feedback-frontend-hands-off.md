---
name: feedback-frontend-hands-off
description: User does not want frontend code/markup changed; only in-place image optimization is accepted
metadata: 
  node_type: memory
  type: feedback
  originSessionId: e47e75ca-3fde-4cf9-8057-8364a48df8e8
---

The user does **not** want the frontend modified. Earlier in the session I minified JS into `*.min.js`, repointed `<script>` tags in 28 HTML files, deleted `lottie.min.js`, and added `defer` — the user asked to **revert all of it** (`git checkout -- '*.html' assets js/lottie.min.js ...` + delete the new `*.min.js`). The real problem to them is **data loading (backend)**, not page assets.

The ONE frontend change they accepted: **in-place image optimization** (recompress/resize the same `.png` files, same filenames/extensions → zero HTML/JS/CSS reference changes). That cut icons 3.68 MB → 1.14 MB (68%).

**Why:** they consider script-repointing / new files / markup edits as "modifying the frontend too much," and will revert them.

**How to apply:** for frontend perf, prefer binary-only changes (image recompression in place). Do NOT repoint script tags, create `.min.js`, add `defer`, or edit HTML/CSS unless explicitly asked. Always state which files a change touches before doing it. See [[feedback-confirm-scope]].

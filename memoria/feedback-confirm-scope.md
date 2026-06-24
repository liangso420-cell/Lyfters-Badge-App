---
name: feedback-confirm-scope
description: State which files a change touches and confirm scope before broad edits
metadata: 
  node_type: memory
  type: feedback
  originSessionId: e47e75ca-3fde-4cf9-8057-8364a48df8e8
---

The user reverts work done outside the precise scope they asked for (see [[feedback-frontend-hands-off]] — they reverted JS/HTML changes made during a broad "optimize the website" request because they actually only wanted the data-loading/backend issue fixed).

**Why:** broad interpretation of an optimization request led to unwanted frontend edits and a revert.

**How to apply:** before multi-file edits, briefly state the plan and exactly which files/areas will change, and prefer the most surgical change that solves the stated problem. When the user says "don't modify X too much," take it literally — make the minimal, reversible change and call out anything beyond it as optional.

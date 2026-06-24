---
name: project-graphify-state
description: Graphify knowledge-graph state and how to run its node scripts in this repo
metadata: 
  node_type: memory
  type: project
  originSessionId: e47e75ca-3fde-4cf9-8057-8364a48df8e8
---

`.graphify/` holds a knowledge graph built this session and then incrementally updated (`/graphify --update`). After the update: **664 nodes, 1085 edges, 53 communities** (was 644/1039 at initial build). Outputs: `.graphify/graph.json`, `.graphify/GRAPH_REPORT.md`, `.graphify/studio/` (static Ontology Studio). Manifest refreshed so all 100 files are current (0 stale).

Known artifact: the incremental merge created a few **duplicate backend nodes** (e.g. two "Database Layer" communities C9/C12) because re-extracted AST node ids drifted slightly from the originals. Cosmetic; a full rebuild would dedupe but would re-vision the 38 recompressed (visually identical) icons. The 38 image changes were intentionally NOT re-visioned during the update (semantically identical), only the 5 backend `.py` files (AST) and `login.html` (1 semantic agent) were re-extracted.

**Why:** captures graph freshness + the dup-node caveat for future queries.

**How to apply (running graphify node scripts here):** the global module isn't resolvable by default. Set `NODE_PATH` first:
`$groot = npm root -g; $env:NODE_PATH = "$groot;$groot\@sentropic\graphify\node_modules"` (the second path is needed because `graphology` is nested under the graphify package, not hoisted). PowerShell `Out-File -Encoding utf8` adds a BOM that breaks `JSON.parse` — write JSON via node `fs.writeFileSync` instead. Related: [[feedback-subagent-no-write]].

---
name: feedback-subagent-no-write
description: Spawned agents in this environment cannot write files; have them return data instead
metadata: 
  node_type: memory
  type: feedback
  originSessionId: e47e75ca-3fde-4cf9-8057-8364a48df8e8
---

In this environment, **Agent-tool subagents have no write access** — Write, Bash, and PowerShell are all denied for them (confirmed when graphify extraction subagents tried to write `.graphify/.frag_*.json`). `SendMessage` is also not available to resume them.

**Why:** wasted a batch of subagents that did the work but couldn't persist it, and I couldn't retrieve their results.

**How to apply:** when delegating extraction/generation to subagents, instruct them to **return the result (e.g. minified JSON) as their entire final message**, then the parent (me) writes it to disk with the Write tool. Don't rely on subagents writing files or on resuming them mid-task. The parent's Write works fine (after the user grants `.graphify` write access).

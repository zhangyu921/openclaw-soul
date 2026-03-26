---
"@openclaw-soul/cli": patch
---

Ignore stale `OPENCLAW_SOUL_API=http://localhost:3000` from user config when using the published npm CLI (so `npx login` reaches production). Optional `OPENCLAW_SOUL_ALLOW_LOCALHOST=1` to force.

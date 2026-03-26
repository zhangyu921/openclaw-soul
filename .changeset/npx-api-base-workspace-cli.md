---
"@openclaw-soul/cli": patch
---

Fix default API base when using `npx` from inside the repo: use production registry unless the running CLI is the workspace `node_modules/@openclaw-soul/cli` install (not the npx cache copy).

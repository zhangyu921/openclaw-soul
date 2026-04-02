---
"@openclaw-soul/cli": patch
---

**Breaking:** Non-interactive `publish` default pack subset is now `SOUL.md` plus `IDENTITY.md` when present; `MEMORY.md` is no longer included by default—use `--include MEMORY.md` to opt in.

- `SOUL.md` remains required for the default flow; wizard and messaging reflect the new defaults.
- Interactive publish wizard UX updated to match (MEMORY as explicit opt-in where applicable).

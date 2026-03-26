---
"@openclaw-soul/cli": minor
---

**Breaking (behavior):** If `OPENCLAW_SOUL_API` is unset after `loadCliEnv()`, the CLI now always uses `DEFAULT_OPENCLAW_SOUL_API` (production). Monorepo local dev must set `OPENCLAW_SOUL_API` via root `.env.cli` (see `.env.cli.example`) or the shell. Removed implicit localhost defaults, workspace/npx install detection, and `OPENCLAW_SOUL_ALLOW_LOCALHOST`.

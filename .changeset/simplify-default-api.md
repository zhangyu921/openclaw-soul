---
"@openclaw-soul/cli": patch
---

When `OPENCLAW_SOUL_API` is unset after `loadCliEnv()`, the CLI always uses `DEFAULT_OPENCLAW_SOUL_API` (production). Local monorepo dev: set `OPENCLAW_SOUL_API` in root `.env.cli` (see `.env.cli.example`) or the shell. Removed implicit localhost defaults and related heuristics.

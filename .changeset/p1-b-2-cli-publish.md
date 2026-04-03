---
"@openclaw-soul/cli": patch
---

Publish wizard no longer prompts for display title, summary, or avatar; asks whether to upload the full workspace first (default: no). Default display title is derived from IDENTITY Name when present, otherwise the slug. Success output reminds users to edit metadata on the registry site.

Fix: after interactive 409 confirm, omit `visibility` so replacing a pack no longer forces UNLISTED (preserves gallery listing when already public).

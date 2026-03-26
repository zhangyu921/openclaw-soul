/**
 * Public registry API base (no trailing slash) when `OPENCLAW_SOUL_API` is unset.
 * Used for npm/npx installs outside this monorepo so users need not configure a URL.
 * Monorepo devs default to `http://localhost:3000` when the running CLI is the workspace
 * `node_modules/@openclaw-soul/cli` install (see `isWorkspaceInstalledCli` in `load-env.ts`).
 */
export const DEFAULT_OPENCLAW_SOUL_API = "https://openclaw-soul.basilfield.com";

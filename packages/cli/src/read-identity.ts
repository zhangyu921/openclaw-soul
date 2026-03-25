import fs from "node:fs";
import path from "node:path";
import { slugifyDisplayName } from "./slug.js";

export type IdentityDefaults = {
  /** Raw display name from IDENTITY.md (persona "Name") */
  displayName: string;
  /** Suggested pack slug after slugify */
  slugCandidate: string;
};

/**
 * Read OpenClaw-style IDENTITY.md for **Name:** / Name: line.
 * Not a strict OpenClaw spec; best-effort for local workspaces.
 */
export function readIdentityDefaults(sourceDir: string): IdentityDefaults | null {
  const p = path.join(sourceDir, "IDENTITY.md");
  if (!fs.existsSync(p)) return null;
  const raw = fs.readFileSync(p, "utf8");
  const m = raw.match(/\*{0,2}Name\*{0,2}\s*:\s*([^\n\r]+)/i);
  if (!m) return null;
  const displayName = m[1].replace(/\*+/g, "").trim();
  if (!displayName) return null;
  const slugCandidate = slugifyDisplayName(displayName);
  if (!slugCandidate) return null;
  return { displayName, slugCandidate };
}

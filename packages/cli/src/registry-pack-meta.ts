import { fetchRegistry } from "./fetch-registry.js";

/**
 * Fetch pack JSON from registry GET /api/packs/:handle/:slug.
 * LISTED packs resolve without token; UNLISTED requires Bearer (author).
 */
export async function fetchPackVisibility(
  apiBase: string,
  handle: string,
  slug: string,
  token?: string
): Promise<{ visibility: string } | null> {
  const base = apiBase.replace(/\/$/, "");
  const url = `${base}/api/packs/${encodeURIComponent(handle)}/${encodeURIComponent(slug)}`;
  let res = await fetchRegistry(url);
  if (res.ok) {
    const j = (await res.json()) as { pack?: { visibility?: string } };
    const v = j.pack?.visibility;
    if (typeof v === "string") return { visibility: v };
    return null;
  }
  if (res.status === 404 && token) {
    res = await fetchRegistry(url, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      const j = (await res.json()) as { pack?: { visibility?: string } };
      const v = j.pack?.visibility;
      if (typeof v === "string") return { visibility: v };
    }
  }
  return null;
}

export type DraftToken =
  | { kind: "server"; initialIdx: number }
  | { kind: "pending"; id: string; file: File };

/**
 * 按草稿一次性执行：删除（按当前索引降序）→ 上传 pending（按草稿从左到右出现顺序）→ PATCH 顺序。
 * initialCount：进入编辑时服务端图片张数；draftTokens 中 server 的 initialIdx 为当时的下标。
 */
export async function applyShowcaseBatchSave(
  handle: string,
  slug: string,
  draftTokens: DraftToken[],
  initialCount: number
): Promise<{ ok: true } | { ok: false; error: string }> {
  const encH = encodeURIComponent(handle);
  const encS = encodeURIComponent(slug);
  const base = `/api/packs/${encH}/${encS}/showcase-image`;

  const surviving = new Set(
    draftTokens.filter((t): t is Extract<DraftToken, { kind: "server" }> => t.kind === "server").map((t) => t.initialIdx)
  );

  const toDelete: number[] = [];
  for (let i = 0; i < initialCount; i++) {
    if (!surviving.has(i)) toDelete.push(i);
  }
  toDelete.sort((a, b) => b - a);

  for (const index of toDelete) {
    const res = await fetch(base, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ index }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return {
        ok: false,
        error: typeof data.error === "string" ? data.error : "Delete failed",
      };
    }
  }

  const pendingInDraftOrder = draftTokens.filter(
    (t): t is Extract<DraftToken, { kind: "pending" }> => t.kind === "pending"
  );

  for (const p of pendingInDraftOrder) {
    const form = new FormData();
    form.append("image", p.file);
    const res = await fetch(base, { method: "POST", body: form });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return {
        ok: false,
        error: typeof data.error === "string" ? data.error : "Upload failed",
      };
    }
  }

  const m = surviving.size;
  const k = pendingInDraftOrder.length;
  const n = m + k;
  if (n === 0) {
    return { ok: true };
  }

  const sortedSurvivors = [...surviving].sort((a, b) => a - b);
  const mapInitialToOld = new Map(sortedSurvivors.map((ix, j) => [ix, j]));

  let pendingJ = 0;
  const order: number[] = [];
  for (const t of draftTokens) {
    if (t.kind === "server") {
      const old = mapInitialToOld.get(t.initialIdx);
      if (old === undefined) {
        return { ok: false, error: "internal: missing server index mapping" };
      }
      order.push(old);
    } else {
      order.push(m + pendingJ);
      pendingJ++;
    }
  }

  if (order.length !== n) {
    return { ok: false, error: "internal: order length mismatch" };
  }

  const res = await fetch(base, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ order }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    return {
      ok: false,
      error: typeof data.error === "string" ? data.error : "Reorder failed",
    };
  }

  return { ok: true };
}

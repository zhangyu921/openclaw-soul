"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function PackRevokeButton({
  handle,
  slug,
}: {
  handle: string;
  slug: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function revoke() {
    if (
      !window.confirm(
        "确定从画廊下架此 pack？他人将无法浏览或下载。之后可用 CLI（同 slug、加 --replace）再次公开。"
      )
    ) {
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const encH = encodeURIComponent(handle);
      const encS = encodeURIComponent(slug);
      const res = await fetch(`/api/packs/${encH}/${encS}/revoke`, {
        method: "POST",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : "Revoke failed");
        return;
      }
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mt-6 rounded-lg border border-zinc-200 bg-zinc-50 p-4 text-sm dark:border-zinc-700 dark:bg-zinc-900/50">
      <p className="mb-3 text-zinc-700 dark:text-zinc-300">
        下架后访客无法查看或下载。若要再次公开，请运行{" "}
        <code className="rounded bg-zinc-200 px-1 dark:bg-zinc-800">ocs publish --replace</code>
        （同 slug）。
      </p>
      <p className="mb-3 text-xs text-zinc-500 dark:text-zinc-500">
        服务端如何处理数据见{" "}
        <Link href="/privacy#revoke" className="underline">
          隐私说明 · 撤销展示
        </Link>
        。
      </p>
      {error ? <p className="mb-2 text-red-600 dark:text-red-400">{error}</p> : null}
      <button
        type="button"
        disabled={loading}
        onClick={() => revoke()}
        className="rounded border border-zinc-300 bg-white px-3 py-1.5 text-zinc-900 disabled:opacity-50 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
      >
        {loading ? "…" : "从画廊下架"}
      </button>
    </div>
  );
}

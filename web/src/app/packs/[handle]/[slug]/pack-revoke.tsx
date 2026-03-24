"use client";

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
        "确定撤销公开展示？画廊与他人下载将不可用；数据仍保留在服务端（不删库、不删文件）。之后可用 CLI 对同一 slug 执行带 --replace 的 publish 重新公开。"
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
    <div className="mt-6 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm dark:border-amber-900 dark:bg-amber-950">
      <p className="mb-3 text-amber-950 dark:text-amber-50">
        撤销后他人无法从本站下载或浏览此 pack；数据库记录与 zip 仍保留。重新公开：CLI{" "}
        <code className="rounded bg-amber-100 px-1 dark:bg-amber-900">ocs publish --replace</code>{" "}
        同 slug。
      </p>
      {error ? <p className="mb-2 text-red-600 dark:text-red-400">{error}</p> : null}
      <button
        type="button"
        disabled={loading}
        onClick={() => revoke()}
        className="rounded border border-amber-800 bg-white px-3 py-1.5 text-amber-950 disabled:opacity-50 dark:border-amber-600 dark:bg-amber-900 dark:text-amber-50"
      >
        {loading ? "…" : "撤销公开展示"}
      </button>
    </div>
  );
}

"use client";

import { useRouter } from "@/i18n/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";

export default function PackPublishButton({
  handle,
  slug,
  disableWhenEmpty = false,
}: {
  handle: string;
  slug: string;
  /** No pack source files (md/bin) — cannot list on gallery per product rules. */
  disableWhenEmpty?: boolean;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function publish() {
    if (disableWhenEmpty) {
      return;
    }
    if (!window.confirm("确定将本 pack 上架到画廊？上架后访客可浏览并下载。")) {
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const encH = encodeURIComponent(handle);
      const encS = encodeURIComponent(slug);
      const res = await fetch(`/api/packs/${encH}/${encS}/publish`, {
        method: "POST",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : "Publish failed");
        return;
      }
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-2">
      <Button
        type="button"
        disabled={loading || disableWhenEmpty}
        title={
          disableWhenEmpty ? "请先在「包内文件」中添加至少一个文件后再上架" : undefined
        }
        onClick={() => publish()}
      >
        {loading ? "…" : "上架到画廊"}
      </Button>
      {disableWhenEmpty ? (
        <p className="text-xs text-muted-foreground">空 pack 无法上架；请先添加包内文件。</p>
      ) : null}
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </div>
  );
}

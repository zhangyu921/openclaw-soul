"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { privacyLinkClassName } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";

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
        "确定从画廊下架此 pack？他人将无法浏览或下载。之后可运行 npx @openclaw-soul/cli publish --replace（同 slug）再次公开。"
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
    <Card className="mt-6 border-border/80 bg-muted/20 shadow-sm">
      <CardContent className="space-y-3 pt-6">
        <p className="text-sm text-muted-foreground">
          下架后访客无法查看或下载。若要再次公开，请运行{" "}
          <code className="rounded-md bg-muted px-1.5 py-0.5 font-mono text-xs">
            npx @openclaw-soul/cli publish --replace
          </code>
          （同 slug）。
        </p>
        <p className="text-xs text-muted-foreground">
          服务端如何处理数据见{" "}
          <Link href="/privacy#revoke" className={privacyLinkClassName}>
            隐私说明 · 撤销展示
          </Link>
          。
        </p>
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        <Button type="button" variant="outline" disabled={loading} onClick={() => revoke()}>
          {loading ? "…" : "从画廊下架"}
        </Button>
      </CardContent>
    </Card>
  );
}

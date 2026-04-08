"use client";

import { Sparkles } from "lucide-react";
import { useRouter } from "@/i18n/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

const rowInteractive =
  "flex w-full gap-4 rounded-xl border border-border/80 bg-card p-3 text-left shadow-sm ring-1 ring-border/40 transition-colors hover:bg-muted/30 hover:ring-primary/20";

/**
 * Dashboard row + dialog: create an empty pack from the web (P1-D).
 */
export default function DashboardCreatePackEntry({ hasHandle }: { hasHandle: boolean }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [slug, setSlug] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (!hasHandle) {
    return null;
  }

  async function submit() {
    setError(null);
    const s = slug.trim();
    if (!s) {
      setError("请填写 slug");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/packs/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug: s }),
        credentials: "include",
      });
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        viewPath?: string;
      };
      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : "创建失败");
        return;
      }
      if (typeof data.viewPath === "string" && data.viewPath) {
        setOpen(false);
        setSlug("");
        router.push(data.viewPath);
        return;
      }
      setError("响应无效");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <li>
        <button type="button" className={rowInteractive} onClick={() => setOpen(true)}>
          <div className="flex size-14 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
            <Sparkles className="size-6" aria-hidden />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="line-clamp-1 font-medium text-foreground">从零构建你的 SOUL</span>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">在网页新建空 pack，再在详情页添加 Markdown 文件。</p>
          </div>
        </button>
      </li>
      <Dialog
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          if (!next) {
            setError(null);
            setSlug("");
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>从零构建你的 SOUL</DialogTitle>
            <DialogDescription>
              填写 pack 的 slug（小写字母、数字与连字符）。创建后可在详情页「包内文件」中添加
              Markdown。
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Input
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              placeholder="my-soul-pack"
              className="font-mono text-sm"
              spellCheck={false}
              aria-label="Pack slug"
              disabled={loading}
              onKeyDown={(e) => {
                if (e.key === "Enter") void submit();
              }}
            />
            {error ? (
              <p className="text-sm text-destructive" role="alert">
                {error}
              </p>
            ) : null}
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                disabled={loading}
                onClick={() => setOpen(false)}
              >
                取消
              </Button>
              <Button type="button" disabled={loading} onClick={() => void submit()}>
                {loading ? "…" : "创建并打开"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

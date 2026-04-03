"use client";

import { Pencil } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

const MAX_LEN = 256;

export default function PackTitleEdit({
  handle,
  slug,
  initialTitle,
  isAuthor,
}: {
  handle: string;
  slug: string;
  initialTitle: string;
  isAuthor: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState(initialTitle);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setValue(initialTitle);
  }, [initialTitle]);

  async function save() {
    setError(null);
    setSaving(true);
    try {
      const res = await fetch(
        `/api/packs/${encodeURIComponent(handle)}/${encodeURIComponent(slug)}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title: value }),
        }
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : "Save failed");
        return;
      }
      setOpen(false);
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  if (!isAuthor) {
    return (
      <h1 className="font-heading text-balance text-2xl font-bold tracking-tight sm:text-3xl">
        {initialTitle}
      </h1>
    );
  }

  return (
    <div className="flex items-start justify-center gap-2 sm:justify-start">
      <h1 className="font-heading min-w-0 flex-1 text-balance text-2xl font-bold tracking-tight sm:text-3xl">
        {initialTitle}
      </h1>
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        className="shrink-0 text-muted-foreground"
        aria-label="编辑展示标题"
        title="编辑展示标题"
        onClick={() => {
          setError(null);
          setValue(initialTitle);
          setOpen(true);
        }}
      >
        <Pencil className="size-4" aria-hidden />
      </Button>
      <Dialog
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          if (!next) {
            setError(null);
            setValue(initialTitle);
          }
        }}
      >
        <DialogContent className="sm:max-w-lg" showCloseButton>
          <DialogHeader>
            <DialogTitle>编辑展示标题</DialogTitle>
            <DialogDescription>
              显示在画廊与详情页；最多 {MAX_LEN} 字。与 slug 独立。
            </DialogDescription>
          </DialogHeader>
          <Input
            value={value}
            onChange={(e) => setValue(e.target.value.slice(0, MAX_LEN))}
            placeholder="展示名称"
            aria-invalid={value.length >= MAX_LEN}
          />
          <p className="text-right text-xs text-muted-foreground">
            {value.length}/{MAX_LEN}
          </p>
          {error ? (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          ) : null}
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={saving}>
              取消
            </Button>
            <Button type="button" onClick={() => save()} disabled={saving}>
              {saving ? "…" : "保存"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

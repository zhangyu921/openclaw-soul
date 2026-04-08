"use client";

import { compressAvatarForUpload } from "@/lib/compress-avatar-client";
import { useRouter } from "@/i18n/navigation";
import { useState } from "react";
import { ImagePlus } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function AvatarUpload({
  handle,
  slug,
}: {
  handle: string;
  slug: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setStatus(null);
    setLoading(true);
    try {
      let toSend = file;
      try {
        toSend = await compressAvatarForUpload(file);
      } catch (compressErr) {
        const msg =
          compressErr instanceof Error ? compressErr.message : String(compressErr);
        setStatus(msg);
        return;
      }
      const form = new FormData();
      form.append("avatar", toSend);
      const res = await fetch(
        `/api/packs/${encodeURIComponent(handle)}/${encodeURIComponent(slug)}/avatar`,
        { method: "POST", body: form }
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setStatus(typeof data.error === "string" ? data.error : "Upload failed");
        return;
      }
      setStatus("已保存。");
      setOpen(false);
      router.refresh();
    } finally {
      setLoading(false);
      e.target.value = "";
    }
  }

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="icon-sm"
        className="size-8 shrink-0 rounded-full border-border/80 bg-background/95 shadow-md ring-2 ring-background backdrop-blur-sm"
        aria-label="更换头像"
        title="更换头像"
        onClick={() => {
          setStatus(null);
          setOpen(true);
        }}
      >
        <ImagePlus className="size-4" aria-hidden />
      </Button>

      <Dialog
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          if (!next) setStatus(null);
        }}
      >
        <DialogContent className="sm:max-w-md" showCloseButton>
          <DialogHeader>
            <DialogTitle>更换头像</DialogTitle>
            <DialogDescription>
              支持 PNG / JPEG / GIF / WebP。会在你的浏览器里先压缩再上传（服务端上限 512 KiB）。
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="pack-avatar-dialog">选择图片</Label>
            <Input
              id="pack-avatar-dialog"
              type="file"
              accept="image/png,image/jpeg,image/gif,image/webp"
              disabled={loading}
              onChange={onChange}
              className="h-auto cursor-pointer py-2 text-sm file:inline-flex file:items-center file:cursor-pointer file:mr-3 file:rounded-md file:border-0 file:bg-primary file:px-3  file:text-sm file:font-medium file:text-primary-foreground"
            />
            {status ? (
              <p
                className={`text-sm ${status.startsWith("已保存") ? "text-muted-foreground" : "text-destructive"}`}
                role="status"
              >
                {status}
              </p>
            ) : null}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

"use client";

import { compressAvatarForUpload } from "@/lib/compress-avatar-client";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
      setStatus("Saved.");
      router.refresh();
    } finally {
      setLoading(false);
      e.target.value = "";
    }
  }

  return (
    <Card className="mt-6 border-dashed border-border/80 bg-muted/10">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Avatar</CardTitle>
        <CardDescription>作者可上传或替换头像（浏览器会先压缩再上传）</CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        <Label htmlFor="pack-avatar" className="sr-only">
          Choose image
        </Label>
        <Input
          id="pack-avatar"
          type="file"
          accept="image/png,image/jpeg,image/gif,image/webp"
          disabled={loading}
          onChange={onChange}
          className="h-auto cursor-pointer py-2 text-sm file:mr-3 file:rounded-md file:border-0 file:bg-primary file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-primary-foreground"
        />
        {status ? <p className="text-sm text-muted-foreground">{status}</p> : null}
      </CardContent>
    </Card>
  );
}

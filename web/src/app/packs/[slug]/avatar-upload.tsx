"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function AvatarUpload({ slug }: { slug: string }) {
  const router = useRouter();
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setStatus(null);
    setLoading(true);
    try {
      const form = new FormData();
      form.append("avatar", file);
      const res = await fetch(`/api/packs/${encodeURIComponent(slug)}/avatar`, {
        method: "POST",
        body: form,
      });
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
    <div className="mt-4 rounded-lg border border-dashed border-zinc-300 p-4 dark:border-zinc-600">
      <p className="mb-2 text-sm font-medium text-zinc-600 dark:text-zinc-400">
        Upload / replace avatar (author only)
      </p>
      <input
        type="file"
        accept="image/png,image/jpeg,image/gif,image/webp"
        disabled={loading}
        onChange={onChange}
        className="text-sm"
      />
      {status ? <p className="mt-2 text-sm text-zinc-500">{status}</p> : null}
    </div>
  );
}

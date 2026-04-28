"use client";

import { GitFork } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

export default function PackForkButton({
  sourceHandle,
  sourceSlug,
}: {
  sourceHandle: string;
  sourceSlug: string;
}) {
  const t = useTranslations("packFork");
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [slug, setSlug] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit() {
    setError(null);
    const s = slug.trim();
    if (!s) {
      setError(t("slugEmpty"));
      return;
    }
    setLoading(true);
    try {
      const encH = encodeURIComponent(sourceHandle);
      const encS = encodeURIComponent(sourceSlug);
      const res = await fetch(`/api/packs/${encH}/${encS}/fork`, {
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
        const err = typeof data.error === "string" ? data.error : "";
        if (err === "slug_taken") {
          setError(t("slugTaken"));
        } else if (err === "rate_limited") {
          setError(t("rateLimited"));
        } else if (err === "invalid_slug") {
          setError(t("invalidSlug"));
        } else {
          setError(t("failed"));
        }
        return;
      }
      if (typeof data.viewPath === "string" && data.viewPath) {
        setOpen(false);
        setSlug("");
        router.push(data.viewPath);
        return;
      }
      setError(t("badResponse"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="gap-1.5 self-start sm:self-auto sm:shrink-0"
        onClick={() => setOpen(true)}
      >
        <GitFork className="size-3.5" aria-hidden />
        {t("button")}
      </Button>
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
            <DialogTitle>{t("dialogTitle")}</DialogTitle>
            <DialogDescription>{t("dialogDescription")}</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground" htmlFor="fork-slug">
              {t("slugLabel")}
            </label>
            <Input
              id="fork-slug"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              placeholder={t("slugPlaceholder")}
              autoComplete="off"
              spellCheck={false}
            />
            {error ? <p className="text-sm text-destructive">{error}</p> : null}
          </div>
          <DialogFooter className="border-0 bg-transparent p-0 sm:justify-end">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              {t("cancel")}
            </Button>
            <Button type="button" disabled={loading} onClick={() => void submit()}>
              {loading ? t("submitting") : t("submit")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

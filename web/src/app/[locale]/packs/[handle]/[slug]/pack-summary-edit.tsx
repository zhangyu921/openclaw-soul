"use client";

import { Pencil } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

const MAX_LEN = 2048;

export default function PackSummaryEdit({
  handle,
  slug,
  initialSummary,
  isAuthor,
}: {
  handle: string;
  slug: string;
  initialSummary: string | null;
  isAuthor: boolean;
}) {
  const t = useTranslations("packDetail");
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState(initialSummary ?? "");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setValue(initialSummary ?? "");
  }, [initialSummary]);

  const display = initialSummary?.trim() ? initialSummary.trim() : null;

  async function save() {
    setError(null);
    setSaving(true);
    try {
      const res = await fetch(
        `/api/packs/${encodeURIComponent(handle)}/${encodeURIComponent(slug)}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ summary: value }),
        }
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : t("saveFailed"));
        return;
      }
      setOpen(false);
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mt-4">
      <div className="flex items-start justify-center gap-2 sm:justify-start">
        <p
          className={cn(
            "min-w-0 flex-1 text-pretty text-muted-foreground",
            !display && "text-muted-foreground/80 italic"
          )}
        >
          {display ?? t("summaryEmpty")}
        </p>
        {isAuthor ? (
          <>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              className="shrink-0 text-muted-foreground"
              aria-label={t("summaryEditAria")}
              title={t("summaryEditAria")}
              onClick={() => {
                setError(null);
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
                  setValue(initialSummary ?? "");
                }
              }}
            >
              <DialogContent className="sm:max-w-lg" showCloseButton>
                <DialogHeader>
                  <DialogTitle>{t("summaryEditTitle")}</DialogTitle>
                  <DialogDescription>{t("summaryEditBody", { max: MAX_LEN })}</DialogDescription>
                </DialogHeader>
                <Textarea
                  value={value}
                  onChange={(e) => setValue(e.target.value.slice(0, MAX_LEN))}
                  placeholder={t("summaryPlaceholder")}
                  rows={5}
                  className="min-h-28 resize-y"
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
                    {t("cancel")}
                  </Button>
                  <Button type="button" onClick={() => save()} disabled={saving}>
                    {saving ? t("saving") : t("save")}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </>
        ) : null}
      </div>
    </div>
  );
}

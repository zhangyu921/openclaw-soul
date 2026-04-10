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
  const t = useTranslations("packDetail");
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
        setError(typeof data.error === "string" ? data.error : t("saveFailed"));
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
        aria-label={t("titleEditAria")}
        title={t("titleEditAria")}
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
            <DialogTitle>{t("titleEditTitle")}</DialogTitle>
            <DialogDescription>{t("titleEditBody", { max: MAX_LEN })}</DialogDescription>
          </DialogHeader>
          <Input
            value={value}
            onChange={(e) => setValue(e.target.value.slice(0, MAX_LEN))}
            placeholder={t("titlePlaceholder")}
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
    </div>
  );
}

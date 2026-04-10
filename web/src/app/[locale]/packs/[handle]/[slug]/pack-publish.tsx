"use client";

import { useTranslations } from "next-intl";
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
  disableWhenEmpty?: boolean;
}) {
  const t = useTranslations("packPublish");
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function publish() {
    if (disableWhenEmpty) {
      return;
    }
    if (!window.confirm(t("confirm"))) {
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
        setError(typeof data.error === "string" ? data.error : t("failed"));
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
        title={disableWhenEmpty ? t("disabledTitle") : undefined}
        onClick={() => publish()}
      >
        {loading ? t("buttonWorking") : t("button")}
      </Button>
      {disableWhenEmpty ? (
        <p className="text-xs text-muted-foreground">{t("emptyHint")}</p>
      ) : null}
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </div>
  );
}

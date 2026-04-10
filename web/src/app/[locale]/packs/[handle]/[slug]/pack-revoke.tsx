"use client";

import { useLocale, useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
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
  const t = useTranslations("packRevoke");
  const locale = useLocale();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function revoke() {
    if (!window.confirm(t("confirm"))) {
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
        setError(typeof data.error === "string" ? data.error : t("failed"));
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
        <p className="text-sm text-muted-foreground">{t("body")}</p>
        <p className="text-xs text-muted-foreground">
          {t("privacy")}{" "}
          <Link href="/privacy#revoke" className={privacyLinkClassName}>
            {t("privacyLink")}
          </Link>
          {locale === "zh" ? "。" : "."}
        </p>
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        <Button type="button" variant="outline" disabled={loading} onClick={() => revoke()}>
          {loading ? t("working") : t("button")}
        </Button>
      </CardContent>
    </Card>
  );
}

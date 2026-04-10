"use client";

import { useTranslations } from "next-intl";

export function AuthLoading() {
  const t = useTranslations("auth");
  return (
    <p className="text-sm text-muted-foreground" aria-live="polite">
      {t("loading")}
    </p>
  );
}

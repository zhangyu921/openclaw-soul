"use client";

import { useLocale } from "next-intl";

import { usePathname, useRouter } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

const navClass = cn(
  "inline-flex h-8 items-center justify-center rounded-lg px-2.5 text-sm font-medium whitespace-nowrap transition-colors",
  "text-muted-foreground hover:bg-muted hover:text-foreground"
);

export function LocaleSwitcher() {
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();
  const targetLocale = locale === "en" ? "zh" : "en";
  const label = targetLocale === "zh" ? "中文" : "English";

  return (
    <button
      type="button"
      className={navClass}
      onClick={() => {
        router.replace(pathname, { locale: targetLocale });
      }}
    >
      {label}
    </button>
  );
}

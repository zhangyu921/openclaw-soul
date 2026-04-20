"use client";

import { Check, Globe } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { usePathname, useRouter } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import { cn } from "@/lib/utils";

function labelForLocale(locale: string, t: (key: "localeNameEn" | "localeNameZh") => string) {
  if (locale === "en") return t("localeNameEn");
  if (locale === "zh") return t("localeNameZh");
  return locale;
}

export function LocaleSwitcher() {
  const activeLocale = useLocale();
  const pathname = usePathname();
  const router = useRouter();
  const t = useTranslations("nav");
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        className="size-8 shrink-0"
        aria-label={t("language")}
        aria-expanded={open}
        aria-haspopup="dialog"
        onClick={() => setOpen(true)}
      >
        <Globe className="size-4" />
      </Button>
      <DialogContent className="sm:max-w-sm" showCloseButton>
        <DialogHeader>
          <DialogTitle>{t("localeDialogTitle")}</DialogTitle>
          <DialogDescription>{t("localeDialogDescription")}</DialogDescription>
        </DialogHeader>
        <ul className="grid list-none gap-1 p-0" role="list">
          {routing.locales.map((loc) => {
            const active = loc === activeLocale;
            return (
              <li key={loc}>
                <Button
                  type="button"
                  variant="ghost"
                  className={cn(
                    "h-auto w-full justify-between px-3 py-2.5 font-normal",
                    active && "bg-muted"
                  )}
                  aria-current={active ? "true" : undefined}
                  onClick={() => {
                    if (!active) {
                      router.replace(pathname, { locale: loc });
                    }
                    setOpen(false);
                  }}
                >
                  <span>{labelForLocale(loc, t)}</span>
                  {active ? <Check className="size-4 shrink-0 text-primary" aria-hidden /> : null}
                </Button>
              </li>
            );
          })}
        </ul>
      </DialogContent>
    </Dialog>
  );
}

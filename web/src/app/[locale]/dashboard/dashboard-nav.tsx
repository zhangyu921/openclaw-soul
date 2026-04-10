"use client";

import { useTranslations } from "next-intl";

import { Link, usePathname } from "@/i18n/navigation";

import { cn } from "@/lib/utils";

const items = [
  { href: "/dashboard", labelKey: "navMySouls" as const },
  { href: "/dashboard/tokens", labelKey: "navApiTokens" as const },
] as const;

export function DashboardNav() {
  const pathname = usePathname();
  const t = useTranslations("dashboard");

  return (
    <nav className="mb-8 border-b border-border/60" aria-label={t("navAriaLabel")}>
      <div className="mx-auto flex w-full max-w-lg flex-wrap gap-1">
        {items.map(({ href, labelKey }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "-mb-px inline-flex items-center border-b-2 px-3 py-2.5 text-sm font-medium transition-colors",
                active
                  ? "border-primary text-foreground"
                  : "border-transparent text-muted-foreground hover:border-border hover:text-foreground"
              )}
            >
              {t(labelKey)}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

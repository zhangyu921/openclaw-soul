"use client";

import { useTranslations } from "next-intl";

import { Link } from "@/i18n/navigation";

import { LocaleSwitcher } from "@/components/locale-switcher";
import { ModeToggle } from "@/components/mode-toggle";
import { cn } from "@/lib/utils";

const navClass = cn(
  "inline-flex h-8 items-center justify-center rounded-lg px-2.5 text-sm font-medium whitespace-nowrap transition-colors",
  "text-muted-foreground hover:bg-muted hover:text-foreground"
);

export type HeaderUser = { email: string; handle: string | null };

function displayName(u: HeaderUser): string {
  if (u.handle?.trim()) return `@${u.handle}`;
  const at = u.email.indexOf("@");
  return at > 0 ? u.email.slice(0, at) : u.email;
}

export function SiteHeader({ initialUser }: { initialUser: HeaderUser | null }) {
  const tNav = useTranslations("nav");
  const tCommon = useTranslations("common");

  return (
    <header
      className="sticky top-0 z-[var(--z-sticky)] border-b border-border/60 bg-background/80 backdrop-blur-md supports-[backdrop-filter]:bg-background/70"
      style={{ minHeight: "var(--header-height)" }}
    >
      <div className="mx-auto flex min-h-[var(--header-height)] max-w-[var(--container-max)] items-center justify-between gap-3 px-4 sm:px-6">
        <Link
          href="/"
          className="group inline-flex items-center gap-2.5 rounded-lg px-1 py-0.5 transition-colors hover:text-primary"
        >
          <span
            className="relative inline-flex size-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary/80 via-primary/60 to-accent/80 ring-1 ring-primary/30"
            aria-hidden
          >
            <span className="size-3 rounded-full bg-background/95 shadow-sm" />
          </span>
          <span className="flex min-w-0 flex-col leading-none">
            <span className="font-heading text-base font-semibold tracking-tight text-foreground sm:text-lg">
              {tCommon("siteName")}
            </span>
            <span className="text-[10px] font-medium tracking-[0.08em] text-muted-foreground uppercase transition-colors group-hover:text-primary/80">
              {tCommon("brandTaglineMini")}
            </span>
          </span>
        </Link>
        <nav className="flex min-w-0 flex-wrap items-center justify-end gap-0.5 sm:gap-1">
          {initialUser ? (
            <Link
              href="/dashboard"
              className={cn(
                navClass,
                "max-w-[min(12rem,40vw)] truncate font-medium text-foreground hover:text-foreground"
              )}
              title={initialUser.email}
            >
              {displayName(initialUser)}
            </Link>
          ) : (
            <Link href="/login" className={navClass}>
              {tNav("login")}
            </Link>
          )}
          <LocaleSwitcher />
          <ModeToggle />
        </nav>
      </div>
    </header>
  );
}

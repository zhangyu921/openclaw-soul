"use client";

import Link from "next/link";

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
  return (
    <header
      className="sticky top-0 z-[var(--z-sticky)] border-b border-border/60 bg-background/80 backdrop-blur-md supports-[backdrop-filter]:bg-background/70"
      style={{ minHeight: "var(--header-height)" }}
    >
      <div className="mx-auto flex min-h-[var(--header-height)] max-w-[var(--container-max)] items-center justify-between gap-3 px-4 sm:px-6">
        <Link
          href="/"
          className="font-heading text-lg font-semibold tracking-tight text-foreground transition-colors hover:text-primary"
        >
          OpenClaw Soul
        </Link>
        <nav className="flex min-w-0 flex-wrap items-center justify-end gap-0.5 sm:gap-1">
          {initialUser ? (
            <Link
              href="/dashboard/tokens"
              className={cn(
                navClass,
                "max-w-[min(12rem,40vw)] truncate font-medium text-foreground hover:text-foreground"
              )}
              title={initialUser.email}
            >
              {displayName(initialUser)}
            </Link>
          ) : (
            <>
              <Link href="/login" className={navClass}>
                Login
              </Link>
              <Link href="/register" className={navClass}>
                Register
              </Link>
            </>
          )}
          <ModeToggle />
        </nav>
      </div>
    </header>
  );
}

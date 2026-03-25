"use client";

import Link from "next/link";

import { ModeToggle } from "@/components/mode-toggle";
import { cn } from "@/lib/utils";

const navClass = cn(
  "inline-flex h-8 items-center justify-center rounded-lg px-2.5 text-sm font-medium whitespace-nowrap transition-colors",
  "text-muted-foreground hover:bg-muted hover:text-foreground"
);

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-50 border-b border-border/60 bg-background/80 backdrop-blur-md supports-[backdrop-filter]:bg-background/70">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-3 px-4 sm:px-6">
        <Link
          href="/"
          className="font-heading text-lg font-semibold tracking-tight text-foreground transition-colors hover:text-primary"
        >
          OpenClaw Soul
        </Link>
        <nav className="flex flex-wrap items-center justify-end gap-0.5 sm:gap-1">
          <Link href="/login" className={navClass}>
            Login
          </Link>
          <Link href="/register" className={navClass}>
            Register
          </Link>
          <Link href="/dashboard/tokens" className={navClass}>
            API tokens
          </Link>
          <Link href="/privacy" className={navClass}>
            Privacy
          </Link>
          <ModeToggle />
        </nav>
      </div>
    </header>
  );
}

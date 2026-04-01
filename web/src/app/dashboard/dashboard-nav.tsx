"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

const items = [
  { href: "/dashboard", label: "总览" },
  { href: "/dashboard/tokens", label: "API tokens" },
] as const;

export function DashboardNav() {
  const pathname = usePathname();

  return (
    <nav className="mb-8 border-b border-border/60" aria-label="Dashboard">
      <div className="mx-auto flex w-full max-w-3xl flex-wrap gap-1">
        {items.map(({ href, label }) => {
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
              {label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

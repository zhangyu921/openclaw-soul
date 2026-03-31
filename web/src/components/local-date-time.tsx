"use client";

import { useMemo } from "react";
import { useSyncExternalStore } from "react";

/**
 * Renders an ISO datetime in the **browser's** locale and time zone after hydration.
 * Uses `useSyncExternalStore` so we never `setState` in an effect (avoids cascading renders)
 * and `getServerSnapshot` keeps SSR + first client paint as "…" to match.
 */
export function LocalDateTime({
  iso,
  className,
}: {
  iso: string;
  className?: string;
}) {
  const isClient = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );

  const text = useMemo(() => {
    if (!isClient) return "…";
    const d = new Date(iso);
    return Number.isNaN(d.getTime()) ? iso : d.toLocaleString();
  }, [iso, isClient]);

  return (
    <span className={className} title={iso}>
      {text}
    </span>
  );
}

import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** Muted style for in-app links to /privacy (avoid prominent primary CTA look). */
export const privacyLinkClassName =
  "text-muted-foreground/80 underline-offset-4 transition-colors hover:text-muted-foreground hover:underline"

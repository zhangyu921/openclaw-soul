import { routing } from "@/i18n/routing";

const DEFAULT_NEXT = "/dashboard";
type Locale = (typeof routing.locales)[number];

function isLocale(value: string): value is Locale {
  return (routing.locales as readonly string[]).includes(value);
}

function hasLocalePrefix(pathname: string): boolean {
  return routing.locales.some((locale) => pathname === `/${locale}` || pathname.startsWith(`/${locale}/`));
}

export function normalizeLocale(value: string | null | undefined): Locale {
  if (!value) return routing.defaultLocale;
  return isLocale(value) ? value : routing.defaultLocale;
}

export function sanitizeNextPath(value: string | null | undefined, locale: string): string {
  const normalizedLocale = normalizeLocale(locale);
  const raw = value?.trim() || DEFAULT_NEXT;
  if (!raw.startsWith("/") || raw.startsWith("//")) {
    return `/${normalizedLocale}${DEFAULT_NEXT}`;
  }
  if (raw.startsWith("/api/")) {
    return `/${normalizedLocale}${DEFAULT_NEXT}`;
  }
  if (hasLocalePrefix(raw)) {
    return raw;
  }
  if (raw === "/") {
    return `/${normalizedLocale}`;
  }
  return `/${normalizedLocale}${raw}`;
}

export function localeFromPathname(pathname: string): Locale {
  for (const locale of routing.locales) {
    if (pathname === `/${locale}` || pathname.startsWith(`/${locale}/`)) {
      return locale;
    }
  }
  return routing.defaultLocale;
}

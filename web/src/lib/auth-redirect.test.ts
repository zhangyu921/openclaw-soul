import { describe, expect, it } from "vitest";

import { localeFromPathname, normalizeLocale, sanitizeNextPath } from "./auth-redirect";

describe("normalizeLocale", () => {
  it("falls back to default locale", () => {
    expect(normalizeLocale(null)).toBe("en");
    expect(normalizeLocale("ja")).toBe("en");
  });

  it("accepts supported locale", () => {
    expect(normalizeLocale("zh")).toBe("zh");
  });
});

describe("sanitizeNextPath", () => {
  it("adds locale prefix for unprefixed paths", () => {
    expect(sanitizeNextPath("/dashboard", "zh")).toBe("/zh/dashboard");
  });

  it("keeps locale-prefixed paths", () => {
    expect(sanitizeNextPath("/en/dashboard/tokens", "zh")).toBe("/en/dashboard/tokens");
  });

  it("rejects unsafe or api targets", () => {
    expect(sanitizeNextPath("https://evil.example", "en")).toBe("/en/dashboard");
    expect(sanitizeNextPath("//evil.example", "en")).toBe("/en/dashboard");
    expect(sanitizeNextPath("/api/auth/me", "en")).toBe("/en/dashboard");
  });
});

describe("localeFromPathname", () => {
  it("reads locale from pathname", () => {
    expect(localeFromPathname("/zh/dashboard")).toBe("zh");
    expect(localeFromPathname("/dashboard")).toBe("en");
  });
});

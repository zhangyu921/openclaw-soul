import { hasLocale } from "next-intl";
import { getRequestConfig } from "next-intl/server";

import { mergeMessagesWithFallback } from "@/lib/i18n-messages";

import en from "../../messages/en.json";

import { routing } from "./routing";

type Locale = (typeof routing.locales)[number];

async function loadNonDefaultMessages(
  locale: Exclude<Locale, "en">
): Promise<Record<string, unknown>> {
  switch (locale) {
    case "zh":
      return (await import("../../messages/zh.json")).default;
  }
}

export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale;
  const locale: Locale = hasLocale(routing.locales, requested)
    ? requested
    : routing.defaultLocale;

  if (locale === "en") {
    return { locale, messages: en };
  }

  const primary = await loadNonDefaultMessages(locale);
  return {
    locale,
    messages: mergeMessagesWithFallback(en, primary) as typeof en,
  };
});

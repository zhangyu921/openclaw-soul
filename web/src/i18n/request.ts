import { hasLocale } from "next-intl";
import { getRequestConfig } from "next-intl/server";

import { mergeMessagesWithFallback } from "@/lib/i18n-messages";

import { routing } from "./routing";

export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale;
  const locale = hasLocale(routing.locales, requested)
    ? requested
    : routing.defaultLocale;

  const en = (await import(`../../messages/en.json`)).default;
  if (locale === "en") {
    return { locale, messages: en };
  }

  const primary = (await import(`../../messages/${locale}.json`)).default;
  return {
    locale,
    messages: mergeMessagesWithFallback(en, primary) as typeof en,
  };
});

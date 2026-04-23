import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/next";
import { Geist, Geist_Mono } from "next/font/google";
import { hasLocale, NextIntlClientProvider } from "next-intl";
import { getMessages, getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";

import { SiteHeader } from "@/components/site-header";
import { ThemeProvider } from "@/components/theme-provider";
import { routing } from "@/i18n/routing";
import { Link } from "@/i18n/navigation";
import { prisma } from "@/lib/prisma";
import { readSessionUserId } from "@/lib/session";
import { privacyLinkClassName } from "@/lib/utils";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

type Props = {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
};

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: Pick<Props, "params">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "common" });
  return {
    title: t("siteName"),
    description: t("defaultMetaDescription"),
    icons: {
      icon: [{ url: "/brand-mark.svg", type: "image/svg+xml" }],
      apple: [{ url: "/brand-mark.svg", type: "image/svg+xml" }],
    },
  };
}

export default async function LocaleLayout({ children, params }: Props) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  setRequestLocale(locale);

  const t = await getTranslations({ locale, namespace: "common" });

  const userId = await readSessionUserId();
  const headerUser =
    userId === null
      ? null
      : await prisma.user.findUnique({
          where: { id: userId },
          select: { email: true, handle: true },
        });

  const messages = await getMessages();

  return (
    <html
      lang={locale}
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="flex min-h-full flex-col bg-background text-foreground">
        <NextIntlClientProvider locale={locale} messages={messages}>
          <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
            <SiteHeader initialUser={headerUser} />
            <div className="flex-1">{children}</div>
            <footer className="border-border/60 border-t py-8 px-8 text-center text-sm text-muted-foreground">
              <p>
                {t("footerTagline")}
                <span className="text-muted-foreground/40" aria-hidden>
                  {" "}
                  ·{" "}
                </span>
                <Link href="/privacy" className={privacyLinkClassName}>
                  {t("footerPrivacy")}
                </Link>
              </p>
            </footer>
          </ThemeProvider>
        </NextIntlClientProvider>
        <Analytics />
      </body>
    </html>
  );
}

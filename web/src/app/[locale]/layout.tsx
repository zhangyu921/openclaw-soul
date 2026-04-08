import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { hasLocale, NextIntlClientProvider } from "next-intl";
import { getMessages, setRequestLocale } from "next-intl/server";
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
  await params;
  return {
    title: "OpenClaw Soul",
    description: "OpenClaw workspace pack registry",
  };
}

export default async function LocaleLayout({ children, params }: Props) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  setRequestLocale(locale);

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
            <footer className="border-border/60 border-t py-8 text-center text-sm text-muted-foreground">
              <p>
                OpenClaw Soul — share and discover workspace packs
                <span className="text-muted-foreground/40" aria-hidden>
                  {" "}
                  ·{" "}
                </span>
                <Link href="/privacy" className={privacyLinkClassName}>
                  Privacy &amp; uploads
                </Link>
              </p>
            </footer>
          </ThemeProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}

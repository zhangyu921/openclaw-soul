import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";

import { SiteHeader } from "@/components/site-header";
import { privacyLinkClassName } from "@/lib/utils";
import { ThemeProvider } from "@/components/theme-provider";

import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "OpenClaw Soul",
  description: "OpenClaw workspace pack registry",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          <SiteHeader />
          <div className="flex-1">{children}</div>
          <footer className="border-t border-border/60 py-8 text-center text-sm text-muted-foreground">
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
      </body>
    </html>
  );
}

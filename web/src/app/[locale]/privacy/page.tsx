import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { Link } from "@/i18n/navigation";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "privacy" });
  return {
    title: `${t("metaTitle")} — OpenClaw Soul`,
    description: t("metaDescription"),
  };
}

export default async function PrivacyPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "privacy" });

  return (
    <main className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
      <div className="mb-8 text-center">
        <h1 className="font-heading text-3xl font-bold tracking-tight">{t("heroTitle")}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{t("heroSubtitle")}</p>
      </div>

      <Card className="border-0 shadow-md ring-1 ring-border/80">
        <CardHeader>
          <CardTitle className="text-lg">{t("cardTitle")}</CardTitle>
          <CardDescription>{t("cardLead")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 text-sm leading-relaxed text-muted-foreground">
          <p>{t("p1")}</p>
          <Separator />
          <p>{t("p2")}</p>
          <Separator />
          <p>{t("p3")}</p>
          <Separator />
          <p id="revoke">{t("p4")}</p>
          <Separator />
          <p>{t("p5")}</p>
          <p className="rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground">{t("p6")}</p>
        </CardContent>
      </Card>

      <p className="mt-10 text-center text-sm text-muted-foreground">
        <Link href="/register" className="font-medium text-primary underline-offset-4 hover:underline">
          {t("register")}
        </Link>
        {" · "}
        <Link href="/login" className="font-medium text-primary underline-offset-4 hover:underline">
          {t("login")}
        </Link>
        {" · "}
        <Link href="/" className="underline-offset-4 hover:underline">
          {t("gallery")}
        </Link>
      </p>
    </main>
  );
}

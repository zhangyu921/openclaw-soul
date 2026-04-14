import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Sparkles } from "lucide-react";

import { HomeIntroStack } from "@/components/home-intro-stack";
import { HomePackGallery } from "@/components/home-pack-gallery";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PackVisibility } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "home" });
  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
  };
}

export default async function Home({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("home");

  const packsRaw = await prisma.pack.findMany({
    where: { visibility: PackVisibility.LISTED, author: { handle: { not: null } } },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      slug: true,
      title: true,
      summary: true,
      avatarRelPath: true,
      packFilePaths: true,
      author: { select: { handle: true } },
    },
  });

  const packs = packsRaw.map((p) => ({
    ...p,
    packFilePaths: Array.isArray(p.packFilePaths)
      ? p.packFilePaths.filter((v): v is string => typeof v === "string")
      : [],
  }));

  return (
    <main className="mx-auto max-w-(--container-max) px-4 py-10 sm:px-6">
      <div className="relative mb-10 overflow-hidden rounded-2xl border border-border/60 bg-linear-to-b from-primary/[0.07] via-background to-background px-4 py-7 text-center sm:mb-12 sm:px-8 sm:py-10">
        <div className="pointer-events-none absolute -top-16 left-1/2 h-40 w-40 -translate-x-1/2 rounded-full bg-primary/15 blur-3xl" />
        <div className="pointer-events-none absolute right-0 bottom-0 h-28 w-28 translate-x-1/4 translate-y-1/4 rounded-full bg-accent/25 blur-2xl" />
        <p className="mb-3 text-[11px] font-semibold tracking-[0.14em] text-primary uppercase">{t("heroKicker")}</p>
        <Badge variant="secondary" className="mb-4 gap-1 px-3 py-1 text-xs font-medium">
          <Sparkles className="size-3.5" aria-hidden />
          {t("badge")}
        </Badge>
        <h1 className="font-heading text-balance text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
          {t("heroTitle")}
        </h1>
        <p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">
          {t("heroSubtitle")}
        </p>
      </div>


      <div className="-mx-4 sm:-mx-6 overflow-x-clip">
        <HomeIntroStack
          items={[
            { title: t("introWhatLabel"), body: t("introWhatBody") },
            { title: t("introWhoLabel"), body: t("introWhoBody") },
            { title: t("introHowLabel"), body: t("introHowBody") },
          ]}
        />
      </div>


      {packs.length === 0 ? (
        <Card className="mx-auto max-w-md border-dashed text-center shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">{t("emptyTitle")}</CardTitle>
            <CardDescription>{t("emptyDescription")}</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">{t("emptyFromWorkspace")}</p>
            <p className="mt-2">
              <code className="rounded-md bg-muted px-2 py-0.5 font-mono text-xs">
                {t("publishCommandLine")}
              </code>
            </p>
          </CardContent>
        </Card>
      ) : (
        <HomePackGallery
          packs={packs}
          copy={{
            searchPlaceholder: t("searchPlaceholder"),
            tagsLabel: t("tagsLabel"),
            allTags: t("allTags"),
            clearFilters: t("clearFilters"),
            noResultsTitle: t("noResultsTitle"),
            noResultsDescription: t("noResultsDescription"),
            noAvatar: t("noAvatar"),
            noSummary: t("noSummary"),
          }}
        />
      )}
    </main>
  );
}

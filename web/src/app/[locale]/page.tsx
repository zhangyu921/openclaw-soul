import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Eye, Sparkles } from "lucide-react";

import { HomeIntroStack } from "@/components/home-intro-stack";
import { Link } from "@/i18n/navigation";
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

  const packs = await prisma.pack.findMany({
    where: {
      visibility: PackVisibility.LISTED,
      author: { handle: { not: null } },
      authorDashboardHiddenAt: null,
    },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      slug: true,
      title: true,
      summary: true,
      avatarRelPath: true,
      profileViewCount: true,
      author: { select: { handle: true } },
    },
  });

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
        <div className="columns-1 gap-(--pin-gap) sm:columns-2 lg:columns-3 *:mb-(--pin-gap)">
          {packs.map((p) => {
            const h = p.author.handle!;
            const encH = encodeURIComponent(h);
            const encS = encodeURIComponent(p.slug);
            return (
              <Link
                key={p.id}
                href={`/packs/${h}/${p.slug}`}
                className="block break-inside-avoid"
              >
                <Card className="card-pinterest gap-0 overflow-hidden border-0 pt-0 ring-1 ring-border/80 hover:ring-primary/25">
                  <div className="relative aspect-4/3 w-full overflow-hidden bg-muted">
                    {p.avatarRelPath ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={`/api/packs/${encH}/${encS}/avatar`}
                        alt=""
                        className="size-full object-cover transition-transform duration-500 hover:scale-105"
                      />
                    ) : (
                      <div className="flex size-full items-center justify-center bg-linear-to-br from-accent/40 to-secondary text-sm text-muted-foreground">
                        {t("noAvatar")}
                      </div>
                    )}
                  </div>
                  <CardHeader className="border-0 px-4 pb-2 pt-3">
                    <div className="flex items-start justify-between gap-2">
                      <CardTitle className="line-clamp-2 min-w-0 flex-1 text-base leading-snug">{p.title}</CardTitle>
                      {p.profileViewCount > 10 ? (
                        <span className="flex shrink-0 items-center gap-1 text-xs text-muted-foreground tabular-nums">
                          <Eye className="size-3.5 opacity-70" aria-hidden />
                          {t("viewCount", { count: p.profileViewCount })}
                        </span>
                      ) : null}
                    </div>
                    <CardDescription className="font-mono text-xs">
                      {h}/{p.slug}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <p
                      className={
                        p.summary?.trim()
                          ? "line-clamp-3 text-sm text-muted-foreground"
                          : "line-clamp-2 text-sm italic text-muted-foreground/80"
                      }
                    >
                      {p.summary?.trim() ? p.summary.trim() : t("noSummary")}
                    </p>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </main>
  );
}

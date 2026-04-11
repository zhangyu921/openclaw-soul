import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Sparkles } from "lucide-react";

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
    where: { visibility: PackVisibility.LISTED, author: { handle: { not: null } } },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      slug: true,
      title: true,
      summary: true,
      avatarRelPath: true,
      author: { select: { handle: true } },
    },
  });

  return (
    <main className="mx-auto max-w-[var(--container-max)] px-4 py-10 sm:px-6">
      <div className="mb-10 text-center sm:mb-12">
        <Badge variant="secondary" className="mb-4 gap-1 px-3 py-1 text-xs font-medium">
          <Sparkles className="size-3.5" aria-hidden />
          {t("badge")}
        </Badge>
        <h1 className="font-heading text-balance text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
          {t("heroTitle")}
        </h1>
      </div>

      <HomeIntroStack
        items={[
          { title: t("introWhatLabel"), body: t("introWhatBody") },
          { title: t("introWhoLabel"), body: t("introWhoBody") },
          { title: t("introHowLabel"), body: t("introHowBody") },
        ]}
      />

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
        <div className="columns-1 gap-[var(--pin-gap)] sm:columns-2 lg:columns-3 [&>*]:mb-[var(--pin-gap)]">
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
                  <div className="relative aspect-[4/3] w-full overflow-hidden bg-muted">
                    {p.avatarRelPath ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={`/api/packs/${encH}/${encS}/avatar`}
                        alt=""
                        className="size-full object-cover transition-transform duration-500 hover:scale-105"
                      />
                    ) : (
                      <div className="flex size-full items-center justify-center bg-gradient-to-br from-accent/40 to-secondary text-sm text-muted-foreground">
                        {t("noAvatar")}
                      </div>
                    )}
                  </div>
                  <CardHeader className="border-0 px-4 pb-2 pt-3">
                    <CardTitle className="line-clamp-2 text-base leading-snug">{p.title}</CardTitle>
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

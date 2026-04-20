import { getTranslations, setRequestLocale } from "next-intl/server";
import { Package, Terminal } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import DashboardCreatePackEntry from "./create-pack-dialog";
import RemoveFromDashboardButton from "./remove-from-dashboard-button";
import { CopyPublishCommand } from "./copy-publish-command";
import { Link, redirect } from "@/i18n/navigation";
import { PackVisibility } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { readSessionUserId } from "@/lib/session";

export const dynamic = "force-dynamic";

const rowInteractive =
  "flex gap-4 rounded-xl border border-border/80 bg-card p-3 shadow-sm ring-1 ring-border/40 transition-colors hover:bg-muted/30 hover:ring-primary/20";
const rowStatic =
  "flex gap-4 rounded-xl border border-border/80 bg-card p-3 shadow-sm ring-1 ring-border/40";
const rowMuted =
  "flex gap-4 rounded-xl border border-dashed border-border/60 bg-muted/15 p-3";

type Props = {
  params: Promise<{ locale: string }>;
};

export default async function DashboardPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "dashboard" });

  const userId = await readSessionUserId();
  if (!userId) {
    return redirect({
      href: { pathname: "/login", query: { next: "/dashboard" } },
      locale,
    });
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { handle: true },
  });

  const packs = await prisma.pack.findMany({
    where: { authorId: userId, authorDashboardHiddenAt: null },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      slug: true,
      title: true,
      avatarRelPath: true,
      visibility: true,
    },
  });

  const handle = user?.handle?.trim() ?? null;

  return (
    <div className="mx-auto max-w-lg pb-10">
      <div className="mb-12 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="font-heading text-2xl font-bold tracking-tight">{t("pageTitle")}</h1>
      </div>

      {!handle ? (
        <Card className="mb-8 border-amber-500/25 bg-amber-500/5 shadow-sm dark:border-amber-400/20 dark:bg-amber-400/10">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">{t("handleCardTitle")}</CardTitle>
            <CardDescription>{t("handleCardDescription")}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" size="sm" render={<Link href="/dashboard/tokens" />}>
              {t("handleCardCta")}
            </Button>
          </CardContent>
        </Card>
      ) : null}

      <ul className="space-y-5">
        {packs.length === 0 ? (
          <li>
            <div className={rowMuted}>
              <div className="flex size-14 shrink-0 items-center justify-center rounded-lg bg-muted/50 text-muted-foreground">
                <Package className="size-6" aria-hidden />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="line-clamp-1 font-medium text-muted-foreground">
                    {t("emptyStateTitle")}
                  </span>
                  <Badge variant="secondary" className="shrink-0 text-xs">
                    {t("emptyStateBadge")}
                  </Badge>
                </div>
                <p className="mt-0.5 text-xs text-muted-foreground">{t("emptyStateHint")}</p>
              </div>
            </div>
          </li>
        ) : (
          packs.map((p) => {
            const listed = p.visibility === PackVisibility.LISTED;
            const canLink = Boolean(handle);
            const encH = handle ? encodeURIComponent(handle) : "";
            const encS = encodeURIComponent(p.slug);
            const detailHref =
              handle !== null && handle !== "" ? `/packs/${handle}/${p.slug}` : null;
            const rowClass = canLink ? rowInteractive : rowMuted;
            const inner = (
              <>
                <div className="relative size-14 shrink-0 overflow-hidden rounded-lg bg-muted">
                  {canLink && p.avatarRelPath ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={`/api/packs/${encH}/${encS}/avatar`}
                      alt=""
                      className="size-full object-cover"
                    />
                  ) : (
                    <div className="flex size-full items-center justify-center text-[10px] text-muted-foreground">
                      —
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="line-clamp-1 font-medium text-foreground">{p.title}</span>
                    <Badge variant={listed ? "outline" : "secondary"} className="shrink-0 text-xs">
                      {listed ? t("badgeListed") : t("badgeUnlisted")}
                    </Badge>
                  </div>
                  <p className="mt-2 font-mono text-xs text-muted-foreground">
                    {handle ? `${handle}/${p.slug}` : p.slug}
                  </p>
                </div>
                {canLink ? (
                  <span className="hidden shrink-0 self-center text-sm text-primary sm:inline">
                    {t("rowDetail")}
                  </span>
                ) : null}
              </>
            );
            return (
              <li key={p.id}>
                {canLink && detailHref ? (
                  <div className="flex items-stretch gap-1">
                    <Link href={detailHref} className={`${rowClass} min-w-0 flex-1`}>
                      {inner}
                    </Link>
                    {handle ? (
                      <div className="flex shrink-0 items-center pe-1">
                        <RemoveFromDashboardButton handle={handle} slug={p.slug} />
                      </div>
                    ) : null}
                  </div>
                ) : (
                  <div className={rowClass}>{inner}</div>
                )}
              </li>
            );
          })
        )}

        <DashboardCreatePackEntry hasHandle={Boolean(handle)} />

        <li>
          <div className={rowStatic}>
            <div className="flex size-14 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
              <Terminal className="size-6" aria-hidden />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="line-clamp-1 font-medium text-foreground">
                  {t("publishWorkspaceTitle")}
                </span>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                <CopyPublishCommand />
                <span className="ms-1.5 align-middle">{t("publishWorkspaceHint")}</span>
              </p>
            </div>
          </div>
        </li>
      </ul>
    </div>
  );
}

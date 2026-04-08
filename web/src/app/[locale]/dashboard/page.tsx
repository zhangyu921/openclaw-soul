import { getLocale } from "next-intl/server";
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

export default async function DashboardPage() {
  const userId = await readSessionUserId();
  if (!userId) {
    const locale = await getLocale();
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
    where: { authorId: userId },
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
        <h1 className="font-heading text-2xl font-bold tracking-tight">我的 pack</h1>
      </div>

      {!handle ? (
        <Card className="mb-8 border-amber-500/25 bg-amber-500/5 shadow-sm dark:border-amber-400/20 dark:bg-amber-400/10">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">需要 public handle</CardTitle>
            <CardDescription>
              为 pack 详情链接与发布流程设置唯一 handle（与注册时相同规则）。
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" size="sm" render={<Link href="/dashboard/tokens" />}>
              前往 API tokens 设置
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
                  <span className="line-clamp-1 font-medium text-muted-foreground">暂无 pack</span>
                  <Badge variant="secondary" className="shrink-0 text-xs">
                    空
                  </Badge>
                </div>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  使用下方命令发布后，条目会出现在上方。
                </p>
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
                      {listed ? "公开中" : "未公开"}
                    </Badge>
                  </div>
                  <p className="mt-2 font-mono text-xs text-muted-foreground">
                    {handle ? `${handle}/${p.slug}` : p.slug}
                  </p>
                </div>
                {canLink ? (
                  <span className="hidden shrink-0 self-center text-sm text-primary sm:inline">
                    详情
                  </span>
                ) : null}
              </>
            );
            return (
              <li key={p.id}>
                {canLink && detailHref ? (
                  <Link href={detailHref} className={rowClass}>
                    {inner}
                  </Link>
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
                <span className="line-clamp-1 font-medium text-foreground">在本机 workspace 发布</span>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                <CopyPublishCommand />
                <span className="ms-1.5 align-middle">上传或更新 pack</span>
              </p>
            </div>
          </div>
        </li>
      </ul>
    </div>
  );
}

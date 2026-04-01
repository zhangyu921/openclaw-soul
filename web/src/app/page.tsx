import Link from "next/link";
import { Sparkles } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function Home() {
  const packs = await prisma.pack.findMany({
    where: { revokedAt: null, author: { handle: { not: null } } },
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
          OpenClaw Soul · personas &amp; workspaces
        </Badge>
        <h1 className="font-heading text-balance text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
          画廊里逛 pack，一键装进你的 OpenClaw
        </h1>
        <p className="mx-auto mt-3 max-w-2xl text-pretty text-base text-muted-foreground sm:text-lg">
          <strong className="font-medium text-foreground">这是什么：</strong>
          社区发布的可安装 workspace pack（人设、提示与文件一起打包）。
          <strong className="ms-1 font-medium text-foreground">为谁：</strong>
          已经在用 OpenClaw、想换对话气质或复刻他人工作区的人——情感向人设与纯功能向 pack 都能上架。
          <strong className="ms-1 font-medium text-foreground">同款怎么来：</strong>
          下面一条命令 apply 到本机。
        </p>
        <p className="mt-4 text-sm text-muted-foreground">
          <code className="rounded-md bg-muted px-2 py-0.5 font-mono text-xs">
            npx @openclaw-soul/cli apply &lt;handle&gt;/&lt;slug&gt;
          </code>
        </p>
      </div>

      {packs.length === 0 ? (
        <Card className="mx-auto max-w-md border-dashed text-center shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">画廊还是空的</CardTitle>
            <CardDescription>
              你是作者的话：先 publish 第一个 pack，逛选与 apply 才有东西可看——人设向或工具向都行。
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              从本机 workspace 上架：
            </p>
            <p className="mt-2">
              <code className="rounded-md bg-muted px-2 py-0.5 font-mono text-xs">
                npx @openclaw-soul/cli publish
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
                        No avatar
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
                      {p.summary?.trim() ? p.summary.trim() : "暂无简介"}
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

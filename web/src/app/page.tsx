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
    <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <div className="mb-10 text-center sm:mb-12">
        <Badge variant="secondary" className="mb-4 gap-1 px-3 py-1 text-xs font-medium">
          <Sparkles className="size-3.5" aria-hidden />
          OpenClaw personas &amp; workspaces
        </Badge>
        <h1 className="font-heading text-balance text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
          发现有趣的人设与工作区 pack
        </h1>
        <p className="mx-auto mt-3 max-w-2xl text-pretty text-base text-muted-foreground sm:text-lg">
          像逛灵感板一样浏览社区分享；看中了就用 CLI 一键应用到本机 OpenClaw。
        </p>
        <p className="mt-4 text-sm text-muted-foreground">
          <code className="rounded-md bg-muted px-2 py-0.5 font-mono text-xs">
            ocs apply &lt;handle&gt;/&lt;slug&gt;
          </code>
          {" · "}
          <Link href="/privacy" className="font-medium text-primary underline-offset-4 hover:underline">
            上传与隐私说明
          </Link>
        </p>
      </div>

      {packs.length === 0 ? (
        <Card className="mx-auto max-w-md border-dashed text-center shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">还没有 pack</CardTitle>
            <CardDescription>
              用 CLI 发布第一个，这里就会像瀑布流一样铺满卡片。
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="font-mono text-xs text-muted-foreground">pnpm run ocs -- publish</p>
          </CardContent>
        </Card>
      ) : (
        <div className="columns-1 gap-5 sm:columns-2 lg:columns-3 [&>*]:mb-5">
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
                <Card className="overflow-hidden border-0 shadow-md ring-1 ring-border/80 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:ring-primary/25">
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
                  <CardHeader className="pb-2">
                    <CardTitle className="line-clamp-2 text-base leading-snug">{p.title}</CardTitle>
                    <CardDescription className="font-mono text-xs">
                      {h}/{p.slug}
                    </CardDescription>
                  </CardHeader>
                  {p.summary ? (
                    <CardContent className="pt-0">
                      <p className="line-clamp-3 text-sm text-muted-foreground">{p.summary}</p>
                    </CardContent>
                  ) : null}
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </main>
  );
}

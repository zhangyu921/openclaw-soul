import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { headers } from "next/headers";
import { notFound } from "next/navigation";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { siteOriginFromNextHeaders } from "@/lib/device-auth";
import { prisma } from "@/lib/prisma";
import { readSessionUserId } from "@/lib/session";
import { privacyLinkClassName } from "@/lib/utils";
import { parsePackFilePaths } from "@/lib/zip-pack-preview";

import AvatarUpload from "./avatar-upload";
import PackRevokeButton from "./pack-revoke";
import PackSummaryEdit from "./pack-summary-edit";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ handle: string; slug: string }> };

export default async function PackDetailPage({ params }: Props) {
  const { handle, slug } = await params;
  const siteOrigin = siteOriginFromNextHeaders(await headers());
  const userId = await readSessionUserId();
  const pack = await prisma.pack.findFirst({
    where: { slug, author: { handle } },
    select: {
      slug: true,
      title: true,
      summary: true,
      avatarRelPath: true,
      createdAt: true,
      authorId: true,
      revokedAt: true,
      soulPreviewMd: true,
      soulPreviewTruncated: true,
      packFilePaths: true,
      author: { select: { handle: true } },
    },
  });
  if (!pack || !pack.author.handle) notFound();
  const isAuthor = Boolean(userId && pack.authorId === userId);
  if (pack.revokedAt && !isAuthor) notFound();
  const isRevoked = Boolean(pack.revokedAt);

  const encH = encodeURIComponent(pack.author.handle);
  const encS = encodeURIComponent(pack.slug);
  const downloadUrl = `/api/packs/${encH}/${encS}/download`;
  const filePaths = parsePackFilePaths(pack.packFilePaths);
  const showPreview =
    (Boolean(pack.soulPreviewMd) || filePaths.length > 0) && (isAuthor || !isRevoked);

  return (
    <main className="mx-auto max-w-2xl px-4 py-8 sm:px-6 sm:py-10">
      <Button variant="ghost" size="sm" className="mb-6 gap-1 text-muted-foreground" render={<Link href="/" />}>
        <ArrowLeft className="size-4" aria-hidden />
        Back to gallery
      </Button>

      <Card className="overflow-hidden border-0 shadow-lg ring-1 ring-border/80">
        <div className="flex flex-col gap-6 p-6 sm:flex-row sm:items-start">
          <div className="mx-auto flex shrink-0 items-start gap-2 sm:mx-0">
            <div className="size-28 shrink-0 overflow-hidden rounded-2xl bg-muted shadow-inner ring-1 ring-border/60 sm:size-32">
              {pack.avatarRelPath ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={`/api/packs/${encH}/${encS}/avatar`}
                  alt=""
                  className="size-full object-cover"
                />
              ) : (
                <div className="flex size-full items-center justify-center bg-gradient-to-br from-accent/50 to-secondary text-xs text-muted-foreground">
                  No avatar
                </div>
              )}
            </div>
            {isAuthor ? <AvatarUpload handle={pack.author.handle} slug={pack.slug} /> : null}
          </div>
          <div className="min-w-0 flex-1 text-center sm:text-left">
            <h1 className="font-heading text-balance text-2xl font-bold tracking-tight sm:text-3xl">
              {pack.title}
            </h1>
            <p className="mt-1 font-mono text-sm text-muted-foreground">
              {pack.author.handle}/{pack.slug}
            </p>
            <PackSummaryEdit
              handle={pack.author.handle}
              slug={pack.slug}
              initialSummary={pack.summary}
              isAuthor={isAuthor}
            />
          </div>
        </div>
      </Card>

      {showPreview ? (
        <div className="mt-8 space-y-6">
          {pack.soulPreviewMd ? (
            <Card className="border-0 shadow-md ring-1 ring-border/80">
              <CardHeader>
                <CardTitle className="text-base">SOUL.md</CardTitle>
                <CardDescription>
                  发布时从 zip 内提取；完整内容以打包文件为准。
                  {pack.soulPreviewTruncated ? " 以下正文已按长度截断。" : null}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <pre className="max-h-[min(70vh,32rem)] overflow-auto whitespace-pre-wrap break-words rounded-xl bg-muted p-4 font-mono text-sm leading-relaxed">
                  {pack.soulPreviewMd}
                </pre>
              </CardContent>
            </Card>
          ) : null}

          {filePaths.length > 0 ? (
            <Card className="border-0 shadow-md ring-1 ring-border/80">
              <CardHeader>
                <CardTitle className="text-base">包内文件</CardTitle>
                <CardDescription>
                  共 {filePaths.length} 条路径
                  {filePaths.length >= 300 ? "（已达单包展示上限 300，更多请下载 zip）" : ""}。
                  其他文件的完整内容请使用下方 Download zip。
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="max-h-64 overflow-y-auto rounded-xl border border-border/80 bg-muted/40 px-3 py-2 font-mono text-xs leading-relaxed text-muted-foreground">
                  {filePaths.map((p) => (
                    <li key={p} className="break-all py-0.5">
                      {p}
                    </li>
                  ))}
                </ul>
                <p className="mt-3 text-sm text-muted-foreground">
                  仅作目录展示；在线通览更多文件的能力可在后续版本加入。
                </p>
              </CardContent>
            </Card>
          ) : null}
        </div>
      ) : null}

      {isRevoked ? (
        <Card className="mt-6 border-dashed bg-muted/30">
          <CardContent className="pt-6 text-sm text-muted-foreground">
            此 pack 已从画廊下架，访客无法打开。重新公开：{" "}
            <code className="rounded-md bg-muted px-1.5 py-0.5 font-mono text-xs">
              npx @openclaw-soul/cli publish --replace
            </code>
            。说明见{" "}
            <Link href="/privacy#revoke" className={privacyLinkClassName}>
              隐私说明
            </Link>
            。
          </CardContent>
        </Card>
      ) : null}

      {isAuthor && !isRevoked ? (
        <PackRevokeButton handle={pack.author.handle} slug={pack.slug} />
      ) : null}

      <Card className="mt-8 border-0 shadow-md ring-1 ring-border/80">
        <CardHeader>
          <CardTitle className="text-base">CLI</CardTitle>
          <CardDescription>
            Apply 会写入{" "}
            <code className="font-mono text-xs">openclaw.json</code> 中的{" "}
            <code className="font-mono text-xs">agents.defaults.workspace</code>，并解压到{" "}
            <code className="font-mono text-xs">~/.openclaw/workspace-{pack.slug}</code>
            （与{" "}
            <a
              className="font-medium text-primary underline-offset-4 hover:underline"
              href="https://docs.openclaw.ai/concepts/agent-workspace"
              rel="noopener noreferrer"
              target="_blank"
            >
              OpenClaw 文档
            </a>
            一致）
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!isRevoked ? (
            <>
              <pre className="overflow-x-auto rounded-xl bg-muted p-4 font-mono text-sm leading-relaxed">
                {`export OPENCLAW_SOUL_API=${siteOrigin}
npx @openclaw-soul/cli apply ${pack.author.handle}/${pack.slug}`}
              </pre>
              <div>
                <p className="mb-2 text-sm font-medium text-muted-foreground">Raw zip</p>
                <Button variant="outline" size="sm" render={<a href={downloadUrl} />}>
                  Download {pack.slug}.zip
                </Button>
              </div>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">
              已下架：下载与 apply 已关闭。说明见{" "}
              <Link href="/privacy#revoke" className={privacyLinkClassName}>
                隐私说明
              </Link>
              。
            </p>
          )}
        </CardContent>
      </Card>
    </main>
  );
}

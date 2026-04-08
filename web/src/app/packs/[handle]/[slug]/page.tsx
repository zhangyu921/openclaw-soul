import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { notFound } from "next/navigation";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { PackVisibility } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { readSessionUserId } from "@/lib/session";
import { cn, privacyLinkClassName } from "@/lib/utils";
import { normalizeShowcaseImageRefs } from "@/lib/showcase-refs";
import AvatarUpload from "./avatar-upload";
import PackShowcase from "./pack-showcase";
import PackSourceFiles from "./pack-source-files";
import PackPublishButton from "./pack-publish";
import PackRevokeButton from "./pack-revoke";
import PackSummaryEdit from "./pack-summary-edit";
import PackTitleEdit from "./pack-title-edit";
import PackChat from "./pack-chat";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ handle: string; slug: string }> };

export default async function PackDetailPage({ params }: Props) {
  const { handle, slug } = await params;
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
      visibility: true,
      showcaseMd: true,
      showcaseImageRefs: true,
      author: { select: { handle: true } },
      markdownFiles: { select: { path: true } },
      binaryFiles: { select: { path: true } },
    },
  });
  if (!pack || !pack.author.handle) notFound();
  const isAuthor = Boolean(userId && pack.authorId === userId);
  if (pack.visibility === PackVisibility.UNLISTED && !isAuthor) notFound();
  const isListed = pack.visibility === PackVisibility.LISTED;

  const encH = encodeURIComponent(pack.author.handle);
  const encS = encodeURIComponent(pack.slug);
  const downloadUrl = `/api/packs/${encH}/${encS}/download`;
  const sourceFiles = [
    ...pack.markdownFiles.map((m) => ({
      path: m.path,
      kind: "markdown" as const,
    })),
    ...pack.binaryFiles.map((b) => ({
      path: b.path,
      kind: "binary" as const,
    })),
  ].sort((a, b) => a.path.localeCompare(b.path));
  const sourceEmpty = sourceFiles.length === 0;
  const showSourceFilesSection =
    isAuthor || (isListed && sourceFiles.length > 0);
  const showcaseRefs = normalizeShowcaseImageRefs(pack.showcaseImageRefs);
  const showcaseImageCount = showcaseRefs.length;
  const showcaseImageAspects: (number | null)[] = showcaseRefs.map((r) =>
    r.width && r.height && r.width > 0 && r.height > 0 ? r.width / r.height : null
  );

  return (
    <main className="mx-auto max-w-2xl px-4 py-8 sm:px-6 sm:py-10">
      <Button variant="ghost" size="sm" className="mb-6 gap-1 text-muted-foreground" render={<Link href="/" />}>
        <ArrowLeft className="size-4" aria-hidden />
        Back to gallery
      </Button>

      <Card className="overflow-hidden border-0 shadow-lg ring-1 ring-border/80">
        <div className="flex flex-col gap-6 p-6 sm:flex-row sm:items-start">
          <div className="group relative mx-auto shrink-0 sm:mx-0">
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
            {isAuthor ? (
              <div
                className={cn(
                  "absolute -right-2 -top-2 z-10 transition-opacity duration-200",
                  pack.avatarRelPath
                    ? "opacity-100 sm:opacity-0 sm:pointer-events-none sm:group-hover:opacity-100 sm:group-hover:pointer-events-auto sm:focus-within:opacity-100 sm:focus-within:pointer-events-auto"
                    : "opacity-100"
                )}
              >
                <AvatarUpload handle={pack.author.handle} slug={pack.slug} />
              </div>
            ) : null}
          </div>
          <div className="min-w-0 flex-1 text-center sm:text-left">
            <PackTitleEdit
              handle={pack.author.handle}
              slug={pack.slug}
              initialTitle={pack.title}
              isAuthor={isAuthor}
            />
            <PackSummaryEdit
              handle={pack.author.handle}
              slug={pack.slug}
              initialSummary={pack.summary}
              isAuthor={isAuthor}
            />
            <p className="mt-3 font-mono text-sm text-muted-foreground">
              {pack.author.handle}/{pack.slug}
            </p>
          </div>
        </div>
      </Card>

      <PackShowcase
        handle={pack.author.handle}
        slug={pack.slug}
        initialShowcaseMd={pack.showcaseMd}
        imageCount={showcaseImageCount}
        showcaseImageAspects={showcaseImageAspects}
        isAuthor={isAuthor}
        isListed={isListed}
      />

      <PackChat
        handle={pack.author.handle}
        slug={pack.slug}
        userId={userId}
        packTitle={pack.title}
      />

      {showSourceFilesSection ? (
        <div className="mt-8 space-y-6">
          <PackSourceFiles
            handle={pack.author.handle}
            slug={pack.slug}
            files={sourceFiles}
            isAuthor={isAuthor}
          />
        </div>
      ) : null}

      {isAuthor && !isListed ? (
        <Card className="mt-6 border-dashed bg-muted/30">
          <CardContent className="space-y-3 pt-6 text-sm text-muted-foreground">
            <p>
              当前 pack <strong className="text-foreground">未在画廊公开</strong>
              ，访客无法打开此链接。上架到画廊后可被浏览与 apply。
            </p>
            <PackPublishButton
              handle={pack.author.handle}
              slug={pack.slug}
              disableWhenEmpty={sourceEmpty}
            />
            <p className="text-xs">
              说明见{" "}
              <Link href="/privacy#revoke" className={privacyLinkClassName}>
                隐私说明
              </Link>
              。
            </p>
          </CardContent>
        </Card>
      ) : null}

      {isAuthor && isListed ? (
        <PackRevokeButton handle={pack.author.handle} slug={pack.slug} />
      ) : null}

      <Card className="mt-8 border-0 shadow-md ring-1 ring-border/80">
        <CardHeader>
          <CardTitle className="text-base">CLI</CardTitle>
          <CardDescription>
            逛到对味的 pack 后，一条命令装进本机 OpenClaw：会写入{" "}
            <code className="font-mono text-xs">openclaw.json</code> 中的{" "}
            <code className="font-mono text-xs">agents.defaults.workspace</code>，并解压到{" "}
            <code className="font-mono text-xs">~/.openclaw/workspace-{pack.slug}</code>
            。路径与含义见{" "}
            <a
              className="font-medium text-primary underline-offset-4 hover:underline"
              href="https://docs.openclaw.ai/concepts/agent-workspace"
              rel="noopener noreferrer"
              target="_blank"
            >
              OpenClaw 文档（agent workspace）
            </a>
            。
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <pre className="overflow-x-auto rounded-xl bg-muted p-4 font-mono text-sm leading-relaxed">
            {`npx @openclaw-soul/cli apply ${pack.author.handle}/${pack.slug}`}
          </pre>
          <div>
            <p className="mb-2 text-sm font-medium text-muted-foreground">Raw zip</p>
            {sourceEmpty ? (
              <div className="space-y-2">
                <Button type="button" variant="outline" size="sm" disabled>
                  Download {pack.slug}.zip
                </Button>
                <p className="text-xs text-muted-foreground">
                  至少添加一个包内文件后可下载 zip。
                </p>
              </div>
            ) : (
              <Button variant="outline" size="sm" render={<a href={downloadUrl} />}>
                Download {pack.slug}.zip
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </main>
  );
}

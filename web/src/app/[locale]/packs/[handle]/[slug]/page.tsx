import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
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
import { privacyLinkClassName } from "@/lib/utils";
import { normalizeShowcaseImageRefs } from "@/lib/showcase-refs";
import { buildPackApplyCommand } from "@/lib/pack-apply-cmd";
import { shouldCountPackProfileView } from "@/lib/pack-profile-view";
import PackApplyCommand from "./pack-apply-command";
import PackAvatarBlock from "./pack-avatar-block";
import PackShowcase from "./pack-showcase";
import PackSourceFiles from "./pack-source-files";
import PackPublishButton from "./pack-publish";
import PackRevokeButton from "./pack-revoke";
import PackSummaryEdit from "./pack-summary-edit";
import PackTitleEdit from "./pack-title-edit";
import PackChat from "./pack-chat";
import PackForkButton from "./pack-fork-button";
import PackForkFromTip from "./pack-fork-from-tip";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ locale: string; handle: string; slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, handle, slug } = await params;
  const pack = await prisma.pack.findFirst({
    where: { slug, author: { handle } },
    select: { title: true },
  });
  if (!pack) {
    return { title: "OpenClaw Soul" };
  }
  const t = await getTranslations({ locale, namespace: "packDetail" });
  const title = pack.title.trim() || `${handle}/${slug}`;
  return {
    title: `${title} · OpenClaw Soul`,
    description: t("pageMetaDescription", { title }),
  };
}

export default async function PackDetailPage({ params }: Props) {
  const { locale, handle, slug } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "packDetail" });

  const userId = await readSessionUserId();
  const pack = await prisma.pack.findFirst({
    where: { slug, author: { handle } },
    select: {
      id: true,
      slug: true,
      title: true,
      summary: true,
      avatarRelPath: true,
      createdAt: true,
      authorId: true,
      visibility: true,
      authorDashboardHiddenAt: true,
      showcaseMd: true,
      showcaseImageRefs: true,
      forkedFromPackId: true,
      forkedFromHandle: true,
      forkedFromSlug: true,
      author: { select: { handle: true } },
      markdownFiles: { select: { path: true } },
      binaryFiles: { select: { path: true } },
    },
  });
  if (!pack || !pack.author.handle) notFound();
  const currentUser = userId
    ? await prisma.user.findUnique({ where: { id: userId }, select: { handle: true } })
    : null;
  const isAuthor = Boolean(userId && pack.authorId === userId);
  if (pack.authorDashboardHiddenAt && !isAuthor) notFound();
  if (pack.visibility === PackVisibility.UNLISTED && !isAuthor) notFound();
  const isListed = pack.visibility === PackVisibility.LISTED;

  if (shouldCountPackProfileView({ sessionUserId: userId, authorId: pack.authorId })) {
    try {
      await prisma.pack.update({
        where: { id: pack.id },
        data: { profileViewCount: { increment: 1 } },
      });
    } catch (e) {
      console.error("pack profileViewCount increment failed", e);
    }
  }

  const encH = encodeURIComponent(pack.author.handle);
  const encS = encodeURIComponent(pack.slug);
  const downloadUrl = `/api/packs/${encH}/${encS}/download`;
  const hasAvatar = Boolean(pack.avatarRelPath);
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

  let forkSourceLinkable = false;
  if (
    pack.forkedFromHandle?.trim() &&
    pack.forkedFromSlug?.trim() &&
    pack.forkedFromPackId
  ) {
    const src = await prisma.pack.findUnique({
      where: { id: pack.forkedFromPackId },
      select: {
        visibility: true,
        authorDashboardHiddenAt: true,
        slug: true,
        author: { select: { handle: true } },
      },
    });
    forkSourceLinkable = Boolean(
      src &&
        src.visibility === PackVisibility.LISTED &&
        !src.authorDashboardHiddenAt &&
        src.slug.trim() === pack.forkedFromSlug!.trim() &&
        src.author.handle?.trim() === pack.forkedFromHandle!.trim()
    );
  }

  const showForkButton =
    Boolean(userId) && !isAuthor && isListed && !pack.authorDashboardHiddenAt;

  const forkTipVisible =
    isAuthor &&
    Boolean(pack.forkedFromHandle?.trim()) &&
    Boolean(pack.forkedFromSlug?.trim());

  return (
    <main className="mx-auto max-w-2xl px-4 py-8 sm:px-6 sm:py-10">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
        <Button
          variant="ghost"
          size="sm"
          className="gap-1 text-muted-foreground"
          render={<Link href="/" />}
        >
          <ArrowLeft className="size-4" aria-hidden />
          {t("backToGallery")}
        </Button>
        {forkTipVisible || showForkButton ? (
          <div className="flex min-w-0 max-w-full flex-wrap items-center justify-end gap-x-3 gap-y-1 sm:max-w-[min(100%,24rem)]">
            {forkTipVisible ? (
              <PackForkFromTip
                intro={t("forkFromIntro")}
                forkedFromHandle={pack.forkedFromHandle!.trim()}
                forkedFromSlug={pack.forkedFromSlug!.trim()}
                sourceLinkable={forkSourceLinkable}
              />
            ) : null}
            {showForkButton ? (
              <PackForkButton
                userHandle={currentUser?.handle ?? undefined}
                sourceHandle={pack.author.handle}
                sourceSlug={pack.slug}
              />
            ) : null}
          </div>
        ) : null}
      </div>

      <Card className="overflow-hidden border-0 shadow-lg ring-1 ring-border/80">
        <div className="flex flex-col gap-6 p-6 sm:flex-row sm:items-start">
          <PackAvatarBlock
            handle={pack.author.handle}
            slug={pack.slug}
            hasAvatar={hasAvatar}
            isAuthor={isAuthor}
          />
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
            <div className="mt-3">
              <PackApplyCommand handle={pack.author.handle} slug={pack.slug} />
            </div>
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
        sourceEmpty={sourceEmpty}
        isAuthor={isAuthor}
        showcaseImageCount={showcaseImageCount}
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
            <p>{t("unlistedBody")}</p>
            <PackPublishButton
              handle={pack.author.handle}
              slug={pack.slug}
              disableWhenEmpty={sourceEmpty}
            />
            <p className="text-xs">
              {t("unlistedPrivacy")}{" "}
              <Link href="/privacy#revoke" className={privacyLinkClassName}>
                {t("unlistedPrivacyLink")}
              </Link>
              {locale === "zh" ? "。" : "."}
            </p>
          </CardContent>
        </Card>
      ) : null}

      {isAuthor && isListed ? (
        <PackRevokeButton handle={pack.author.handle} slug={pack.slug} />
      ) : null}

      <Card className="mt-8 border-0 shadow-md ring-1 ring-border/80">
        <CardHeader>
          <CardTitle className="text-base">{t("cliCardTitle")}</CardTitle>
          <CardDescription className="space-y-2">
            <p className="text-pretty">{t("cliCardDesc")}</p>
            <p>
              <a
                className="font-medium text-primary underline-offset-4 hover:underline"
                href="https://docs.openclaw.ai/concepts/agent-workspace"
                rel="noopener noreferrer"
                target="_blank"
              >
                {t("cliCardDoc")}
              </a>
            </p>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <pre className="overflow-x-auto rounded-xl bg-muted p-4 font-mono text-sm leading-relaxed">
            {buildPackApplyCommand(pack.author.handle, pack.slug)}
          </pre>
          <div>
            <p className="mb-2 text-sm font-medium text-muted-foreground">{t("rawZip")}</p>
            {sourceEmpty ? (
              <div className="space-y-2">
                <Button type="button" variant="outline" size="sm" disabled>
                  {t("downloadZip", { slug: pack.slug })}
                </Button>
                <p className="text-xs text-muted-foreground">{t("downloadDisabledHint")}</p>
              </div>
            ) : (
              <Button variant="outline" size="sm" render={<a href={downloadUrl} />}>
                {t("downloadZip", { slug: pack.slug })}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </main>
  );
}

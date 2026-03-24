import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { readSessionUserId } from "@/lib/session";
import AvatarUpload from "./avatar-upload";
import PackRevokeButton from "./pack-revoke";

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
      revokedAt: true,
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

  return (
    <div className="min-h-full bg-zinc-50 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100">
      <header className="border-b border-zinc-200 bg-white px-6 py-4 dark:border-zinc-800 dark:bg-zinc-900">
        <div className="mx-auto flex max-w-2xl items-center justify-between">
          <Link href="/" className="text-sm text-zinc-500 underline">
            ← Gallery
          </Link>
        </div>
      </header>
      <main className="mx-auto max-w-2xl px-6 py-10">
        <div className="flex gap-6">
          <div className="h-24 w-24 shrink-0 overflow-hidden rounded-xl bg-zinc-100 dark:bg-zinc-800">
            {pack.avatarRelPath ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={`/api/packs/${encH}/${encS}/avatar`}
                alt=""
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-xs text-zinc-400">
                no avatar
              </div>
            )}
          </div>
          <div>
            <h1 className="text-2xl font-semibold">{pack.title}</h1>
            <p className="mt-1 font-mono text-sm text-zinc-500">
              {pack.author.handle}/{pack.slug}
            </p>
            {pack.summary ? (
              <p className="mt-4 text-zinc-600 dark:text-zinc-400">{pack.summary}</p>
            ) : null}
          </div>
        </div>

        {isRevoked ? (
          <p className="mt-6 rounded-lg border border-zinc-300 bg-zinc-100 px-4 py-3 text-sm text-zinc-800 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-200">
            此 pack 已从公开画廊撤销；他人无法访问本页或下载。上传条款见{" "}
            <Link href="/privacy" className="underline">
              /privacy
            </Link>
            。重新公开请使用 CLI{" "}
            <code className="rounded bg-white px-1 dark:bg-zinc-800">ocs publish --replace</code>。
          </p>
        ) : null}

        {isAuthor ? <AvatarUpload handle={pack.author.handle} slug={pack.slug} /> : null}

        {isAuthor && !isRevoked ? (
          <PackRevokeButton handle={pack.author.handle} slug={pack.slug} />
        ) : null}

        <section className="mt-10 space-y-4 rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
          <h2 className="text-sm font-medium text-zinc-500">CLI</h2>
          {!isRevoked ? (
            <>
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                Apply (updates{" "}
                <code className="rounded bg-zinc-100 px-1 dark:bg-zinc-800">openclaw.json</code> and
                extracts to{" "}
                <code className="rounded bg-zinc-100 px-1 dark:bg-zinc-800">
                  ~/.openclaw/workspace-{pack.slug}
                </code>
                ):
              </p>
              <pre className="overflow-x-auto rounded-lg bg-zinc-100 p-4 text-sm dark:bg-zinc-950">
                {`export OPENCLAW_SOUL_API=http://localhost:3000
ocs apply ${pack.author.handle}/${pack.slug}`}
              </pre>
              <p className="text-sm text-zinc-600 dark:text-zinc-400">Raw zip:</p>
              <a
                href={downloadUrl}
                className="inline-block text-sm font-medium text-zinc-900 underline dark:text-zinc-100"
              >
                Download {pack.slug}.zip
              </a>
            </>
          ) : (
            <p className="text-sm text-zinc-500">
              已撤销：公开下载与 apply 链接已关闭。详见{" "}
              <Link href="/privacy" className="underline">
                Privacy
              </Link>
              。
            </p>
          )}
        </section>
      </main>
    </div>
  );
}

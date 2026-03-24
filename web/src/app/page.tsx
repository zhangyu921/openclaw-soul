import Link from "next/link";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function Home() {
  const packs = await prisma.pack.findMany({
    orderBy: { createdAt: "desc" },
    select: { slug: true, title: true, summary: true, avatarRelPath: true },
  });

  return (
    <div className="min-h-full bg-zinc-50 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100">
      <header className="border-b border-zinc-200 bg-white px-6 py-4 dark:border-zinc-800 dark:bg-zinc-900">
        <div className="mx-auto flex max-w-4xl items-center justify-between">
          <h1 className="text-lg font-semibold">OpenClaw Soul</h1>
          <nav className="flex gap-4 text-sm">
            <Link href="/login" className="text-zinc-600 hover:underline dark:text-zinc-400">
              Login
            </Link>
            <Link href="/register" className="text-zinc-600 hover:underline dark:text-zinc-400">
              Register
            </Link>
            <Link
              href="/dashboard/tokens"
              className="text-zinc-600 hover:underline dark:text-zinc-400"
            >
              API tokens
            </Link>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-4xl px-6 py-10">
        <p className="mb-8 text-zinc-600 dark:text-zinc-400">
          Browse OpenClaw workspace packs. Apply with CLI:{" "}
          <code className="rounded bg-zinc-200 px-1.5 py-0.5 text-sm dark:bg-zinc-800">
            ocs apply &lt;slug&gt;
          </code>
        </p>
        {packs.length === 0 ? (
          <p className="text-zinc-500">No packs yet. Publish one with the CLI.</p>
        ) : (
          <ul className="grid gap-6 sm:grid-cols-2">
            {packs.map((p) => (
              <li key={p.slug}>
                <Link
                  href={`/packs/${p.slug}`}
                  className="flex gap-4 rounded-xl border border-zinc-200 bg-white p-4 shadow-sm transition hover:border-zinc-300 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-zinc-700"
                >
                  <div className="h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-zinc-100 dark:bg-zinc-800">
                    {p.avatarRelPath ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={`/api/packs/${encodeURIComponent(p.slug)}/avatar`}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-xs text-zinc-400">
                        no avatar
                      </div>
                    )}
                  </div>
                  <div className="min-w-0">
                    <h2 className="font-medium text-zinc-900 dark:text-zinc-50">{p.title}</h2>
                    <p className="truncate text-sm text-zinc-500">{p.slug}</p>
                    {p.summary ? (
                      <p className="mt-1 line-clamp-2 text-sm text-zinc-600 dark:text-zinc-400">
                        {p.summary}
                      </p>
                    ) : null}
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}

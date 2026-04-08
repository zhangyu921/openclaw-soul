import { getLocale } from "next-intl/server";

import { redirect } from "@/i18n/navigation";
import { prisma } from "@/lib/prisma";
import { readSessionUserId } from "@/lib/session";
import TokenPanel from "./token-panel";

export const dynamic = "force-dynamic";

export default async function TokensPage() {
  const userId = await readSessionUserId();
  if (!userId) {
    const locale = await getLocale();
    return redirect({
      href: { pathname: "/login", query: { next: "/dashboard/tokens" } },
      locale,
    });
  }

  const [rows, user] = await Promise.all([
    prisma.apiToken.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      select: { id: true, label: true, createdAt: true },
    }),
    prisma.user.findUnique({
      where: { id: userId },
      select: { handle: true },
    }),
  ]);

  const initialTokens = rows.map((t) => ({
    id: t.id,
    label: t.label,
    createdAt: t.createdAt.toISOString(),
  }));

  return (
    <TokenPanel
      initialTokens={initialTokens}
      publicHandle={user?.handle ?? null}
    />
  );
}

import type { PrismaClient } from "@/generated/prisma/client";

export const PACK_CHAT_PATHS = ["SOUL.md", "IDENTITY.md", "AGENTS.md"] as const;

export type PackMarkdownLayers = {
  soul: string;
  identity: string;
  agents: string;
};

function missingLine(path: string): string {
  return `(文件缺失: ${path})`;
}

export async function loadPackMarkdownLayers(
  db: PrismaClient,
  packId: string
): Promise<PackMarkdownLayers> {
  const paths = [...PACK_CHAT_PATHS];
  const rows = await db.packMarkdownFile.findMany({
    where: { packId, path: { in: paths } },
    select: { path: true, content: true },
  });
  const map = new Map(rows.map((r) => [r.path, r.content]));
  return {
    soul: map.get("SOUL.md") ?? missingLine("SOUL.md"),
    identity: map.get("IDENTITY.md") ?? missingLine("IDENTITY.md"),
    agents: map.get("AGENTS.md") ?? missingLine("AGENTS.md"),
  };
}

export function buildPackChatSystemPrompt(layers: PackMarkdownLayers & { userBlock: string }): string {
  const sep = "\n\n---\n\n";
  return [
    "## SOUL.md\n\n" + layers.soul,
    "## IDENTITY.md\n\n" + layers.identity,
    "## USER（当前对话者）\n\n" + layers.userBlock.trim(),
    "## AGENTS.md\n\n" + layers.agents,
  ].join(sep);
}

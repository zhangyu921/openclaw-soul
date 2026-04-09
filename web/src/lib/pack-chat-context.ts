import type { PrismaClient } from "@/generated/prisma/client";

import { DEFAULT_PACK_AGENTS_MD } from "@/lib/default-pack-agents-md";

export const PACK_CHAT_PATHS = ["SOUL.md", "IDENTITY.md", "AGENTS.md"] as const;

export type PackMarkdownLayers = {
  soul: string;
  identity: string;
  /** Pack 根目录 `AGENTS.md` 全文；无上传或为空则为 `null`，不渲染 USER-UPLOAD-AGENTS 段。 */
  agentsUserUpload: string | null;
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
  const rawAgents = map.get("AGENTS.md");
  const agentsUserUpload =
    rawAgents !== undefined && rawAgents.trim() !== "" ? rawAgents : null;
  return {
    soul: map.get("SOUL.md") ?? missingLine("SOUL.md"),
    identity: map.get("IDENTITY.md") ?? missingLine("IDENTITY.md"),
    agentsUserUpload,
  };
}

export function buildPackChatSystemPrompt(layers: PackMarkdownLayers & { userBlock: string }): string {
  const sep = "\n\n---\n\n";
  const parts: string[] = [
    "## AGENTS.md（OpenClaw Soul）\n\n" + DEFAULT_PACK_AGENTS_MD.trim(),
  ];
  if (layers.agentsUserUpload != null && layers.agentsUserUpload.trim() !== "") {
    parts.push("## USER-UPLOAD-AGENTS.md\n\n" + layers.agentsUserUpload.trim());
  }
  parts.push(
    "## SOUL.md\n\n" + layers.soul,
    "## IDENTITY.md\n\n" + layers.identity,
    "## USER（当前对话者）\n\n" + layers.userBlock.trim(),
  );
  return parts.join(sep);
}

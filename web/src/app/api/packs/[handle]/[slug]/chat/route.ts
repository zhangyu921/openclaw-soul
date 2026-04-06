import {
  convertToModelMessages,
  streamText,
  type UIMessage,
} from "ai";
import { NextResponse } from "next/server";

import { resolvePackChatModel } from "@/lib/chat-model";
import { canViewPack } from "@/lib/pack-access";
import { perUserMinuteLimitPolicy, runChatAbusePolicies } from "@/lib/pack-chat-abuse";
import { MAX_USER_BLOCK_CHARS } from "@/lib/pack-chat-constants";
import {
  buildPackChatSystemPrompt,
  loadPackMarkdownLayers,
} from "@/lib/pack-chat-context";
import { prisma } from "@/lib/prisma";
import { readSessionUserId } from "@/lib/session";

export const maxDuration = 60;

type Params = { params: Promise<{ handle: string; slug: string }> };

type ChatPostBody = {
  messages?: unknown;
  userBlock?: unknown;
};

export async function POST(req: Request, { params }: Params) {
  const userId = await readSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { handle, slug } = await params;
  const pack = await prisma.pack.findFirst({
    where: { slug, author: { handle } },
    select: { id: true, authorId: true, visibility: true },
  });
  if (!pack || !canViewPack(userId, pack)) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  let body: ChatPostBody;
  try {
    body = (await req.json()) as ChatPostBody;
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }

  const userBlock =
    typeof body.userBlock === "string" ? body.userBlock.trim() : "";
  if (!userBlock) {
    return NextResponse.json({ error: "userBlock required" }, { status: 400 });
  }
  if (userBlock.length > MAX_USER_BLOCK_CHARS) {
    return NextResponse.json({ error: "userBlock too long" }, { status: 400 });
  }

  if (!Array.isArray(body.messages)) {
    return NextResponse.json(
      { error: "messages must be an array (include chat history + new user turn)" },
      { status: 400 }
    );
  }

  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
  const abuse = await runChatAbusePolicies(
    { userId, packId: pack.id, clientIp: ip },
    [perUserMinuteLimitPolicy()]
  );
  if (!abuse.ok) {
    return NextResponse.json({ error: abuse.error }, { status: abuse.status });
  }

  const languageModel = resolvePackChatModel();
  if (!languageModel) {
    return NextResponse.json(
      {
        error:
          "chat unavailable: set OLLAMA_BASE_URL (and optional OLLAMA_MODEL) for Ollama, or OPENAI_API_KEY for OpenAI",
      },
      { status: 503 }
    );
  }

  const layers = await loadPackMarkdownLayers(prisma, pack.id);
  const system = buildPackChatSystemPrompt({ ...layers, userBlock });

  let modelMessages;
  try {
    const uiMessages = body.messages as UIMessage[];
    modelMessages = await convertToModelMessages(
      uiMessages.map((m) => {
        const { id: _id, ...rest } = m;
        return rest;
      })
    );
  } catch {
    return NextResponse.json(
      { error: "could not convert messages to model format" },
      { status: 400 }
    );
  }

  const result = streamText({
    model: languageModel,
    system,
    messages: modelMessages,
  });

  return result.toUIMessageStreamResponse();
}

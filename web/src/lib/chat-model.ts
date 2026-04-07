import { createAnthropic } from "@ai-sdk/anthropic";
import { createOllama } from "ai-sdk-ollama";

const DEFAULT_MINIMAX_ANTHROPIC_BASE_URL =
  "https://api.minimaxi.com/anthropic/v1";

function createMinimaxModel() {
  const apiKey = process.env.MINIMAX_TOKEN_PLAN_API_KEY?.trim();
  if (!apiKey) {
    return null;
  }
  const baseURL =
    process.env.MINIMAX_ANTHROPIC_BASE_URL?.trim() ??
    DEFAULT_MINIMAX_ANTHROPIC_BASE_URL;
  const provider = createAnthropic({
    apiKey,
    baseURL,
    name: "minimax.messages",
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
  });
  const modelId =
    process.env.MINIMAX_CHAT_MODEL?.trim() ?? "MiniMax-M2.7";
  return provider(modelId);
}

/**
 * Pack chat 所用语言模型。
 * - `OLLAMA_BASE_URL` → Ollama（`OLLAMA_MODEL`，默认 `qwen2:7b-instruct`）
 * - `MINIMAX_TOKEN_PLAN_API_KEY` → MiniMax（Anthropic 兼容；可选 `MINIMAX_ANTHROPIC_BASE_URL` 须为完整 Messages base，默认国内 `…/anthropic/v1`；可选 `MINIMAX_CHAT_MODEL`）
 * - 否则 `null`（503）
 */
export function resolvePackChatModel() {
  const ollamaBase = process.env.OLLAMA_BASE_URL?.trim();
  if (ollamaBase) {
    const ollama = createOllama({ baseURL: ollamaBase });
    const modelId =
      process.env.OLLAMA_MODEL?.trim() ?? "qwen2:7b-instruct";
    return ollama(modelId);
  }

  return createMinimaxModel();
}

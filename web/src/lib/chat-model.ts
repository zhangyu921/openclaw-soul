import { createOpenAI } from "@ai-sdk/openai";
import { createOllama } from "ai-sdk-ollama";

/**
 * Resolves the language model for pack chat.
 * - If `OLLAMA_BASE_URL` is set → local/cloud Ollama (`OLLAMA_MODEL`, default `qwen2:7b-instruct`).
 * - Else if `OPENAI_API_KEY` is set → OpenAI-compatible (`OPENAI_CHAT_MODEL`, default `gpt-4o-mini`).
 * - Otherwise returns `null` (caller should 503).
 */
export function resolvePackChatModel() {
  const ollamaBase = process.env.OLLAMA_BASE_URL?.trim();
  if (ollamaBase) {
    const ollama = createOllama({ baseURL: ollamaBase });
    const modelId =
      process.env.OLLAMA_MODEL?.trim() ?? "qwen2:7b-instruct";
    return ollama(modelId);
  }

  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    return null;
  }

  const openai = createOpenAI({ apiKey });
  const modelId = process.env.OPENAI_CHAT_MODEL ?? "gpt-4o-mini";
  return openai(modelId);
}

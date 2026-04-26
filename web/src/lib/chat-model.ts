import { createAnthropic } from "@ai-sdk/anthropic";
import { createOpenAI } from "@ai-sdk/openai";
import type { LanguageModel } from "ai";
import { createOllama } from "ai-sdk-ollama";

const DEFAULT_MINIMAX_ANTHROPIC_BASE_URL =
  "https://api.minimaxi.com/anthropic/v1";

const DEFAULT_DEEPSEEK_BASE_URL = "https://api.deepseek.com";
const DEFAULT_DEEPSEEK_CHAT_MODEL = "deepseek-v4-flash";

export type PackChatModelErrorCode =
  | "provider_unset"
  | "provider_invalid"
  | "credentials_missing";

export type PackChatModelResult =
  | { ok: true; model: LanguageModel }
  | { ok: false; code: PackChatModelErrorCode; message: string };

function fail(
  code: PackChatModelErrorCode,
  message: string
): PackChatModelResult {
  return { ok: false, code, message };
}

function createMinimaxModel(): LanguageModel | null {
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

function normalizePackChatProvider(): string | undefined {
  const raw = process.env.PACK_CHAT_PROVIDER?.trim();
  if (!raw) {
    return undefined;
  }
  return raw.toLowerCase();
}

/**
 * Pack chat 所用语言模型（显式后端）。
 * - 必须设置 `PACK_CHAT_PROVIDER`：`ollama` | `deepseek` | `minimax`（大小写不敏感）
 * - `ollama`：`OLLAMA_BASE_URL`；可选 `OLLAMA_MODEL`（默认 `qwen2:7b-instruct`）
 * - `deepseek`：`DEEPSEEK_API_KEY`；可选 `DEEPSEEK_BASE_URL`（默认 `https://api.deepseek.com`）、`DEEPSEEK_CHAT_MODEL`（默认 `deepseek-v4-flash`）
 * - `minimax`：`MINIMAX_TOKEN_PLAN_API_KEY`；可选 `MINIMAX_ANTHROPIC_BASE_URL`、`MINIMAX_CHAT_MODEL`
 */
export function resolvePackChatModel(): PackChatModelResult {
  const provider = normalizePackChatProvider();
  if (provider === undefined) {
    return fail(
      "provider_unset",
      "chat unavailable: set PACK_CHAT_PROVIDER to ollama, deepseek, or minimax"
    );
  }

  switch (provider) {
    case "ollama": {
      const base = process.env.OLLAMA_BASE_URL?.trim();
      if (!base) {
        return fail(
          "credentials_missing",
          "chat unavailable: PACK_CHAT_PROVIDER=ollama requires OLLAMA_BASE_URL"
        );
      }
      const ollama = createOllama({ baseURL: base });
      const modelId =
        process.env.OLLAMA_MODEL?.trim() ?? "qwen2:7b-instruct";
      return { ok: true, model: ollama(modelId) };
    }
    case "deepseek": {
      const apiKey = process.env.DEEPSEEK_API_KEY?.trim();
      if (!apiKey) {
        return fail(
          "credentials_missing",
          "chat unavailable: PACK_CHAT_PROVIDER=deepseek requires DEEPSEEK_API_KEY"
        );
      }
      const baseURL =
        process.env.DEEPSEEK_BASE_URL?.trim() ?? DEFAULT_DEEPSEEK_BASE_URL;
      const modelId =
        process.env.DEEPSEEK_CHAT_MODEL?.trim() ?? DEFAULT_DEEPSEEK_CHAT_MODEL;
      const openai = createOpenAI({
        apiKey,
        baseURL,
      });
      return { ok: true, model: openai(modelId) };
    }
    case "minimax": {
      const model = createMinimaxModel();
      if (!model) {
        return fail(
          "credentials_missing",
          "chat unavailable: PACK_CHAT_PROVIDER=minimax requires MINIMAX_TOKEN_PLAN_API_KEY"
        );
      }
      return { ok: true, model };
    }
    default:
      return fail(
        "provider_invalid",
        "chat unavailable: PACK_CHAT_PROVIDER must be ollama, deepseek, or minimax"
      );
  }
}

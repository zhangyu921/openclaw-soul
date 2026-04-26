import { createAnthropic } from "@ai-sdk/anthropic";
import { createDeepSeek } from "@ai-sdk/deepseek";
import type { LanguageModel } from "ai";
import { createOllama } from "ai-sdk-ollama";

const DEFAULT_MINIMAX_ANTHROPIC_BASE_URL =
  "https://api.minimaxi.com/anthropic/v1";

const DEFAULT_DEEPSEEK_BASE_URL = "https://api.deepseek.com";
const DEFAULT_DEEPSEEK_CHAT_MODEL = "deepseek-v4-flash";

const DEEPSEEK_REASONING_EFFORTS = [
  "none",
  "minimal",
  "low",
  "medium",
  "high",
  "xhigh",
] as const;

type DeepSeekReasoningEffort = (typeof DEEPSEEK_REASONING_EFFORTS)[number];
type DeepSeekThinkingToggle = "enabled" | "disabled";

/** 与 `@ai-sdk/deepseek` 的 `providerOptions` 对齐。 */
export type DeepSeekStreamProviderOptions = {
  deepseek: { thinking: { type: DeepSeekThinkingToggle } };
};

export type PackChatModelErrorCode =
  | "provider_unset"
  | "provider_invalid"
  | "credentials_missing";

export type PackChatModelResult =
  | {
      ok: true;
      model: LanguageModel;
      streamProviderOptions?: DeepSeekStreamProviderOptions;
    }
  | { ok: false; code: PackChatModelErrorCode; message: string };

function fail(
  code: PackChatModelErrorCode,
  message: string
): PackChatModelResult {
  return { ok: false, code, message };
}

function normalizeDeepSeekThinking(
  raw: string | undefined
): DeepSeekThinkingToggle | undefined {
  const s = raw?.trim().toLowerCase();
  if (!s) return undefined;
  if (s === "enabled" || s === "1" || s === "true" || s === "yes") {
    return "enabled";
  }
  if (s === "disabled" || s === "0" || s === "false" || s === "no") {
    return "disabled";
  }
  return undefined;
}

function parseDeepSeekReasoningEffort(
  raw: string | undefined
): DeepSeekReasoningEffort | undefined {
  const s = raw?.trim().toLowerCase() as DeepSeekReasoningEffort | "";
  if (!s) return undefined;
  return (DEEPSEEK_REASONING_EFFORTS as readonly string[]).includes(s)
    ? (s as DeepSeekReasoningEffort)
    : undefined;
}

function deepseekStreamProviderOptions(
  thinking: DeepSeekThinkingToggle | undefined
): DeepSeekStreamProviderOptions | undefined {
  if (thinking === "enabled") {
    return { deepseek: { thinking: { type: "enabled" } } };
  }
  if (thinking === "disabled") {
    return { deepseek: { thinking: { type: "disabled" } } };
  }
  return undefined;
}

/** `@ai-sdk/deepseek` 未暴露 `reasoning_effort`，在发往 `/chat/completions` 时合并进 JSON body。 */
function createDeepseekReasoningEffortFetch(
  inner: typeof fetch,
  reasoningEffort: string
): typeof fetch {
  return async (input, init) => {
    const url =
      typeof input === "string"
        ? input
        : input instanceof Request
          ? input.url
          : "";

    if (!url.includes("/chat/completions") || !init || init.method !== "POST") {
      return inner(input, init);
    }

    let nextInit: RequestInit = init;
    if (typeof init.body === "string") {
      try {
        const json = JSON.parse(init.body) as Record<string, unknown>;
        json.reasoning_effort = reasoningEffort;
        nextInit = { ...init, body: JSON.stringify(json) };
      } catch {
        /* keep init */
      }
    }

    return inner(input, nextInit);
  };
}

/** 合并进请求体的 `reasoning_effort`（provider schema 无此字段时由自定义 fetch 写入）。 */
function deepseekReasoningEffortForRequestBody(
  thinking: DeepSeekThinkingToggle | undefined,
  effort: DeepSeekReasoningEffort | undefined
): DeepSeekReasoningEffort | undefined {
  if (thinking === "disabled") {
    return undefined;
  }
  const useEffort =
    effort ?? (thinking === "enabled" ? "high" : undefined);
  if (thinking === "enabled" || useEffort !== undefined) {
    return useEffort ?? "high";
  }
  return undefined;
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
 * - `deepseek`：`DEEPSEEK_API_KEY`；可选 `DEEPSEEK_BASE_URL`、`DEEPSEEK_CHAT_MODEL`；**`@ai-sdk/deepseek`**。`DEEPSEEK_THINKING=enabled` / `disabled` 时分别传 `thinking: enabled` / `disabled`（须显式关闭，否则部分模型仍可能默认出思维链）。`DEEPSEEK_REASONING_EFFORT` 经自定义 fetch 写入 `reasoning_effort`（`enabled` 且未设时默认 `high`；`disabled` 时不合并）。文档：https://api-docs.deepseek.com/zh-cn/guides/thinking_mode
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
      const thinkingToggle = normalizeDeepSeekThinking(
        process.env.DEEPSEEK_THINKING
      );
      const reasoningEffort = parseDeepSeekReasoningEffort(
        process.env.DEEPSEEK_REASONING_EFFORT
      );
      const streamProviderOptions =
        deepseekStreamProviderOptions(thinkingToggle);
      const reasoningEffortBody = deepseekReasoningEffortForRequestBody(
        thinkingToggle,
        reasoningEffort
      );
      const deepseek = createDeepSeek({
        apiKey,
        baseURL,
        ...(reasoningEffortBody
          ? {
              fetch: createDeepseekReasoningEffortFetch(
                globalThis.fetch,
                reasoningEffortBody
              ),
            }
          : {}),
      });
      return {
        ok: true,
        model: deepseek.chat(modelId),
        ...(streamProviderOptions ? { streamProviderOptions } : {}),
      };
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

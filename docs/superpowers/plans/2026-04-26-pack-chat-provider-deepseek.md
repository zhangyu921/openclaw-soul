# Pack chat 显式 provider + DeepSeek Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为 Pack 详情页 chat 增加 **DeepSeek（OpenAI 兼容）** 后端，并以 **`PACK_CHAT_PROVIDER`** 强制显式选择 `ollama` | `deepseek` | `minimax`；未设置或配置错误时返回带原因的 **503**。

**Architecture:** `resolvePackChatModel()` 返回 **`PackChatModelResult` 判别联合**（`ok: true` + `model` / `ok: false` + `code` + `message`）。`chat` 路由仅消费 `message` 写入 JSON `error`。DeepSeek 使用 **`@ai-sdk/openai`** 的 `createOpenAI({ baseURL, apiKey })` 指向 `https://api.deepseek.com`（可 env 覆盖）。实现拆成小函数：`createOllamaPackModel` / `createDeepseekPackModel` / 保留并复用现有 MiniMax 构造逻辑。

**Tech Stack:** Next.js App Router、`ai` ^6、`@ai-sdk/openai`（新增）、`@ai-sdk/anthropic`、`ai-sdk-ollama`、Vitest。

**设计依据：** [`docs/superpowers/specs/2026-04-26-pack-chat-provider-deepseek-design.md`](../specs/2026-04-26-pack-chat-provider-deepseek-design.md)

---

## 文件结构（将创建/修改）

| 文件 | 职责 |
| --- | --- |
| `web/package.json` + `pnpm-lock.yaml` | 新增依赖 `@ai-sdk/openai` |
| `web/src/lib/chat-model.ts` | `PACK_CHAT_PROVIDER` 解析、三后端、`PackChatModelResult` 类型 |
| `web/src/lib/chat-model.test.ts` | 单元测试（unset / invalid / 缺凭证 / 成功） |
| `web/src/lib/chat-model.integration.test.ts` | 可选 live MiniMax：显式 `PACK_CHAT_PROVIDER=minimax` + 新返回类型 |
| `web/src/app/api/packs/[handle]/[slug]/chat/route.ts` | 消费 `PackChatModelResult`，503 文案 |
| `web/.env.example` | Pack chat 小节：必须 `PACK_CHAT_PROVIDER` + DeepSeek 变量 |
| `docs/DEVELOPMENT.md` | Pack chat 小节与 spec 一致（破坏性变更说明） |

---

### Task 1: 添加 `@ai-sdk/openai` 依赖

**Files:**
- Modify: `web/package.json`
- Modify: `web/pnpm-lock.yaml`

- [ ] **Step 1:** 在仓库根目录执行

```bash
cd web && pnpm add @ai-sdk/openai
```

Expected: `package.json` 的 `dependencies` 出现 `"@ai-sdk/openai"`，版本与 `@ai-sdk/anthropic` / `ai` 主版本线兼容（例如 `^3.x` 与现有 `@ai-sdk/anthropic` 同主版本族）。

- [ ] **Step 2:** Commit

```bash
git add web/package.json web/pnpm-lock.yaml
git commit -m "chore(web): add @ai-sdk/openai for DeepSeek-compatible chat"
```

---

### Task 2: 单元测试 — `resolvePackChatModel` 新契约（TDD，先红）

**Files:**
- Modify: `web/src/lib/chat-model.test.ts`

- [ ] **Step 1:** 将 `web/src/lib/chat-model.test.ts` **整体替换**为：

```typescript
import { afterEach, describe, expect, it } from "vitest";

import { resolvePackChatModel } from "./chat-model";

function clearChatEnv() {
  delete process.env.PACK_CHAT_PROVIDER;
  delete process.env.OLLAMA_BASE_URL;
  delete process.env.OLLAMA_MODEL;
  delete process.env.DEEPSEEK_API_KEY;
  delete process.env.DEEPSEEK_BASE_URL;
  delete process.env.DEEPSEEK_CHAT_MODEL;
  delete process.env.MINIMAX_TOKEN_PLAN_API_KEY;
  delete process.env.MINIMAX_ANTHROPIC_BASE_URL;
  delete process.env.MINIMAX_CHAT_MODEL;
}

describe("resolvePackChatModel", () => {
  afterEach(() => {
    clearChatEnv();
  });

  it("returns provider_unset when PACK_CHAT_PROVIDER is missing", () => {
    clearChatEnv();
    const r = resolvePackChatModel();
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.code).toBe("provider_unset");
      expect(r.message).toContain("PACK_CHAT_PROVIDER");
    }
  });

  it("treats whitespace-only PACK_CHAT_PROVIDER as unset", () => {
    process.env.PACK_CHAT_PROVIDER = "   ";
    const r = resolvePackChatModel();
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.code).toBe("provider_unset");
  });

  it("returns provider_invalid for unknown provider", () => {
    process.env.PACK_CHAT_PROVIDER = "openai";
    const r = resolvePackChatModel();
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.code).toBe("provider_invalid");
  });

  it("normalizes provider case (deepseek)", () => {
    process.env.PACK_CHAT_PROVIDER = "DeEpSeEk";
    process.env.DEEPSEEK_API_KEY = "sk-test";
    const r = resolvePackChatModel();
    expect(r.ok).toBe(true);
  });

  it("returns credentials_missing for ollama without OLLAMA_BASE_URL", () => {
    process.env.PACK_CHAT_PROVIDER = "ollama";
    const r = resolvePackChatModel();
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.code).toBe("credentials_missing");
      expect(r.message).toContain("OLLAMA_BASE_URL");
    }
  });

  it("returns ok for ollama when OLLAMA_BASE_URL is set", () => {
    process.env.PACK_CHAT_PROVIDER = "ollama";
    process.env.OLLAMA_BASE_URL = "http://127.0.0.1:11434";
    const r = resolvePackChatModel();
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.model).toBeDefined();
  });

  it("returns credentials_missing for deepseek without DEEPSEEK_API_KEY", () => {
    process.env.PACK_CHAT_PROVIDER = "deepseek";
    const r = resolvePackChatModel();
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.code).toBe("credentials_missing");
      expect(r.message).toContain("DEEPSEEK_API_KEY");
    }
  });

  it("returns ok for deepseek when DEEPSEEK_API_KEY is set", () => {
    process.env.PACK_CHAT_PROVIDER = "deepseek";
    process.env.DEEPSEEK_API_KEY = "sk-test";
    const r = resolvePackChatModel();
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.model).toBeDefined();
  });

  it("returns credentials_missing for minimax without token key", () => {
    process.env.PACK_CHAT_PROVIDER = "minimax";
    const r = resolvePackChatModel();
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.code).toBe("credentials_missing");
      expect(r.message).toContain("MINIMAX_TOKEN_PLAN_API_KEY");
    }
  });

  it("returns ok for minimax when MINIMAX_TOKEN_PLAN_API_KEY is set", () => {
    process.env.PACK_CHAT_PROVIDER = "minimax";
    process.env.MINIMAX_TOKEN_PLAN_API_KEY = "token-plan-key";
    const r = resolvePackChatModel();
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.model).toBeDefined();
  });
});
```

- [ ] **Step 2:** 运行测试，确认失败（旧实现仍返回 `LanguageModel | null`）

```bash
cd web && pnpm exec vitest run src/lib/chat-model.test.ts
```

Expected: 多个 FAIL（类型或断言不匹配）。

- [ ] **Step 3:** Commit（可选「测试先行」提交）

```bash
git add web/src/lib/chat-model.test.ts
git commit -m "test(web): pack chat model explicit provider contract"
```

---

### Task 3: 实现 `chat-model.ts`（绿）

**Files:**
- Modify: `web/src/lib/chat-model.ts`

- [ ] **Step 1:** 将 `web/src/lib/chat-model.ts` **整体替换**为：

```typescript
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
```

- [ ] **Step 2:** 若 `import type { LanguageModel } from "ai"` 在 `pnpm typecheck` 报错，改为 `import type { LanguageModelV2 } from "@ai-sdk/provider"`，并把 `PackChatModelResult` 中 `model` 类型改为 `LanguageModelV2`（以 `tsc` 通过为准）。

- [ ] **Step 3:** 运行单元测试

```bash
cd web && pnpm exec vitest run src/lib/chat-model.test.ts
```

Expected: 全部 PASS。

- [ ] **Step 4:** Commit

```bash
git add web/src/lib/chat-model.ts
git commit -m "feat(web): explicit PACK_CHAT_PROVIDER and DeepSeek chat model"
```

---

### Task 4: 更新 chat API 路由

**Files:**
- Modify: `web/src/app/api/packs/[handle]/[slug]/chat/route.ts`

- [ ] **Step 1:** 将文件中

```typescript
  const languageModel = resolvePackChatModel();
  if (!languageModel) {
    return NextResponse.json(
      {
        error:
          "chat unavailable: set OLLAMA_BASE_URL for Ollama or MINIMAX_TOKEN_PLAN_API_KEY for MiniMax",
      },
      { status: 503 }
    );
  }
```

替换为：

```typescript
  const resolved = resolvePackChatModel();
  if (!resolved.ok) {
    return NextResponse.json({ error: resolved.message }, { status: 503 });
  }
  const languageModel = resolved.model;
```

（`streamText({ model: languageModel, ... })` 保持不变。）

- [ ] **Step 2:** Commit

```bash
git add web/src/app/api/packs/\[handle\]/\[slug\]/chat/route.ts
git commit -m "fix(web): pack chat route uses PackChatModelResult"
```

---

### Task 5: 集成测试、`.env.example`、`DEVELOPMENT.md`

**Files:**
- Modify: `web/src/lib/chat-model.integration.test.ts`
- Modify: `web/.env.example`
- Modify: `docs/DEVELOPMENT.md`

- [ ] **Step 1:** 将 `web/src/lib/chat-model.integration.test.ts` 中 `shouldRunLive` 条件改为要求显式 minimax，并适配联合类型：

```typescript
const shouldRunLive =
  process.env.MINIMAX_LIVE_TEST === "1" &&
  process.env.PACK_CHAT_PROVIDER?.trim().toLowerCase() === "minimax" &&
  Boolean(process.env.MINIMAX_TOKEN_PLAN_API_KEY?.trim());
```

在 `it` 内：

```typescript
      const resolved = resolvePackChatModel();
      expect(resolved.ok).toBe(true);
      if (!resolved.ok) return;
      const result = streamText({
        model: resolved.model,
        prompt: "Reply with exactly the word OK and nothing else.",
      });
```

- [ ] **Step 2:** 将 `web/.env.example` 中 Pack chat 注释块替换为（保持与 spec 表一致）：

```dotenv
# Pack 详情页即时 chat（须设置 PACK_CHAT_PROVIDER；未设置或配置错误则 POST .../chat 返回 503）
# PACK_CHAT_PROVIDER=ollama
# OLLAMA_BASE_URL=http://127.0.0.1:11434
# OLLAMA_MODEL=qwen2:7b-instruct
#
# PACK_CHAT_PROVIDER=deepseek
# DEEPSEEK_API_KEY=
# DEEPSEEK_BASE_URL=https://api.deepseek.com
# DEEPSEEK_CHAT_MODEL=deepseek-v4-flash
#
# PACK_CHAT_PROVIDER=minimax
# MiniMax Token Plan（控制台「Token Plan Key」；Anthropic 兼容 API）
# MINIMAX_TOKEN_PLAN_API_KEY=
# MINIMAX_ANTHROPIC_BASE_URL=https://api.minimaxi.com/anthropic/v1
# MINIMAX_CHAT_MODEL=MiniMax-M2.7
```

- [ ] **Step 3:** 更新 `docs/DEVELOPMENT.md` 中「Pack 即时 chat」小节：说明必须设置 **`PACK_CHAT_PROVIDER`**；分别列出 Ollama / DeepSeek / MiniMax 所需变量；说明 **不再**自动 Ollama 优先；DeepSeek 默认 **`https://api.deepseek.com`** 与 **`deepseek-v4-flash`**；并链接 [DeepSeek API 文档](https://api-docs.deepseek.com/zh-cn/)。

- [ ] **Step 4:** Commit

```bash
git add web/src/lib/chat-model.integration.test.ts web/.env.example docs/DEVELOPMENT.md
git commit -m "docs(web): pack chat env and live test for explicit provider"
```

---

### Task 6: 验证

**Files:**（只读命令）

- [ ] **Step 1:** Typecheck

```bash
cd web && pnpm typecheck
```

Expected: 退出码 0。

- [ ] **Step 2:** 全量 Vitest（至少包含 `web/src/lib`）

```bash
cd web && pnpm test
```

Expected: 全部 PASS。

- [ ] **Step 3:** 若仍有未提交改动，合并为一次 `chore`/`fix` commit 或 amend（由执行者判断）。

---

## Spec 对照自检（计划作者已做）

1. **Spec coverage：** `PACK_CHAT_PROVIDER`、三后端、联合返回、503、`@ai-sdk/openai`、默认 flash、可选 `DEEPSEEK_BASE_URL` / `DEEPSEEK_CHAT_MODEL`、单测场景、`.env.example` 均有对应 Task；`DEVELOPMENT.md` 与现网文档不一致处已补 Task 5。
2. **Placeholder scan：** 无 TBD/TODO 式步骤。
3. **类型一致：** `PackChatModelResult` 在 Task 3 定义，Task 4 路由与 Task 5 集成测试均使用 `resolved.ok` / `resolved.model`。

---

## 执行方式（实现完成后由执行者与协作者约定）

Plan complete and saved to `docs/superpowers/plans/2026-04-26-pack-chat-provider-deepseek.md`. Two execution options:

**1. Subagent-Driven (recommended)** — 每个 Task 派生子代理，Task 间人工快速过目  

**2. Inline Execution** — 本会话内按 Task 顺序执行，关键 Task 后停顿检查

**Which approach?**（若你回复「直接做」，默认按 **2 Inline** 在本会话实现。）

# Pack chat：显式 provider + DeepSeek API（设计稿）

**日期**：2026-04-26  
**状态**：已定稿（待实现）  
**范围**：`web/src/lib/chat-model.ts`、`web/src/app/api/packs/[handle]/[slug]/chat/route.ts`、`.env.example`、相关单测；**仅** Pack 详情页即时 chat 所用模型解析，不改变 `streamText` / 客户端协议。

**参考**：[DeepSeek API 文档](https://api-docs.deepseek.com/zh-cn/)（OpenAI 兼容 `base_url`：`https://api.deepseek.com`）。

---

## 1. 背景与目标

**背景**：当前 `resolvePackChatModel()` 在配置 Ollama 或 MiniMax 时隐式选择后端（Ollama 优先），无法显式指定 cloud 提供商；需增加 **DeepSeek** 且由部署方明确选择后端。

**目标**

- 新增环境变量 **`PACK_CHAT_PROVIDER`**，取值（**大小写不敏感**，trim 后）：`ollama` | `deepseek` | `minimax`。
- **未设置或为空**：不解析任何后端，chat API **503**，错误信息要求设置 `PACK_CHAT_PROVIDER`（**破坏性变更**：不再在未设置时自动 fallback Ollama → MiniMax）。
- **非法取值**：503，错误信息列出合法取值。
- **合法 provider 但缺少该后端所需密钥 / base URL**：503，错误信息指向缺失的 env（见 §3）。
- **DeepSeek**：通过 **`@ai-sdk/openai`** + `createOpenAI({ baseURL, apiKey })` 调用兼容端点；默认模型 **`deepseek-v4-flash`**；**首版不启用** `thinking` / `reasoning_effort`（后续可扩展）。

**非目标**

- 多 provider 自动 failover、按请求切换、运行时 UI 切换。
- 在 spec 层规定 DeepSeek 账单或配额策略。

---

## 2. 架构与 API

### 2.1 模型解析返回值

将 `resolvePackChatModel()`（或同名入口）改为返回 **判别联合类型**，例如：

- `{ ok: true, model: LanguageModel }`
- `{ ok: false, code: string, message: string }`

其中 `code` 供服务端日志或测试断言（如 `provider_unset` | `provider_invalid` | `credentials_missing`）；**对外 HTTP 响应**仍使用 JSON `error: string`，正文可与 `message` 一致或略短。

**路由**：`POST .../chat` 在 `ok === false` 时返回 **503** + `{ error: ... }`（与当前「无模型」行为一致；非法 provider 亦用 503，表示「chat 后端未正确配置」）。

### 2.2 代码结构（推荐）

在 `chat-model.ts` 内保持 **`createMinimaxModel()`** 风格：将 Ollama / DeepSeek 拆成 **`createOllamaPackModel()`**、**`createDeepseekPackModel()`** 等小函数；主函数读取 `PACK_CHAT_PROVIDER` 后 `switch` 并委托。避免过度抽象的 provider 注册表（三个后端时收益有限）。

---

## 3. 环境变量

| 变量 | 何时需要 | 说明 |
| --- | --- | --- |
| `PACK_CHAT_PROVIDER` | **始终**（启用 pack chat 时） | `ollama` \| `deepseek` \| `minimax`（不区分大小写） |
| `OLLAMA_BASE_URL` | provider = `ollama` | 与现有一致 |
| `OLLAMA_MODEL` | 可选 | 默认 `qwen2:7b-instruct` |
| `DEEPSEEK_API_KEY` | provider = `deepseek` | 控制台 API key |
| `DEEPSEEK_BASE_URL` | **可选** | 默认 `https://api.deepseek.com`；仅在有代理/自建兼容网关时覆盖 |
| `DEEPSEEK_CHAT_MODEL` | **可选** | 默认 `deepseek-v4-flash`；可改为 `deepseek-v4-pro` 等文档所列模型 |
| `MINIMAX_TOKEN_PLAN_API_KEY` 等 | provider = `minimax` | 与现有一致 |

**依赖**：新增 npm 依赖 **`@ai-sdk/openai`**（版本与现有 `@ai-sdk/*`、`ai` 主版本兼容，实现时以 `package.json` 锁定为准）。

---

## 4. 文档与测试

- **`.env.example`**：重写 Pack chat 小节——说明必须设置 `PACK_CHAT_PROVIDER`；列出 DeepSeek 与既有 Ollama / MiniMax 变量。
- **`chat-model.test.ts`**：
  - 未设置 `PACK_CHAT_PROVIDER` → `ok: false`；
  - 非法 provider → `ok: false`；
  - 各 provider 在缺密钥/base 时 → `ok: false`；
  - 各 provider 在补齐最小 env 时 → `ok: true` 且 `model` 非空；
  - **删除或改写**依赖「Ollama 优先于 MiniMax」的旧用例，改为显式 `PACK_CHAT_PROVIDER=minimax` / `ollama`。

---

## 5. 迁移说明（运维）

在合并本实现后，**所有**依赖 pack chat 的环境必须：

1. 设置 **`PACK_CHAT_PROVIDER`** 为三者之一；
2. 为该 provider 配置对应密钥与可选变量。

未更新 env 的部署将出现 **503**，直至补齐。

---

## 6. Spec 自检（定稿前已核对）

- 无 TBD/TODO。
- 默认值与用户确认一致：`DEEPSEEK_CHAT_MODEL` 默认 **`deepseek-v4-flash`**；`DEEPSEEK_BASE_URL` / `DEEPSEEK_CHAT_MODEL` 均为可选覆盖项。
- 返回值联合类型与路由行为一致。
- 范围限定为 pack chat 模型解析与 DeepSeek 接入，无无关扩展。

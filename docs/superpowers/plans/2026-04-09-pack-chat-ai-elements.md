# Pack 详情 chat：AI Elements 前端升级 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在 Pack 详情页「与 pack 对话」中用 **Vercel AI Elements**（`Conversation` / `Message` / `PromptInput` 等）替换自绘消息列表与输入区，保留既有 `useChat` + `DefaultChatTransport`、`USER` 弹窗与 `userBlock` 注入行为；助手消息支持 Markdown/GFM 流式展示；busy 状态禁用发送；错误可见。

**Architecture:** 先从 `pack-chat.tsx` 抽出 **`textFromMessage`** 到 **`web/src/lib`** 并配 Vitest（TDD）。再在 **`web/`** 目录执行 **`npx ai-elements@latest add`** 安装官方组件到 **`@/components/ai-elements/*`**（与 [AI Elements · Conversation 文档](https://sdk.vercel.ai/elements/components/conversation) 一致）。最后在 **`pack-chat.tsx`** 中仅替换 **`userBlock !== null`** 时的消息区与表单：用 `Message` + `MessageResponse` 渲染 `message.parts`（`text` 分支），`PromptInput` + 受控 `input` 调用现有 `sendMessage`；外层 **Card**、登录/空包/`flowStarted`/对话框逻辑 **不动**。可选：从 `useChat` 解构 **`stop`**，在流式时在工具栏加「停止」按钮。

**Tech Stack:** Next.js 16 App Router、`@ai-sdk/react` `useChat`、`ai` `UIMessage`、`ai-elements` CLI、shadcn/ui（既有）、Vitest、next-intl（新增文案 key 时）。

**Spec:** [`docs/superpowers/specs/2026-04-09-pack-chat-ai-elements-design.md`](../specs/2026-04-09-pack-chat-ai-elements-design.md)

---

## 文件映射（将创建 / 修改）

| 路径 | 职责 |
|------|------|
| `web/src/lib/pack-chat-message-text.ts` | 导出 `textFromMessage(UIMessage)`，供测试与（如需）下载/Markdown 工具复用 |
| `web/src/lib/pack-chat-message-text.test.ts` | 多段 text part、空 parts |
| `web/src/components/ai-elements/*.tsx`（及依赖） | **`npx ai-elements@latest add`** 生成；勿手抄整文件 |
| `web/src/app/[locale]/packs/[handle]/[slug]/pack-chat.tsx` | 引入 Elements；保留原状态机；替换消息列表与 `<form>+Textarea` 区块 |
| `web/messages/en.json`、`web/messages/zh.json` | 仅新增本任务出现的 **空状态 / 外层说明** 等 key（`packChat.*`）；Elements 内置英文可保留 |
| `web/package.json`、`pnpm-lock.yaml` | CLI 可能新增依赖 |

**Spec 覆盖核对：** §1 目标（Markdown/流式/busy/错误）→ Task 2–4；§3.1 消息抽取 → Task 1；§3.2 主题 → Task 2 合并样式；§4 文件组织 → Task 3–4；§5 状态 → Task 4；§6 i18n → Task 5；§7 测试 → Task 1 + 收尾验证；§8 风险（CLI 冲突）→ Task 2 注意事项；可选 stop/regenerate → Task 6。

---

### Task 1: `textFromMessage` 抽出 + Vitest（TDD）

**Files:**
- Create: `web/src/lib/pack-chat-message-text.ts`
- Create: `web/src/lib/pack-chat-message-text.test.ts`
- Modify: `web/src/app/[locale]/packs/[handle]/[slug]/pack-chat.tsx`（删除本地 `textFromMessage`，改为 import）

- [ ] **Step 1: 新增测试文件（先失败：模块不存在）**

创建 `web/src/lib/pack-chat-message-text.test.ts`：

```typescript
import type { UIMessage } from "ai";
import { describe, expect, it } from "vitest";

import { textFromMessage } from "./pack-chat-message-text";

describe("textFromMessage", () => {
  it("joins multiple text parts in order", () => {
    const m = {
      id: "a",
      role: "assistant",
      parts: [
        { type: "text" as const, text: "Hello " },
        { type: "text" as const, text: "world" },
      ],
    } as UIMessage;
    expect(textFromMessage(m)).toBe("Hello world");
  });

  it("returns empty string when there are no text parts", () => {
    const m = {
      id: "b",
      role: "user",
      parts: [],
    } as UIMessage;
    expect(textFromMessage(m)).toBe("");
  });
});
```

- [ ] **Step 2: 运行测试，确认因缺少实现而失败**

```bash
cd /Users/yuzhang/proj/openclaw-soul/web && pnpm exec vitest run src/lib/pack-chat-message-text.test.ts
```

Expected: FAIL（cannot find module `./pack-chat-message-text` 或等价）。

- [ ] **Step 3: 实现模块**

创建 `web/src/lib/pack-chat-message-text.ts`：

```typescript
import type { UIMessage } from "ai";

export function textFromMessage(m: UIMessage): string {
  return m.parts
    .filter((p): p is { type: "text"; text: string } => p.type === "text")
    .map((p) => p.text)
    .join("");
}
```

- [ ] **Step 4: 运行测试，确认通过**

```bash
cd /Users/yuzhang/proj/openclaw-soul/web && pnpm exec vitest run src/lib/pack-chat-message-text.test.ts
```

Expected: PASS。

- [ ] **Step 5: 修改 `pack-chat.tsx` 使用公共函数**

在 `web/src/app/[locale]/packs/[handle]/[slug]/pack-chat.tsx` 中：

- 删除文件内 `function textFromMessage` 整个函数。
- 增加：`import { textFromMessage } from "@/lib/pack-chat-message-text";`

若文件中仍有 `textFromMessage(` 调用，保持不变（或后续 Task 若完全改用 `parts` 映射，可删除未使用 import，以 tsc 为准）。

- [ ] **Step 6: 全量 web 测试与 lint**

```bash
cd /Users/yuzhang/proj/openclaw-soul/web && pnpm test && pnpm lint
```

Expected: 无新增失败。

- [ ] **Step 7: Commit**

```bash
cd /Users/yuzhang/proj/openclaw-soul && git add web/src/lib/pack-chat-message-text.ts web/src/lib/pack-chat-message-text.test.ts web/src/app/\[locale\]/packs/\[handle\]/\[slug\]/pack-chat.tsx
git commit -m "refactor(web): extract pack chat textFromMessage for AI Elements prep"
```

---

### Task 2: 安装 AI Elements 组件（CLI）

**Files:**
- Create: `web/src/components/ai-elements/` 下由 CLI 生成的文件（路径以 CLI 输出为准，通常为 `conversation.tsx`、`message.tsx`、`prompt-input.tsx` 等）
- Modify: `web/src/app/globals.css`（若 CLI 追加了 `@import` 或 `@theme`；**只做最小合并**，避免重复大块）
- Modify: `web/package.json`、`pnpm-lock.yaml`

- [ ] **Step 1: 在 `web` 目录执行 CLI（非交互；若 CLI 询问，选与现有 shadcn 一致的默认项）**

```bash
cd /Users/yuzhang/proj/openclaw-soul/web && npx ai-elements@latest add conversation
cd /Users/yuzhang/proj/openclaw-soul/web && npx ai-elements@latest add message
cd /Users/yuzhang/proj/openclaw-soul/web && npx ai-elements@latest add prompt-input
```

若某条命令报「组件已存在」，使用 CLI 文档中的 **`--overwrite`** 重试，或删除冲突文件后重加（以不破坏其他 shadcn 组件为前提）。

- [ ] **Step 2: 确认 import 路径与文档一致**

打开 `web/src/components/ai-elements/conversation.tsx`（或等价路径），确认可从下列路径导入（与 [官方示例](https://sdk.vercel.ai/elements/components/conversation) 一致）：

- `@/components/ai-elements/conversation`
- `@/components/ai-elements/message`
- `@/components/ai-elements/prompt-input`

若别名不同，在 Task 3 中使用 **实际路径**，并在此任务末尾把正确路径记一行到 commit message body。

- [ ] **Step 3: 编译检查**

```bash
cd /Users/yuzhang/proj/openclaw-soul/web && pnpm exec tsc --noEmit
```

Expected: 无错误。若有版本冲突，按 spec §8 评估：优先升级兼容版本，否则记录「方案 B」局部自绘（不在本计划展开，需另开补丁任务）。

- [ ] **Step 4: Commit（仅依赖与生成组件）**

```bash
cd /Users/yuzhang/proj/openclaw-soul && git add web/package.json pnpm-lock.yaml web/src/components/ai-elements web/src/app/globals.css
git commit -m "chore(web): add AI Elements conversation, message, prompt-input"
```

---

### Task 3: 在 `pack-chat.tsx` 接入 Conversation + Message + PromptInput

**Files:**
- Modify: `web/src/app/[locale]/packs/[handle]/[slug]/pack-chat.tsx`

- [ ] **Step 1: 扩展 `useChat` 解构（为停止按钮预留）**

将：

```typescript
const { messages, sendMessage, status, setMessages, error } = useChat({
```

改为：

```typescript
const { messages, sendMessage, status, setMessages, error, stop } = useChat({
```

（若项目 TypeScript 对 `stop` 报错，核对 `@ai-sdk/react` 版本；`dist/index.d.ts` 应包含 `stop`。）

- [ ] **Step 2: 替换「消息列表 + 表单」区块**

在 **`userBlock !== null`** 分支中，找到现有结构：

- 外层 `<div role="log" className="max-h-[min(50vh,420px)] ...">` 内对 `messages.map` 的手写气泡；
- 以及下方 `<form>` + `Textarea` + `Button`。

替换为与官方示例等价的结构，但保留本项目行为：

- 用 **`Conversation` → `ConversationContent` →** 条件渲染 **`ConversationEmptyState`**（`messages.length === 0`）或 **`messages.map`**。
- 每条消息：`<Message from={message.role} key={message.id}>`，内层 **`MessageContent`**，对 `message.parts` 做 `switch`：仅处理 **`case "text"`**，用 **`<MessageResponse key={...}>{part.text}</MessageResponse>`**（与文档一致，以便流式 Markdown）。
- 在 **`Conversation`** 内于 `ConversationContent` 之后加入 **`ConversationScrollButton`**；可选加入 **`ConversationDownload messages={messages}`**（spec 未禁止；若体积或 UX 不满意可移除）。
- 用 **`PromptInput`** + **`PromptInputTextarea`** + **`PromptInputSubmit`** 替代原 form；**`onSubmit`** 接收 `PromptInputMessage`，在 `message.text.trim()` 时调用 **`await sendMessage({ text: message.text.trim() })`** 并 **`setInput("")`**。
- **`PromptInputTextarea`**：`value={input}`、`onChange` 更新 `input`、`disabled={busy}`。
- **`PromptInputSubmit`**：`disabled={busy || !input.trim()}`；`status` prop：当 `status === "streaming"` 时传 **`"streaming"`**，否则 **`"ready"`**（若 UI 在 `submitted` 阶段也需转圈，可改为 `(status === "streaming" || status === "submitted") ? "streaming" : "ready"`，以视觉为准）。
- 保留 **`error`** 的 `<p role="alert" className="text-sm text-destructive">` 在 **`Conversation` 与 `PromptInput` 之间或 CardContent 底部**，不删除。
- 删除不再使用的 **`Textarea`**、**`Button`** 对发送的 import（若 Card 其他分支仍用 `Button`，保留 `Button` import）。

- [ ] **Step 3: 调整容器高度 class**

原 `max-h-[min(50vh,420px)]` 可移到 **`Conversation`** 或外包 `div`，保证 **可滚动区域** 高度与现网接近，避免布局崩坏。

- [ ] **Step 4: 运行测试与 lint**

```bash
cd /Users/yuzhang/proj/openclaw-soul/web && pnpm test && pnpm lint && pnpm exec tsc --noEmit
```

Expected: 全部通过。

- [ ] **Step 5: Commit**

```bash
cd /Users/yuzhang/proj/openclaw-soul && git add web/src/app/\[locale\]/packs/\[handle\]/\[slug\]/pack-chat.tsx
git commit -m "feat(web): use AI Elements for pack chat thread and input"
```

---

### Task 4: 可选 — 流式时「停止」按钮

**Files:**
- Modify: `web/src/app/[locale]/packs/[handle]/[slug]/pack-chat.tsx`

- [ ] **Step 1: 在 `PromptInput` 同一行或 `Conversation` 标题栏增加 `Button`**

当 **`status === "streaming"`**（或含 **`submitted`**，依体验）时显示「停止」；**`onClick={() => stop()}`**。

使用已有 **`Button`** 与 **`useTranslations` 的 key**（见 Task 5）或暂用英文 `"Stop"`（spec §6 允许）。

- [ ] **Step 2: 验证**

手动发一条长回复，在生成中途点停止，确认请求结束且 UI 回到可输入状态。

- [ ] **Step 3: Commit**

```bash
git add web/src/app/\[locale\]/packs/\[handle\]/\[slug\]/pack-chat.tsx web/messages/en.json web/messages/zh.json
git commit -m "feat(web): add stop button for pack chat streaming"
```

若未加 i18n key，仅 commit tsx。

---

### Task 5: i18n（`packChat` 命名空间）

**Files:**
- Modify: `web/messages/en.json`、`web/messages/zh.json`
- Modify: `web/src/app/[locale]/packs/[handle]/[slug]/pack-chat.tsx`

- [ ] **Step 1: 在 `en.json` / `zh.json` 增加 `packChat` 对象**（示例 key，按你实际替换的文案微调）

`en.json` 片段：

```json
"packChat": {
  "emptyThread": "Send a message to start.",
  "stop": "Stop",
  "roleUser": "You",
  "roleAssistant": "Assistant"
}
```

`zh.json` 片段：

```json
"packChat": {
  "emptyThread": "发送第一条消息开始。",
  "stop": "停止",
  "roleUser": "你",
  "roleAssistant": "助手"
}
```

（若 **`ConversationEmptyState`** 仍用英文 title/description，可逐步替换为 `useTranslations`；未替换部分符合 spec 宽松策略。）

- [ ] **Step 2: 在 `pack-chat.tsx` 顶部 `import { useTranslations } from "next-intl"`**，组件内 **`const t = useTranslations("packChat")`**，将本次改动触及的字符串换为 **`t("…")`**。

- [ ] **Step 3: 验证**

```bash
cd /Users/yuzhang/proj/openclaw-soul/web && pnpm exec tsc --noEmit && pnpm lint
```

- [ ] **Step 4: Commit**

```bash
cd /Users/yuzhang/proj/openclaw-soul && git add web/messages/en.json web/messages/zh.json web/src/app/\[locale\]/packs/\[handle\]/\[slug\]/pack-chat.tsx
git commit -m "feat(web): i18n keys for pack chat thread"
```

---

### Task 6: 收尾验证（spec §7）

**Files:**
- 无新增；仅命令

- [ ] **Step 1: 全量 web 测试**

```bash
cd /Users/yuzhang/proj/openclaw-soul/web && pnpm test
```

Expected: PASS。

- [ ] **Step 2: 生产构建**

```bash
cd /Users/yuzhang/proj/openclaw-soul/web && pnpm run build
```

Expected: SUCCESS（若需环境变量，按 `docs/DEVELOPMENT.md` 本地占位）。

- [ ] **Step 3: 手动验收（勾选）**

- [ ] 登录 → 开始对话 → USER 设定或缓存 → 多轮对话
- [ ] 助手回复含 **Markdown**（标题、列表、**代码块**）
- [ ] 流式过程中输入禁用，结束后可继续
- [ ] 错误时可见 `error.message`
- [ ] （可选）暗色主题下可读

---

## Plan self-review

| 检查项 | 结果 |
|--------|------|
| Spec §1–7 均有对应任务 | 已映射 |
| 无 TBD /「适当处理」式步骤 | 已避免；CLI 冲突处指向 Task 2 与 spec §8 |
| `useChat` / `UIMessage` / 路径与仓库一致 | `pack-chat.tsx` 路径含 `[locale]`；lib 用 `@/lib` |
| `stop` / i18n 为可选或独立 Task | Task 4、5 |

---

## 执行交接

Plan 已保存到 [`docs/superpowers/plans/2026-04-09-pack-chat-ai-elements.md`](2026-04-09-pack-chat-ai-elements.md)。

**两种执行方式：**

1. **Subagent-Driven（推荐）** — 每个 Task 派生子代理，任务间 review，迭代快。需配合 **subagent-driven-development** 技能。
2. **Inline Execution** — 本会话内按 **executing-plans** 批量执行并设检查点。

你更倾向哪一种？

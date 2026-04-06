# P1-C pack 即时 chat Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在 pack 详情页提供「所有人可见」的 chat 入口；登录后多轮流式对话；服务端按 spec 顺序注入 `SOUL.md` / `IDENTITY.md` / 用户确认的 USER 块 / `AGENTS.md`；USER 弹窗与 `localStorage`（按 user+pack）；可插拔滥用防护中间层；对话仅内存不落库。

**Architecture:** Next.js Route Handler `POST /api/packs/[handle]/[slug]/chat` 使用 **Vercel AI SDK**（`ai` 包）`streamText` 流式返回；`system` 由 **`buildPackChatSystemPrompt`**（读 Prisma `PackMarkdownFile`）与请求体中的 **USER 块**合并；**滥用策略**为独立模块数组，在调用模型前执行。客户端 **`@ai-sdk/react`** `useChat` + 详情页内嵌面板；未登录跳转 **`/login`**（`callbackUrl` 回 pack）。**`canViewPack`** 抽至共享 lib，与 source-file 行为一致。

**Tech Stack:** Next.js 16 App Router、Prisma、**`ai`**、**`@ai-sdk/openai`**（或 spec 允许的兼容 provider）、**`@ai-sdk/react`**、Vitest。

**Spec:** [`docs/superpowers/specs/2026-04-06-p1-c-instant-chat-design.md`](../specs/2026-04-06-p1-c-instant-chat-design.md)

---

## 常量与环境（先约定，后续任务引用）

| 名称 | 建议值 | 说明 |
|------|--------|------|
| `MAX_USER_BLOCK_CHARS` | `12000` | 请求体 USER 全文上限（可调，须与 spec §4.4 一致） |
| `PACK_CHAT_PATHS` | `['SOUL.md','IDENTITY.md','AGENTS.md']` | 默认注入路径（顺序由 builder 固定为 SOUL→IDENTITY→USER 块→AGENTS） |
| `OPENAI_API_KEY` | — | 服务端；未设置时 chat 路由返回 **503** 与明确 `error`（勿暴露密钥） |

**注意**：多实例 / serverless 下 **内存型** 限流仅单实例有效；计划内先实现进程内 Map，在代码注释与 `docs/DEVELOPMENT.md` 中说明生产若多实例需换 Redis/Upstash 等。

---

## 文件映射（将创建 / 修改）

| 区域 | 路径 | 职责 |
|------|------|------|
| Lib | `web/src/lib/pack-access.ts`（新建） | `canViewPack`、可选 `assertPackReadableBySession`；从 `source-file/route.ts` 抽出逻辑 |
| Lib | `web/src/lib/pack-chat-context.ts`（新建） | 按 pack id 读 md 路径；拼 **SOUL → IDENTITY → [USER 文本] → AGENTS** 单段或多段 `system` |
| Lib | `web/src/lib/user-md-parse.ts`（新建） | 轻量解析 pack `USER.md` 正文到字段；失败则空字段 |
| Lib | `web/src/lib/pack-chat-abuse.ts`（新建） | `runChatAbusePolicies(ctx): Promise<{ ok: true } \| { ok: false; status: number; body: object }>`；策略列表可导出、可单测 |
| API | `web/src/app/api/packs/[handle]/[slug]/chat/route.ts`（新建） | `POST`：401/404/429/503；`streamText`；`maxDuration` 若需 |
| API | `web/src/app/api/packs/[handle]/[slug]/source-file/route.ts` | 删除重复的 `canViewPack`，改为 import `pack-access` |
| UI | `web/src/app/packs/[handle]/[slug]/pack-chat.tsx`（新建） | 入口按钮、登录门、`useChat`、消息列表、流式展示 |
| UI | `web/src/app/packs/[handle]/[slug]/pack-chat-user-dialog.tsx`（新建） | USER 表单、localStorage、`重新设定` 回调 |
| Page | `web/src/app/packs/[handle]/[slug]/page.tsx` | 挂载 chat；传入 `handle`/`slug`/`userId`/`isAuthor`/`isListed` 等 |
| 依赖 | `web/package.json` | 增加 `ai`、`@ai-sdk/openai`、`@ai-sdk/react` |
| 文档 | `docs/DEVELOPMENT.md` | 环境变量与本地跑 chat |
| 测试 | `web/src/lib/pack-chat-context.test.ts`、`user-md-parse.test.ts`、`pack-chat-abuse.test.ts` | 拼装顺序、解析、429 |

---

### Task 1: 依赖与类型基线

**Files:**
- Modify: `web/package.json`

- [ ] **Step 1:** 在 `web` 目录执行：

```bash
cd web && pnpm add ai @ai-sdk/openai @ai-sdk/react
```

- [ ] **Step 2:** `pnpm install` 在仓库根（若 monorepo 要求从根安装则 `pnpm install`）。

- [ ] **Step 3:** 确认 `pnpm exec tsc --noEmit -p web`（或根脚本若存在）无新增错误；若有 peer 冲突按 pnpm 提示处理。

- [ ] **Step 4:** Commit：

```bash
git add web/package.json pnpm-lock.yaml
git commit -m "chore(web): add Vercel AI SDK dependencies for P1-C chat"
```

---

### Task 2: 共享 `canViewPack` + 抽出 source-file

**Files:**
- Create: `web/src/lib/pack-access.ts`
- Modify: `web/src/app/api/packs/[handle]/[slug]/source-file/route.ts`

- [ ] **Step 1:** 新建 `pack-access.ts`：

```typescript
import { PackVisibility } from "@/generated/prisma/client";

export function canViewPack(
  userId: string | null,
  pack: { authorId: string; visibility: PackVisibility }
): boolean {
  if (pack.visibility === PackVisibility.LISTED) return true;
  return Boolean(userId && userId === pack.authorId);
}
```

- [ ] **Step 2:** 在 `source-file/route.ts` 删除本地 `canViewPack` 函数，改为 `import { canViewPack } from "@/lib/pack-access"`。

- [ ] **Step 3:** 运行 `cd web && pnpm test` 确保现有测试仍通过。

- [ ] **Step 4:** Commit：

```bash
git add web/src/lib/pack-access.ts web/src/app/api/packs/\[handle\]/\[slug\]/source-file/route.ts
git commit -m "refactor(web): extract canViewPack for pack chat reuse"
```

---

### Task 3: `buildPackChatSystemPrompt` 与单测

**Files:**
- Create: `web/src/lib/pack-chat-context.ts`
- Create: `web/src/lib/pack-chat-context.test.ts`

- [ ] **Step 1:** 实现异步函数 `loadPackMarkdownByPaths(db, packId, paths: string[])`：对 `PackMarkdownFile` `findMany` `where: { packId, path: { in: paths } }`，返回 `Map<path, content>`。

- [ ] **Step 2:** 实现 `buildPackChatSystemPrompt(args)`，其中 `args` 包含：
  - `layers: { soul: string; identity: string; agents: string }` 每项为「文件存在则全文，否则固定一句 `(文件缺失: PATH)`」；
  - `userBlock: string`：已通过长度校验的用户确认 USER Markdown。
  - **拼接顺序**严格为：**SOUL → IDENTITY → userBlock → AGENTS**，段与段之间用 `\n\n---\n\n` 分隔；段首用简短标题注释如 `## SOUL.md` 便于调试（可选）。

- [ ] **Step 3:** 在 `pack-chat-context.test.ts` 用 **mock 或内存 stub** 断言：给定固定四层字符串，输出中 **先**出现 SOUL 片段，**再** IDENTITY，**再** user，**再** AGENTS（可用 `indexOf` 顺序比较）。

- [ ] **Step 4:** `cd web && pnpm test -- pack-chat-context`

- [ ] **Step 5:** Commit。

---

### Task 4: `user-md-parse` 与单测

**Files:**
- Create: `web/src/lib/user-md-parse.ts`
- Create: `web/src/lib/user-md-parse.test.ts`

- [ ] **Step 1:** 导出 `parsePackUserMd(raw: string): Partial<Record<'name' | 'whatToCall' | 'pronouns' | 'timezone' | 'notes' | 'context', string>>`，对 `- **Name:**` 等行做简单 `split`/正则；**解析失败或空正文返回 `{}`**。

- [ ] **Step 2:** 测试：正常样例、乱码样例、空串 → `{}`。

- [ ] **Step 3:** `pnpm test -- user-md-parse`

- [ ] **Step 4:** Commit。

---

### Task 5: 滥用防护中间层 + 单测

**Files:**
- Create: `web/src/lib/pack-chat-abuse.ts`
- Create: `web/src/lib/pack-chat-abuse.test.ts`

- [ ] **Step 1:** 定义上下文类型，例如：

```typescript
export type ChatAbuseContext = {
  userId: string;
  packId: string;
  clientIp: string | null;
};

export type ChatAbuseResult =
  | { ok: true }
  | { ok: false; status: number; error: string };

export type ChatAbusePolicy = (
  ctx: ChatAbuseContext
) => Promise<ChatAbuseResult>;
```

- [ ] **Step 2:** 实现 `runChatAbusePolicies(ctx, policies: ChatAbusePolicy[])`：按序执行，**首个** `ok: false` 即返回。

- [ ] **Step 3:** 实现 **至少一条** 可测策略，例如 **`perUserMinuteLimit`**：`Map<userId, number[]>` 存最近时间戳，**60 秒内 > N 次**则 `{ ok: false, status: 429, error: 'rate limit' }`（N 用常量如 `20`）。

- [ ] **Step 4:** 单测：第 N+1 次同 userId 返回 429。

- [ ] **Step 5:** Commit。

---

### Task 6: `POST .../chat` 路由（流式）

**Files:**
- Create: `web/src/app/api/packs/[handle]/[slug]/chat/route.ts`

- [ ] **Step 1:** `readSessionUserId()`；若无 → **401** JSON。

- [ ] **Step 2:** `findFirst` pack by handle+slug，select `id, authorId, visibility`；若无或 `!canViewPack(userId, pack)` → **404**（与 source-file 一致，不泄露 UNLISTED）。

- [ ] **Step 3:** 读 body JSON：`messages`（**UIMessage 或 CoreMessage** 数组，与 `useChat` 默认一致）；`userBlock: string`（**必填**）。`userBlock` trim 后长度 `> MAX_USER_BLOCK_CHARS` → **400**。

- [ ] **Step 4:** 从 `headers` 取 IP：`req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? null`（或 Next 推荐方式），调用 `runChatAbusePolicies`。

- [ ] **Step 5:** `loadPackMarkdownByPaths` + `buildPackChatSystemPrompt`；`createOpenAI` / `openai` from `@ai-sdk/openai`，`streamText({ model: openai(process.env.OPENAI_CHAT_MODEL ?? 'gpt-4o-mini'), system, messages })`（**model id 用 env 可覆盖**）。

- [ ] **Step 6:** 若 `!process.env.OPENAI_API_KEY` → **503**。

- [ ] **Step 7:** 返回 **`result.toUIMessageStreamResponse()`** 或当前 `ai` 包推荐的 **streaming Response** API（以安装版本文档为准）。

- [ ] **Step 8:** 在文件顶 `export const maxDuration = 60`（若部署允许）。

- [ ] **Step 9:** 手动：`curl` 无 cookie → 401；带 session 与合法 body → 200 stream（需本地 `OPENAI_API_KEY`）。

- [ ] **Step 10:** Commit。

---

### Task 7: 客户端 — USER 弹窗与 localStorage

**Files:**
- Create: `web/src/app/packs/[handle]/[slug]/pack-chat-user-dialog.tsx`
- Create: `web/src/lib/pack-chat-storage.ts`（可选：键名工厂）

- [ ] **Step 1:** 定义 **localStorage key**：`ocs.packChat.userBlock.v1:${userId}:${handle}:${slug}`，值为 **确认后的 `userBlock` 字符串**。

- [ ] **Step 2:** 组件 props：`open`, `onOpenChange`, `handle`, `slug`, `userId`, `initialFromPackUserMd: Partial<...>`, `defaultTimezone`, `onConfirm(userBlock: string)`。

- [ ] **Step 3:** 表单字段对齐 spec §4.3；确认时 **序列化为完整 Markdown**（含模板文末段落）。

- [ ] **Step 4:** 若 **`重新设定`**：父组件清空 `messages`（`useChat` `setMessages([])`）并 `open=true`。

- [ ] **Step 5:** Commit。

---

### Task 8: 客户端 — `pack-chat` 主组件与 `useChat`

**Files:**
- Create: `web/src/app/packs/[handle]/[slug]/pack-chat.tsx`

- [ ] **Step 1:** 未登录：展示「开始对话」按钮，**`<Link href={/login?callbackUrl=...}>`** 或 `signIn` 等价（与站点现有 auth 一致）；`callbackUrl` 为当前 pack 详情页 URL（encodeURIComponent）。

- [ ] **Step 2:** 已登录：首次无 localStorage → 打开 USER Dialog；有缓存 → 展示横幅 **已使用之前的设定开始对话** + **重新设定**。

- [ ] **Step 3:** `useChat({ api: '/api/packs/${handle}/${slug}/chat', body: { userBlock } })`（**实际 URL 需 encode handle/slug**）；每轮请求附带 **同一 `userBlock`**（来自 state，与缓存同步）。

- [ ] **Step 4:** 登录后拉取 **`USER.md`**：对 `GET /api/packs/.../source-file?path=USER.md`（复用现有 query），404 则无视；200 则 `parsePackUserMd` 填默认 + `handle` + `Intl` timezone。

- [ ] **Step 5:** UI 对齐现有 `Card` / `Button` / `textarea` / 滚动消息区（与 `pack-showcase` 风格协调）。

- [ ] **Step 6:** Commit。

---

### Task 9: 详情页接入

**Files:**
- Modify: `web/src/app/packs/[handle]/[slug]/page.tsx`

- [ ] **Step 1:** 在合适位置（如 showcase 下方）渲染 `<PackChat handle= slug= userId= ... />`；**仅当有 `userId` 时传**（或组件内用 session API `/api/auth/me` 若已有模式——以仓库现有为准）。

- [ ] **Step 2:** `pnpm run build` 在 `web` 内通过。

- [ ] **Step 3:** Commit。

---

### Task 10: 文档与环境变量

**Files:**
- Modify: `docs/DEVELOPMENT.md`
- 可选: `docs/DEPLOY.md` 一句

- [ ] **Step 1:** 在 `DEVELOPMENT.md` 增加 **OpenAI / chat** 小节：`OPENAI_API_KEY`、`OPENAI_CHAT_MODEL`（可选）、本地启用 chat 的步骤。

- [ ] **Step 2:** Commit。

---

## Spec 覆盖自检

| Spec 章节 | 对应任务 |
|-----------|----------|
| §1 入口可见、登录门 | Task 8、9 |
| §4 四层注入 | Task 3、6 |
| §4.2 USER.md 预填、解析失败 | Task 4、7、8 |
| §5 缓存、重新设定 | Task 7、8 |
| §6 滥用中间层 | Task 5、6 |
| §8 测试矩阵 | Task 3–5 单测 + Task 6 手动 |

**缺口：** E2E 未列（YAGNI）；若需 Playwright 可后续单独立项。

---

## Execution handoff

Plan complete and saved to `docs/superpowers/plans/2026-04-06-p1-c-instant-chat.md`.

**Two execution options:**

1. **Subagent-Driven（推荐）** — 每任务派生子代理，任务间 review，迭代快  
2. **Inline Execution** — 本会话按任务顺序实现，检查点复盘  

你更倾向哪一种？若无需选择，可直接说「开始实现」从 **Task 1** 做起。

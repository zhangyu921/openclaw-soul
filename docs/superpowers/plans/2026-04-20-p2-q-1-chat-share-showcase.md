# P2-Q-1 Chat 分享到「对话截图」Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 作者在 Pack Chat 用「分享」入口下载 Markdown 或生成对话长图，预览确认后上传到现有「对话截图」画廊（`POST .../showcase-image`），无服务端制图、无 Prisma 变更。

**Architecture:** 抽出与 assistant 错误气泡相关的判定到 `pack-chat-assistant-error.ts`；分享导出用 `filterMessagesForShowcaseShare` + `textFromMessage`；浏览器内 **Canvas 2D** 自绘气泡与换行，超限高度时绘制裁剪提示；`compressShowcaseForUpload` 压到 ≤2 MiB 后 multipart 上传。`PackChat` 从详情页接收 `isAuthor` 与当前 `showcaseImageCount` 以在客户端提前拦截「已满 10 张」。

**Tech Stack:** Next.js App Router、`@ai-sdk/react` `UIMessage`、Vitest（node）、Canvas 2D、`compressShowcaseForUpload`（`web/src/lib/compress-showcase-client.ts`）、`DropdownMenu`（`web/src/components/ui/dropdown-menu.tsx`）、`next-intl`。

---

## 文件结构（将创建 / 修改）

| 路径 | 职责 |
|------|------|
| `web/src/lib/pack-chat-assistant-error.ts` | `ASSISTANT_ERROR_ID_PREFIX`、`isAssistantErrorMessage`（单源） |
| `web/src/lib/pack-chat-assistant-error.test.ts` | 上述函数单元测试 |
| `web/src/lib/pack-chat-share-messages.ts` | `filterMessagesForShowcaseShare` |
| `web/src/lib/pack-chat-share-messages.test.ts` | 过滤逻辑测试 |
| `web/src/lib/pack-chat-share-image.ts` | Canvas 生成 `File`（webp/jpeg），含最大高度截断提示文案参数 |
| `web/src/app/[locale]/packs/[handle]/[slug]/pack-chat-share-to-showcase-dialog.tsx` | 预览对话框 + 确认上传 + 错误展示 |
| `web/src/app/[locale]/packs/[handle]/[slug]/pack-chat.tsx` | Share 下拉、挂接下载与对话框；重构引用 `isAssistantErrorMessage` |
| `web/src/app/[locale]/packs/[handle]/[slug]/page.tsx` | 传入 `isAuthor`、`showcaseImageCount` |
| `web/messages/en.json` / `zh.json` | `packChat` 命名空间新 key |
| `docs/harness/task-p2-q-1.md` | 与实现同步的 task 记录（验收时填） |
| `docs/superpowers/specs/2026-04-20-p2-q-1-chat-share-showcase-design.md` | 可将状态改为「已批准 / 已实现」行（可选） |

---

### Task 1: 抽出 `isAssistantErrorMessage` 并加测试

**Files:**
- Create: `web/src/lib/pack-chat-assistant-error.ts`
- Create: `web/src/lib/pack-chat-assistant-error.test.ts`
- Modify: `web/src/app/[locale]/packs/[handle]/[slug]/pack-chat.tsx`（删除本地 `ASSISTANT_ERROR_ID_PREFIX` / `isAssistantErrorMessage`，改为 import）

- [ ] **Step 1: 新建 `pack-chat-assistant-error.ts`**

```typescript
import type { UIMessage } from "ai";

export const ASSISTANT_ERROR_ID_PREFIX = "assistant-error-";

export function isAssistantErrorMessage(message: UIMessage): boolean {
  return (
    message.role === "assistant" && message.id.startsWith(ASSISTANT_ERROR_ID_PREFIX)
  );
}
```

- [ ] **Step 2: 新建测试 `pack-chat-assistant-error.test.ts`**

```typescript
import { describe, expect, it } from "vitest";
import type { UIMessage } from "ai";
import { isAssistantErrorMessage } from "./pack-chat-assistant-error";

describe("isAssistantErrorMessage", () => {
  it("returns true for assistant message with error id prefix", () => {
    const m = {
      id: "assistant-error-abc",
      role: "assistant",
      parts: [{ type: "text" as const, text: "err" }],
    } satisfies UIMessage;
    expect(isAssistantErrorMessage(m)).toBe(true);
  });

  it("returns false for normal assistant", () => {
    const m = {
      id: "msg-1",
      role: "assistant",
      parts: [{ type: "text" as const, text: "hi" }],
    } satisfies UIMessage;
    expect(isAssistantErrorMessage(m)).toBe(false);
  });
});
```

- [ ] **Step 3: 运行测试**

Run: `pnpm --filter @openclaw-soul/web exec vitest run src/lib/pack-chat-assistant-error.test.ts`  
Expected: FAIL（模块尚未存在则先 Step 1 再跑；通过后为 PASS）

- [ ] **Step 4: 修改 `pack-chat.tsx`** — 删除文件内 `ASSISTANT_ERROR_ID_PREFIX` 与 `isAssistantErrorMessage` 函数定义，增加：

```typescript
import { isAssistantErrorMessage } from "@/lib/pack-chat-assistant-error";
```

- [ ] **Step 5: 再跑测试 + typecheck**

Run: `pnpm --filter @openclaw-soul/web test` 与 `pnpm --filter @openclaw-soul/web typecheck`  
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add web/src/lib/pack-chat-assistant-error.ts web/src/lib/pack-chat-assistant-error.test.ts web/src/app/\[locale\]/packs/\[handle\]/\[slug\]/pack-chat.tsx
git commit -m "refactor(web): centralize pack chat assistant error detection"
```

---

### Task 2: `filterMessagesForShowcaseShare` + 测试

**Files:**
- Create: `web/src/lib/pack-chat-share-messages.ts`
- Create: `web/src/lib/pack-chat-share-messages.test.ts`

- [ ] **Step 1: 实现 `pack-chat-share-messages.ts`**

```typescript
import type { UIMessage } from "ai";
import { isAssistantErrorMessage } from "@/lib/pack-chat-assistant-error";

/** 生成分享图 / Markdown 时排除 assistant 错误气泡。 */
export function filterMessagesForShowcaseShare(messages: UIMessage[]): UIMessage[] {
  return messages.filter((m) => !isAssistantErrorMessage(m));
}
```

- [ ] **Step 2: 测试 `pack-chat-share-messages.test.ts`**

```typescript
import { describe, expect, it } from "vitest";
import type { UIMessage } from "ai";
import { filterMessagesForShowcaseShare } from "./pack-chat-share-messages";

describe("filterMessagesForShowcaseShare", () => {
  it("drops assistant error messages", () => {
    const ok: UIMessage = {
      id: "a",
      role: "assistant",
      parts: [{ type: "text", text: "hello" }],
    };
    const bad: UIMessage = {
      id: "assistant-error-x",
      role: "assistant",
      parts: [{ type: "text", text: "stack" }],
    };
    expect(filterMessagesForShowcaseShare([ok, bad])).toEqual([ok]);
  });
});
```

- [ ] **Step 3: 运行 vitest 该文件**

Run: `pnpm --filter @openclaw-soul/web exec vitest run src/lib/pack-chat-share-messages.test.ts`  
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add web/src/lib/pack-chat-share-messages.ts web/src/lib/pack-chat-share-messages.test.ts
git commit -m "feat(web): filter messages for showcase share export"
```

---

### Task 3: Canvas 生成 `File`

**Files:**
- Create: `web/src/lib/pack-chat-share-image.ts`

- [ ] **Step 1: 实现核心函数**（浏览器专用；勿在 node 单测中调用）

约定常量（可微调，但须在文件顶部集中）：

- `EXPORT_WIDTH = 720`
- `PADDING = 24`
- `MAX_CANVAS_HEIGHT = 16000`（超过则停止继续堆消息，底部绘制「内容已截断」提示，**i18n 文案由参数传入** `truncatedFooter: string`）
- 用户气泡右对齐灰底、assistant 左对齐；`fillText` 前用 `measureText` 做英文/中文混合的简单贪心换行（逐词/逐字符 fallback）

签名建议：

```typescript
import type { UIMessage } from "ai";
import { textFromMessage } from "@/lib/pack-chat-message-text";
import { filterMessagesForShowcaseShare } from "@/lib/pack-chat-share-messages";

export type BuildShareImageOptions = {
  /** 画布底部「已截断」提示（与 locale 一致） */
  truncatedFooter: string;
};

/**
 * 返回 webp 或 jpeg File，供 showcase-image POST。
 * 仅在浏览器调用。
 */
export async function buildPackChatShareImageFile(
  messages: UIMessage[],
  options: BuildShareImageOptions
): Promise<File>;
```

实现要点：

1. `const filtered = filterMessagesForShowcaseShare(messages)`；若 `filtered.length === 0` → `throw new Error("empty")`（调用方 i18n）。
2. `document.createElement("canvas")`，`scale` 可选 `devicePixelRatio` 仅当需要更清晰时（注意最终 `toBlob` 文件大小；MVP 可用 `scale = 1` 降低风险）。
3. 用 `canvas.toBlob` + `File`；若 `blob.size > MAX_SHOWCASE_IMAGE_BYTES`，调用 `compressShowcaseForUpload(file)`（见 `compress-showcase-client.ts`）再返回。

- [ ] **Step 2: 本地手动验证**（`pnpm --filter @openclaw-soul/web dev`，在临时按钮中调用）— 本 Task 可不提交临时按钮；Task 5 一并接好。

- [ ] **Step 3: Commit**

```bash
git add web/src/lib/pack-chat-share-image.ts
git commit -m "feat(web): build pack chat transcript image for showcase upload"
```

---

### Task 4: 预览对话框 + 上传

**Files:**
- Create: `web/src/app/[locale]/packs/[handle]/[slug]/pack-chat-share-to-showcase-dialog.tsx`

- [ ] **Step 1: 实现组件**（props 草案）

```tsx
export type PackChatShareToShowcaseDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  handle: string;
  slug: string;
  /** 生成失败 / 上传失败 */
  onErrorMessage?: (msg: string | null) => void;
  previewFile: File | null;
  busy: boolean;
  onConfirmUpload: () => void | Promise<void>;
};
```

UI：`Dialog`（与项目现有 `Dialog` 组件一致，grep `from "@/components/ui/dialog"`）、内嵌 `<img src={URL.createObjectURL(previewFile)} />`（`useEffect` cleanup `revokeObjectURL`）、**确认** / **取消**；`busy` 时禁用按钮并显示 loading。

`onConfirmUpload` 由父组件实现：父组件已持有 `File`，确认时 `compressShowcaseForUpload(file)` → `FormData` append `image` → `fetch(\`/api/packs/${encH}/${encS}/showcase-image\`, { method: "POST", body: form, credentials: "include" })` → `res.ok` 则 `onOpenChange(false)` + `router.refresh()`（`useRouter` from `@/i18n/navigation`）。

- [ ] **Step 2: Commit**

```bash
git add web/src/app/\[locale\]/packs/\[handle\]/\[slug\]/pack-chat-share-to-showcase-dialog.tsx
git commit -m "feat(web): dialog to preview chat share image before showcase upload"
```

---

### Task 5: `pack-chat.tsx` 集成 Share 菜单与流程

**Files:**
- Modify: `web/src/app/[locale]/packs/[handle]/[slug]/pack-chat.tsx`
- Modify: `web/src/app/[locale]/packs/[handle]/[slug]/page.tsx`

**Props 扩展：**

```typescript
isAuthor?: boolean;
showcaseImageCount: number;
```

（`showcaseImageCount` 来自 `page.tsx` 已有 `showcaseImageCount` 变量。）

- [ ] **Step 1: `page.tsx` 传入**

```tsx
<PackChat
  ...
  isAuthor={isAuthor}
  showcaseImageCount={showcaseImageCount}
/>
```

- [ ] **Step 2: 替换工具栏中独立 `ConversationDownload`** 为：

  - `DropdownMenu`，`DropdownMenuTrigger` = `Button` + `Share2`（`aria-label` 用 i18n「分享」）
  - `DropdownMenuItem`：**下载 Markdown** — 逻辑复用 `messagesToMarkdown` + 与原 `ConversationDownload` 相同触发下载（可抽 8 行函数 `downloadMessagesAsMarkdown` 在同文件或 `conversation.tsx` 旁小 util）
  - `DropdownMenuItem`：**生成对话图并添加到对话截图** — 仅当 `isAuthor && messages.length > 0` 时 `disabled={false}`；点击时若 `showcaseImageCount >= MAX_SHOWCASE_IMAGES`（从 `@/lib/upload-limits` import）则 `setShareError(t("shareShowcaseFull"))` 并 return
  - 生成图：`buildPackChatShareImageFile(filtered, { truncatedFooter: t("shareImageTruncated") })`，`setPreviewFile`，`setShareDialogOpen(true)`

- [ ] **Step 3: 挂载 `PackChatShareToShowcaseDialog`**，`previewFile` state，`confirm` 内上传逻辑见 Task 4

- [ ] **Step 4: 跑 `pnpm --filter @openclaw-soul/web typecheck` + `pnpm --filter @openclaw-soul/web lint` + `pnpm test`**

- [ ] **Step 5: Commit**

```bash
git add web/src/app/\[locale\]/packs/\[handle\]/\[slug\]/pack-chat.tsx web/src/app/\[locale\]/packs/\[handle\]/\[slug\]/page.tsx web/src/app/\[locale\]/packs/\[handle\]/\[slug\]/pack-chat-share-to-showcase-dialog.tsx
git commit -m "feat(web): share menu for markdown download and chat image to showcase"
```

---

### Task 6: i18n

**Files:**
- Modify: `web/messages/en.json`, `web/messages/zh.json`

- [ ] **在 `packChat` 下增加**（key 名可微调，须与代码一致）：

| Key | en 示例 | zh 示例 |
|-----|---------|---------|
| `share` | Share | 分享 |
| `shareAria` | Open share options | 打开分享选项 |
| `shareDownloadMarkdown` | Download as Markdown | 下载为 Markdown |
| `shareGenerateShowcaseImage` | Add chat as image to screenshots… | 生成对话图并添加到对话截图… |
| `shareShowcaseFull` | Screenshot gallery is full (10 images). Remove one in Showcase first. | 对话截图已满（10 张）。请先在 Showcase 中删除一张。 |
| `shareImageTruncated` | … (truncated; shorten the chat and try again) | …（内容已截断，请缩短对话后重试） |
| `shareImageEmpty` | Nothing to export | 没有可导出的消息 |
| `shareUploadFailed` | Could not upload image | 图片上传失败 |
| `sharePreviewTitle` | Preview | 预览 |
| `shareConfirmUpload` | Add to screenshots | 添加到对话截图 |
| `shareCancel` | Cancel | 取消 |

- [ ] **Commit**

```bash
git add web/messages/en.json web/messages/zh.json
git commit -m "i18n: pack chat share to showcase strings"
```

---

### Task 7: 文档与 harness task 收尾

- [ ] 更新 `docs/harness/task-p2-q-1.md` 的 A/B/C/D 节与 `docs/superpowers/specs/2026-04-20-p2-q-1-chat-share-showcase-design.md` 顶部状态（可选）
- [ ] 全量验证：`pnpm test`、`pnpm --filter @openclaw-soul/web typecheck`、`pnpm --filter @openclaw-soul/web lint`
- [ ] Commit：`docs: complete P2-Q-1 harness task notes`

---

## Spec 对照（自审）

| Spec 要求 | Task |
|-----------|------|
| 分享入口 + 下载 Markdown | Task 5–6 |
| 生成图 → 预览 → 确认上传 | Task 3–5 |
| 现有 POST showcase-image | Task 4–5 |
| 客户端制图、compress | Task 3 |
| 排除错误气泡 | Task 1–2 |
| 满 10 张提示 | Task 5（`MAX_SHOWCASE_IMAGES`） |
| 截断可见提示 | Task 3 `truncatedFooter` + i18n |
| CI 命令 | Task 7 |

**Placeholder 扫描：** 无 TBD；制图细节在 Task 3 代码中一次性写清。

---

## 执行交接

Plan complete and saved to `docs/superpowers/plans/2026-04-20-p2-q-1-chat-share-showcase.md`. Two execution options:

**1. Subagent-Driven (recommended)** — dispatch a fresh subagent per task, review between tasks, fast iteration  

**2. Inline Execution** — execute tasks in this session using executing-plans, batch execution with checkpoints  

Which approach?

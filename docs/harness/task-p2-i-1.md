# HARNESS TASK — P2-I-1

## A. 输入任务（Task Intake）

- **任务标题**：Soul 对话本地缓存 +「新对话」按钮
- **来源**：`docs/ROADMAP.md` P2-I、IDEAS-INBOX
- **目标（用户价值）**：刷新或返回详情页后仍能看到与同 Soul 的对话历史；一键清空当前线程开始新对话
- **范围（允许改动）**：`web/` pack 详情 `PackChat`；`pack-chat-storage` 键名约定；`messages` 中英文案
- **非目标（本轮不做）**：服务端会话、多标签同步、IndexedDB 大文件、跨设备
- **验收条件（可验证）**：
  - 登录且完成 USER 设定后，多轮对话写入浏览器本地；刷新页面后消息列表仍在
  - 「新对话」清空当前消息与本地缓存，可重新发首条消息
- **风险点**：`localStorage` 配额与隐私（本机、同 origin）；仅缓存对话 JSON，不含密钥

## B. 执行拆解（Execution Plan）

1. **现状**：`userBlock` 已用 `localStorage`；`useChat` 的 `messages` 仅存内存，刷新即失。
2. **方案**：按 `userId+handle+slug` 存 `UIMessage[]` JSON；挂载时用 `setMessages` 恢复；持久化用防抖避免流式输出频繁写入；「新对话」调用 `setMessages([])` 并 `removeItem`。
3. **竞态**：首次恢复前禁止把空数组写回存储——用 `persistRef` + `queueMicrotask` 在 `setMessages` 之后再允许持久化。
4. **文案**：更新 `flowIntro` / `activeIntro`（不再写「仅本会话」），新增 `newChat` 按钮文案。
5. **验证**：`pnpm test`、`pnpm --filter @openclaw-soul/web typecheck`、`pnpm --filter @openclaw-soul/web lint`。

## C. 实施记录（Implementation Log）

- **实际改动文件**：
  - `web/src/lib/pack-chat-storage.ts` — `packChatMessagesStorageKey`
  - `web/src/app/[locale]/packs/[handle]/[slug]/pack-chat.tsx` — 恢复 / 防抖持久化 / `startNewChat`
  - `web/messages/zh.json`、`web/messages/en.json` — 文案与 `newChat` / `newChatAria`
- **关键实现说明**：`messagesHydrated` 在 `setMessages` 恢复之后经 `queueMicrotask` 置真，避免首次把 `[]` 写回 storage；持久化 400ms debounce；`新对话` 调用 `stop()` + `setMessages([])` + `removeItem`。
- **与硬约束对齐说明**：仅浏览器 `localStorage`；无 CLI 对用户目录的破坏性操作。

## D. 验收证据（Verification Evidence）

- `pnpm test`：通过
- `pnpm --filter @openclaw-soul/web typecheck`：通过
- `pnpm --filter @openclaw-soul/web lint`：通过
- **结果摘要**：通过

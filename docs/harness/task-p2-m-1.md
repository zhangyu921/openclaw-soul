# HARNESS TASK — P2-M-1

## A. 输入任务（Task Intake）

- **任务标题**：Pack 详情 Chat 在模型流式/思考阶段展示 typing 指示
- **来源**：`docs/IDEAS-INBOX.md`（已 `*` 归入）
- **目标（用户价值）**：等待回复时有「对方在打字」感，不展示中间思考内容
- **范围（允许改动）**：`pack-chat.tsx` 与 `useChat`/`Message` UI；必要时样式组件
- **非目标（本轮不做）**：暴露 reasoning 文本；改模型 API
- **验收条件（可验证）**：`streaming`/`submitted` 时在助手侧或输入区上方有 typing 动效；完成后消失
- **风险点**：与 `ai` SDK 状态字段对齐（`status`）

## B. 执行拆解（Execution Plan）

1. 用 `status === "submitted" | "streaming"` 与最后一条消息判断是否在等助手首 token。
2. 助手气泡尚无可见正文时跳过渲染该条，单独渲染 `Message` + 三点 `animate-bounce`；避免空气泡与 typing 重复。
3. `aria-live` / i18n `typingAria`。
4. `pnpm test`、web typecheck、lint。

## C. 实施记录（Implementation Log）

- **实际改动文件**：`web/src/app/[locale]/packs/[handle]/[slug]/pack-chat.tsx`、`web/messages/en.json`、`web/messages/zh.json`
- **关键实现说明**：`shouldShowAssistantTyping`：末条为用户或末条助手 `trim` 后正文长度为 0 且 `busy` 时显示指示；首 token 到达后自然隐藏
- **与硬约束对齐说明**：未触碰 `apply`/脱敏文案

## D. 验收证据（Verification Evidence）

- **测试命令与结论**：
  - `pnpm test`：通过
  - `pnpm --filter @openclaw-soul/web typecheck`：通过
  - `pnpm --filter @openclaw-soul/web lint`：通过
- **结果摘要**：通过

## F. Done 判定（Definition of Done）

- [x] 目标与验收条件达成
- [x] 必要测试通过
- [x] 硬约束未触碰
- [x] 验证证据完整

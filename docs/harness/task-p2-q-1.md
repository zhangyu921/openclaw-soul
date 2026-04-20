# HARNESS TASK — P2-Q-1

## A. 输入任务（Task Intake）

- **任务标题**：Pack Chat 聊天记录一键分享到 showcase 板块
- **来源**：`docs/IDEAS-INBOX.md`（已 `*` 归入）
- **目标（用户价值）**：复用与「下载 Markdown」相同的导出格式，将当前线程追加到 Showcase 正文，便于在「展示正文」中继续编辑
- **范围（允许改动）**：`PATCH /api/packs/...`（新增 `appendShowcaseMd`）、`pack-chat.tsx`、i18n
- **非目标（本轮不做）**：自动上传对话截图到画廊、站外分享
- **验收条件（可验证）**：作者登录且在 Chat 有消息时可见分享按钮；点击后 Showcase 正文追加 `## Chat` 区块 + 对话 Markdown；超长或 API 错误有提示；`router.refresh()` 后上方 Showcase 可见更新
- **风险点**：showcase 总字数上限（32k）；仅作者可 PATCH；不暗示脱敏

## B. 执行拆解（Execution Plan）

1. API：`appendShowcaseMd` 与 `showcaseMd` 互斥；服务端读取当前正文，用 `---` 分隔追加 `## Chat\n\n` + 片段并校验 `MAX_SHOWCASE_MD_CHARS`
2. UI：`messagesToMarkdown` 与下载一致；过滤 `assistant-error-*` 气泡；作者显示 Share 按钮 + 状态文案 + `router.refresh()`
3. i18n：`en`/`zh` 文案与 a11y `aria-label`
4. 验证：`pnpm test`、`web typecheck`、`web lint`

## C. 实施记录（Implementation Log）

- **实际改动文件**：`web/src/app/api/packs/[handle]/[slug]/route.ts`、`web/src/app/[locale]/packs/[handle]/[slug]/pack-chat.tsx`、`web/src/app/[locale]/packs/[handle]/[slug]/page.tsx`、`web/messages/en.json`、`web/messages/zh.json`
- **关键实现说明**：append 避免未上架包在客户端难以 GET 到当前 `showcaseMd`；与全文替换 `showcaseMd` 互斥避免歧义
- **与硬约束对齐说明**：仅 session 作者 PATCH；未暗示自动脱敏

## D. 验收证据（Verification Evidence）

- **测试命令与结论**：
  - `pnpm test`：通过（CLI + Web vitest）
  - `pnpm --filter @openclaw-soul/web typecheck`：通过
  - `pnpm --filter @openclaw-soul/web lint`：通过
- **结果摘要**：通过

## F. Done 判定（Definition of Done）

- [x] 目标与验收条件达成
- [x] 必要测试通过
- [x] 硬约束未触碰
- [x] 验证证据完整

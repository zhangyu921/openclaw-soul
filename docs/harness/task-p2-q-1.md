# HARNESS TASK — P2-Q-1

## A. 输入任务（Task Intake）

- **任务标题**：Pack Chat 分享到「对话截图」（客户端长图 + 预览后上传）
- **来源**：[`docs/superpowers/specs/2026-04-20-p2-q-1-chat-share-showcase-design.md`](../superpowers/specs/2026-04-20-p2-q-1-chat-share-showcase-design.md)
- **目标（用户价值）**：作者将当前对话导出为一张图，确认后进入 Showcase「对话截图」画廊
- **范围（允许改动）**：`pack-chat.tsx`、新 dialog、新 lib（制图/过滤）、`page.tsx` props、`messages/*`
- **非目标**：服务端制图、改 Prisma、`showcaseMd` 追加协议
- **验收条件（可验证）**：分享菜单含下载 Markdown + 生成图；预览确认后 `POST .../showcase-image`；满 10 张与错误有提示；`pnpm test` / typecheck / lint 通过
- **风险点**：长对话截断提示在画布底部；不声称脱敏

## B. 执行拆解（Execution Plan）

见 [`docs/superpowers/plans/2026-04-20-p2-q-1-chat-share-showcase.md`](../superpowers/plans/2026-04-20-p2-q-1-chat-share-showcase.md)。

## C. 实施记录（Implementation Log）

- **实际改动文件**：`web/src/lib/pack-chat-assistant-error.ts`、`pack-chat-share-messages.ts`、`pack-chat-share-image.ts`、`pack-chat-share-to-showcase-dialog.tsx`、`pack-chat.tsx`、`page.tsx`、`messages/en.json`、`zh.json`
- **关键实现说明**：Canvas 浅色气泡图 → `compressShowcaseForUpload` → 现有 showcase-image POST；`filterMessagesForShowcaseShare` 排除 assistant 错误气泡
- **与硬约束对齐说明**：未 `rm -rf` 用户目录；未暗示自动脱敏

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

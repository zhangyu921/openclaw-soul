# HARNESS TASK — P2-N-1

## A. 输入任务（Task Intake）

- **任务标题**：详情页「包内文件」默认只展示列表，点击条目再请求预览
- **来源**：`docs/IDEAS-INBOX.md`（已 `*` 归入）
- **目标（用户价值）**：减少首屏/切换时的内容加载与闪烁
- **范围（允许改动）**：`PackSourceFiles` 与相关 client fetch；`source-file` API 若需
- **非目标（本轮不做）**：改 zip/库表写入模型
- **验收条件（可验证）**：进入详情页不自动拉取各文件正文；选中文件后再加载预览/编辑区
- **风险点**：与作者编辑、保存、chat 依赖的文件加载顺序对齐

## B. 执行拆解（Execution Plan）

1. 初始 `selectedPath` 为 `null`，移除「列表变化时默认选中首项」导致的自动 `GET`。
2. 仅在用户点击列表项（或作者新建文件后选中新建路径）时触发 `loadFile`；`pendingSelectRef` 覆盖 `router.refresh()` 与列表短暂不同步。
3. 未选中时右侧展示 `pickFileHint`；切换文件时用路径比对避免短暂展示陈旧 `ok` 内容。
4. `pnpm test`、web typecheck、lint。

## C. 实施记录（Implementation Log）

- **实际改动文件**：`web/src/app/[locale]/packs/[handle]/[slug]/pack-source-files.tsx`、`web/messages/en.json`、`web/messages/zh.json`
- **关键实现说明**：按需 fetch；新建 Markdown 后仍选中并加载新文件
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

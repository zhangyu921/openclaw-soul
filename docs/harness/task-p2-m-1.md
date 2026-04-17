# HARNESS TASK — P2-M-1（草案）

## A. 输入任务（Task Intake）

- **任务标题**：Pack 详情 Chat 在模型流式/思考阶段展示 typing 指示
- **来源**：`docs/IDEAS-INBOX.md`（已 `*` 归入）
- **目标（用户价值）**：等待回复时有「对方在打字」感，不展示中间思考内容
- **范围（允许改动）**：`pack-chat.tsx` 与 `useChat`/`Message` UI；必要时样式组件
- **非目标（本轮不做）**：暴露 reasoning 文本；改模型 API
- **验收条件（可验证）**：`streaming`/`submitted` 时在助手侧或输入区上方有 typing 动效；完成后消失
- **风险点**：与 `ai` SDK 状态字段对齐（`status`）

## B. 执行拆解（Execution Plan）

（实现前补全：用 `status` 驱动占位组件、i18n。）

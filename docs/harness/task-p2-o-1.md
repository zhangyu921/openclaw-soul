# HARNESS TASK — P2-O-1（草案）

## A. 输入任务（Task Intake）

- **任务标题**：窄屏时 Header 缩小或隐藏品牌长文案，避免折行
- **来源**：`docs/IDEAS-INBOX.md`（已 `*` 归入）
- **目标（用户价值）**：小屏下顶栏保持一行、可读且不挤占内容区
- **范围（允许改动）**：全站 Header / 布局组件；必要时 `globals.css` 断点样式
- **非目标（本轮不做）**：重做整站导航信息架构
- **验收条件（可验证）**：在常见窄屏宽度（如 ≤390px）下 header 不出现换行错乱；品牌仍可辨认或有等价入口（如缩短文案 / logo only）
- **风险点**：与 locale、dashboard 链接、登录态按钮的 flex 优先级冲突

## B. 执行拆解（Execution Plan）

（实现前补全：选定断点、缩短文案 vs 隐藏 vs `truncate` 的方案，与现有 Header 组件对齐。）

# HARNESS TASK — P2-O-1

## A. 输入任务（Task Intake）

- **任务标题**：窄屏时 Header 缩小或隐藏品牌长文案，避免折行
- **来源**：`docs/IDEAS-INBOX.md`（已 `*` 归入）
- **目标（用户价值）**：小屏下顶栏保持一行、可读且不挤占内容区
- **范围（允许改动）**：全站 Header / 布局组件；必要时 `globals.css` 断点样式
- **非目标（本轮不做）**：重做整站导航信息架构
- **验收条件（可验证）**：在常见窄屏宽度（如 ≤390px）下 header 不出现换行错乱；品牌仍可辨认或有等价入口（如缩短文案 / logo only）
- **风险点**：与 locale、dashboard 链接、登录态按钮的 flex 优先级冲突

## B. 执行拆解（Execution Plan）

**Brainstorming 结论（方案对比）**

| 方案 | 做法 | 取舍 |
|------|------|------|
| **A（采用）** | `sm` 以下隐藏副标题；主标题 `truncate` + 略小字号；logo 略小；导航 `flex-nowrap`；品牌链 `min-w-0 flex-1` | 无新文案 key；与现有 i18n 一致；hover `title` 补全名 |
| B | 为窄屏单独加短标题 message key | 维护成本高，长语言仍可能溢出 |
| C | 超窄仅显示 logo | 品牌辨识度弱，验收「仍可辨认」偏紧 |

**子步骤**

1. 调整顶栏容器 `gap` / `px`，减轻窄屏水平压力。
2. 品牌区：副标题 `hidden sm:block`；主标题 `truncate` + `text-sm`→`sm:text-base/lg`；logo `size-7`→`sm:size-8`。
3. 导航：`flex-wrap` → `flex-nowrap`，`shrink-0`，避免控件折到第二行。
4. 品牌 `Link`：`min-w-0 flex-1` + `title={siteName}`，保证左侧让出空间给右侧控件。
5. 跑 `pnpm test`、web `typecheck`、`lint`。

## C. 实施记录（Implementation Log）

- **实际改动文件**：`web/src/components/site-header.tsx`
- **关键实现说明（为什么这样做）**：单行顶栏的关键是「左侧可收缩截断 + 右侧不换行」；窄屏去掉副标题比改文案更稳。
- **与硬约束对齐说明**：
  - `apply` 写配置未触发破坏性删除（未涉及）
  - 未暗示自动脱敏（未涉及）

## D. 验收证据（Verification Evidence）

- **测试命令与结论**：
  - `pnpm test`：通过
- **子系统验证（按改动选择）**：
  - Web：`pnpm --filter @openclaw-soul/web typecheck`、`lint`：通过
- **结果摘要**：通过

## E. 失败回流（Failure Feedback，若未通过必填）

—

## F. Done 判定（Definition of Done）

- [x] 目标与验收条件达成
- [x] 必要测试通过
- [x] 硬约束未触碰
- [x] 验证证据完整
- [x] 剩余风险已说明（极窄屏 + 长 locale 文案仍依赖 truncate + `title`）
- [ ] （如失败）已产出下一轮任务

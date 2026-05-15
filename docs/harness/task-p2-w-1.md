# HARNESS TASK — P2-W-1

## A. 输入任务（Task Intake）

- **任务标题**：Chat 预设场景模板：替代空白 USER.md 弹窗
- **来源**：CEO 战略规划 — 即时体验优化研究
- **目标（用户价值）**：用户首次与 Soul 对话时，不必面对空白 USER.md 编辑框——改为从预设场景中选择，一键填充上下文，降低「不知道该说什么」的流失
- **范围（允许改动）**：`pack-chat-user-dialog.tsx` 改造；可选的 `web/messages/*.json` 场景文案
- **非目标（本轮不做）**：Guest 免登录、独立聊天页、USER.md 模板持久化到服务端
- **验收条件（可验证）**：
  - 点击「开始对话」后弹窗展示 3~4 个场景卡片 + 「自定义」入口
  - 选择预设场景后，USER 块自动填入对应模板，直接进入聊天
  - 「自定义」保留当前自由编辑体验
  - 已缓存过 userBlock 的用户不弹窗（保持现有逻辑）
- **风险点**：场景文案需要与 Soul 人格无关（是通用模板）；多语言同步

---

## B. 执行拆解（Execution Plan）

```yaml
divergence: low
divergence_rationale: 仅改 1 个弹窗组件 + 文案 JSON，无 schema 变更，不触碰硬约束
scope_files_estimate: 3
touches_hard_constraints: false
recommended_alternative_id: A
alternatives_blocked_if_chosen: none
```

**背景**

当前流程：用户点「开始对话」→ 弹出 Modal，展示空白 `<textarea>`，内容为 `USER.md` 模板（含 `${userHandle}`、`${timezone}` 等占位符）。普通用户不理解 USER.md 的用途，面对空白框产生摩擦。

**方案对比**

| 方案 | 思路 | 取舍 | 建议 |
|------|------|------|------|
| **A（推荐）** | 弹窗改为场景卡片网格：每个卡片有图标 + 标题 + 预览文案；点击即填充并开始聊天 | 需要设计 3~4 个通用场景模板 | ✅ |
| B | 保持现有弹窗，但在 textarea 上方加一排快捷按钮插入模板片段 | 改动最小，但体验提升有限 | — |
| C | 完全去掉弹窗，直接进入聊天，Soul 先发一句问候引导用户 | 激进；Soul 的问候语质量不可控，且仍需传递 user context | — |

**推荐方案子步骤**

1. 在 `pack-chat-user-dialog.tsx` 中新增 `ScenarioCards` 子组件：4 张卡片（倾诉心事 / 创作搭档 / 深度讨论 / 自定义），每张卡片包含 icon、标题、预览文案
2. 选择非「自定义」卡片 → 用预设模板替换 textarea 内容 → 自动调用 `onConfirm`（跳过一次点击）
3. 预设模板文案放入 `web/messages/{en,zh}.json`，格式为 `chat.scenarios.{vent,create,discuss}`，每个含 `label` + `template`
4. 保持现有逻辑：若 localStorage 已有该 Soul 的 userBlock → 跳过弹窗，直接进入聊天

**未采纳方案的触发条件**

- 若场景模板接受度低（用户反馈「预设不匹配」）→ 改走方案 B（快捷按钮插入片段）

---

## C. 实施记录（Implementation Log）

（待执行后填写）

---

## D. 验收证据（Verification Evidence）

（待执行后填写）

---

## E. 失败回流（Failure Feedback）

（待执行后填写，若未通过必填）

---

## F. Done 判定（Definition of Done）

- [ ] 目标与验收条件达成
- [ ] `pnpm test` 通过
- [ ] `pnpm --filter @openclaw-soul/web typecheck` 通过
- [ ] `pnpm --filter @openclaw-soul/web lint` 通过
- [ ] 硬约束未触碰

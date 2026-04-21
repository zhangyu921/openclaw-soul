# HARNESS TASK P2-S-1

**合并记录**：[#17](https://github.com/zhangyu921/openclaw-soul/pull/17)（squash，2026-04-21）。

## A. 输入任务（Task Intake）

- **任务标题**：详情页 hero：CLI apply 一键复制 + 底部 CLI 文案面向用户
- **来源**：`docs/ROADMAP.md` P2-S-1；`docs/IDEAS-INBOX.md`（已 `*` 归入）
- **目标（用户价值）**：在详情页**第一个带头像的卡片**内即可复制 `apply` 命令（带复制图标），减少滚动；底部「CLI」卡片保留，但文案从路径/`openclaw.json` 细节改**面向用户**（强调会备份等），仍链到 OpenClaw 文档。
- **范围（允许改动）**：`web/` 详情页布局与文案；可新增小粒度的纯函数 + Vitest（与现有 `src/lib/*.test.ts` 一致）。
- **非目标（本轮不做）**：改 CLI 行为、改 `apply` 写盘语义、画廊查看次数（属 P2-T-1）。
- **验收条件（可验证）**：
  1. 首屏头像卡片内展示与底部一致的 `npx @openclaw-soul/cli apply <handle>/<slug>`，并提供可访问的复制控件（含复制图标或等价 aria）。
  2. 点击复制后命令写入剪贴板（与 dashboard `CopyPublishCommand` 行为一致）。
  3. 底部 CLI 卡片仍存在，且 `cliCardDesc` 中/英不再以大段技术路径为主轴，改为用户可理解的说明（含备份意涵），文档链接保留。
  4. `pnpm test`、`pnpm --filter @openclaw-soul/web typecheck`、`pnpm --filter @openclaw-soul/web lint` 通过。
- **风险点**：剪贴板 API 需安全上下文；失败时静默降级（与现有 copy 按钮一致）。

---

## B. 执行拆解（Execution Plan）

```yaml
divergence: medium
divergence_rationale: 预计改动 >3 文件且新增 packDetail i18n key；方案均为纯展示层无 schema 变更
scope_files_estimate: 6
touches_hard_constraints: false
recommended_alternative_id: A
alternatives_blocked_if_chosen: none
```

**方案对比**

| 方案 | 思路 | 取舍 | 建议 |
|------|------|------|------|
| **A（推荐）** | 纯函数生成命令字符串 + Vitest；`pack-apply-command.tsx` 客户端复制；首屏 Card 内标题区下方插入；底部 CLI 文案只改 i18n | 与 `CopyPublishCommand` 一致；可测 | ✅ |
| B | 全部逻辑塞进 `pack-avatar-block.tsx` | 组件职责混杂 | — |

**推荐方案子步骤**

详见 [`docs/superpowers/plans/2026-04-21-p2-s-1.md`](../superpowers/plans/2026-04-21-p2-s-1.md)。

**未采纳方案的触发条件**

- 若需把复制逻辑与头像上传强耦合 → 再评估 B

---

## C. 实施记录（Implementation Log）

- **实际改动文件**：
  - `web/src/lib/pack-apply-cmd.ts`
  - `web/src/lib/pack-apply-cmd.test.ts`
  - `web/src/app/[locale]/packs/[handle]/[slug]/pack-apply-command.tsx`
  - `web/src/app/[locale]/packs/[handle]/[slug]/page.tsx`
  - `web/messages/en.json`
  - `web/messages/zh.json`
  - `docs/superpowers/plans/2026-04-21-p2-s-1.md`
  - `docs/ROADMAP.md`
  - `docs/IDEAS-INBOX.md`
- **关键实现说明（为什么这样做）**：命令字符串集中在 `buildPackApplyCommand`，首屏与底部 `<pre>` 共用，避免漂移；复制交互对齐 dashboard 的剪贴板模式。
- **与硬约束对齐说明**：
  - `apply` 写配置未触发破坏性删除
  - 未暗示自动脱敏

---

## D. 验收证据（Verification Evidence）

- **测试命令与结论**：
  - `pnpm test`：通过（含 `pack-apply-cmd.test.ts`）
  - `pnpm --filter @openclaw-soul/web typecheck`：通过
  - `pnpm --filter @openclaw-soul/web lint`：通过
- **子系统验证（按改动选择）**：
  - Web：未跑 dev smoke；纯 UI + 文案 + lib 单测
- **结果摘要**：通过

---

## F. Done 判定（Definition of Done）

- [x] 目标与验收条件达成
- [x] 必要测试通过
- [x] 硬约束未触碰
- [x] 验证证据完整
- [x] 剩余风险已说明
- [ ] （如失败）已产出下一轮任务

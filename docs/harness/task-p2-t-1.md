# Harness Task: P2-T-1

## A. 输入任务（Task Intake）

- **任务标题**：画廊列表 Soul 被查看/预览次数统计
- **来源**：`docs/ROADMAP.md` P2-T-1、IDEAS-INBOX（已 `*` 归入）
- **目标（用户价值）**：在首页画廊 **card** 上展示 Soul 被站内涵览的热度；仅当累计 **>10** 次时在 **标题行对应右侧** 展示数字，避免低流量时空洞噪声。
- **范围（允许改动）**：`web/prisma`（Pack 上持久化计数字段 + migrate）、`/[locale]/page.tsx` 列表查询与 card UI、`/[locale]/packs/[handle]/[slug]/page.tsx` 或等效服务端的「计一次阅读」、站内 `messages/*` 文案。可见性与现有画廊一致（仅已上架、未从 dashboard 移除的 pack 在首页出现；计数可覆盖**任何能进入详情页的阅读**，含未上架分享链接，与「热度」一致）。
- **非目标（本轮不做）**：按唯一访客/会话去重、反爬虫、作者后台单独报表、CLI、公开 API 暴露原始计数。不在 dashboard 行内重复展示（除非实现时与验收冲突再收紧）。
- **验收条件（可验证）**：
  1. 数据库中每个 Pack 有持久化的非负整型「被查看」计数，默认 0。
  2. 非作者用户打开某 pack **详情页**（成功渲染）时，该 pack 计数 **+1**；作者本人打开自己的 pack **不**增加（避免编辑自刷）。实现位置与并发策略在 plan 中固定。
  3. 首页画廊列表各 card 在 **标题行区域**（与标题同一行或标题行 flex 的右侧）展示次数；**仅当计数 > 10** 时显示（≤10 不显示该 UI）。
  4. `pnpm test` + web `typecheck` + `lint` 通过；若有与计数相关的纯函数则附单元测试。
- **风险点**：高并发下对同一行的频繁 `UPDATE`（可用 increment、接受近似）；开发环境 React 严格模式或 prefetch 导致 **重复**计数（在 spec 中说明可接受或缓解策略）。隐私：不展示访客身份。硬约束：不涉及 `apply` 破坏性写盘、不暗示脱敏。

---

## B. 执行拆解（Execution Plan）

```yaml
divergence: high
divergence_rationale: 需修改 Prisma schema 并运行迁移（harness-recon 分歧表「修改 Prisma schema / 迁移」→ high）
scope_files_estimate: 7
touches_hard_constraints: false
recommended_alternative_id: A
alternatives_blocked_if_chosen: 选 C 则无法满足「按 pack 在画廊 card 展示次数」
```

**方案对比**

| 方案 | 思路 | 取舍 | 建议 |
|------|------|------|------|
| **A（推荐）** | 在 `Pack` 上增加 `profileViewCount`（`Int @default(0)`）；详情页 RSC 在加载 pack 成功后对非作者 `increment`；首页 `select` 并在 card 标题行展示（>10） | 与现有 Postgres 真源一致；实现短；运维简单 | ✅ |
| B | 独立 `PackViewDaily` 按日汇总 | 可审计性强但表更大、实现重；超出本轮 | — |
| C | 仅分析侧（K/V 或外部分析） | 无法在 Prisma 列表查询一条带出 | — |

**推荐方案子步骤**

详见：[`../superpowers/plans/2026-04-22-p2-t-1.md`](../superpowers/plans/2026-04-22-p2-t-1.md) 与 [`../superpowers/specs/2026-04-22-p2-t-1-design.md`](../superpowers/specs/2026-04-22-p2-t-1-design.md)。

**未采纳方案的触发条件**

- 若未来需要按日/周报表或去重 UV → 考虑迁移到 B 或加事件表。

---

## C. 实施记录（Implementation Log）

- **实际改动文件**：
  - `web/prisma/schema.prisma`、`web/prisma/migrations/20260422033730_add_pack_profile_view_count/migration.sql`
  - `web/src/lib/pack-profile-view.ts`、`web/src/lib/pack-profile-view.test.ts`
  - `web/src/app/[locale]/packs/[handle]/[slug]/page.tsx`（`select.id`、访问通过后 `profileViewCount` increment + try/catch）
  - `web/src/app/[locale]/page.tsx`、`web/messages/en.json`、`web/messages/zh.json`
- **关键实现说明（为什么这样做）**：计数仅在通过 `notFound` 与可见性之后执行；`shouldCountPackProfileView` 排除作者本人。首页仅 `profileViewCount > 10` 时展示，避免低次数噪声。
- **与硬约束对齐说明**：
  - `apply` 写配置未触发破坏性删除
  - 未暗示自动脱敏

---

## D. 验收证据（Verification Evidence）

- （实现后由 harness-verify 填写）

---

## E. 失败回流（Failure Feedback，若未通过必填）

- （保留空）

---

## F. Done 判定（Definition of Done）

- [ ] 目标与验收条件达成
- [ ] 必要测试通过
- [ ] 硬约束未触碰
- [ ] 验证证据完整
- [ ] 剩余风险已说明
- [ ] （如失败）已产出下一轮任务

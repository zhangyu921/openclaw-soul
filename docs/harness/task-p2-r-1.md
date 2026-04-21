# HARNESS TASK P2-R-1

## A. 输入任务（Task Intake）

- **任务标题**：Header：语言与主题切换左移（紧邻标题/品牌右侧，账号入口仍在最右）
- **来源**：`docs/ROADMAP.md` / `docs/IDEAS-INBOX.md` 已归入行
- **目标（用户价值）**：语言与主题作为「站点偏好」紧随品牌区，与「账号/登录」分层；符合「左侧偏好控件、右侧身份」的心智模型。
- **范围（允许改动）**：`web/src/components/site-header.tsx` 布局与结构；不涉及 `LocaleSwitcher` / `ModeToggle` 内部实现。
- **非目标（本轮不做）**：修改文案、主题 token、locale 路由逻辑；新增 E2E；改动 dashboard/login 路由。
- **验收条件（可验证）**：
  1. 桌面与窄屏下，语言与主题控件出现在品牌链接**右侧**、账号/登录链接**左侧**（同一行视觉顺序：品牌 → 语言 → 主题 → … → 登录或用户名）。
  2. 账号/注册入口仍在 header 最右，现有窄屏截断/防折行行为不明显回退（品牌区仍 `truncate`）。
  3. `pnpm test`、`pnpm --filter @openclaw-soul/web typecheck`、`pnpm --filter @openclaw-soul/web lint` 通过。
- **风险点**：窄屏下左侧簇过长导致挤压 — 通过保留 `min-w-0`/`truncate` 与控件 `shrink-0` 缓解；无隐私/apply/CLI 风险。

---

## B. 执行拆解（Execution Plan）

```yaml
divergence: low
divergence_rationale: 单模块 ≤3 文件、无数据/API 变更，方案差异仅为 flex 分组方式（见 recon 表「单模块 / ≤3 文件」）
scope_files_estimate: 1
touches_hard_constraints: false
recommended_alternative_id: A
alternatives_blocked_if_chosen: 若选 B（纯 CSS order）则文档顺序与 tab 顺序可能背离，不利于辅助技术；none（选 A）
```

**方案对比**

| 方案 | 思路 | 取舍 | 建议 |
|------|------|------|------|
| **A（推荐）** | 左簇：`Link(品牌)` + `LocaleSwitcher` + `ModeToggle`；右 `nav` 仅登录/用户 | DOM 顺序与视觉一致；易读易维护 | ✅ |
| B | 保持单一 `nav`，用 Tailwind `order-*` 重排 | 少包一层 div；顺序与 DOM 可能不一致 | — |

**推荐方案子步骤**

1. 将 `LocaleSwitcher`、`ModeToggle` 从右侧 `nav` 移出，放入品牌 `Link` 同一左侧 flex 组内（`Link` 保持 `min-w-0`/`flex-1`/`truncate`，控件组 `shrink-0`）。
2. 右侧 `nav` 仅保留 `Link`（登录或 `@handle`/dashboard）。
3. 跑 `pnpm test`、`pnpm --filter @openclaw-soul/web typecheck`、`pnpm --filter @openclaw-soul/web lint` 填 D 节。

**未采纳方案的触发条件**

- 若未来需在「偏好区」插入更多控件且与品牌争夺宽度 → 再评估水平滚动或折叠菜单（非本轮）。

---

## C. 实施记录（Implementation Log）

- **实际改动文件**：
  - `web/src/components/site-header.tsx`
- **关键实现说明（为什么这样做）**：用左侧外层 flex 包裹「品牌 Link」与「Locale + Mode」控件组，右侧 `nav` 仅保留身份入口；控件组 `shrink-0`，品牌列保持 `truncate`，与 P2-O 窄屏策略一致。
- **与硬约束对齐说明**：
  - `apply` 写配置未触发破坏性删除
  - 未暗示自动脱敏

---

## D. 验收证据（Verification Evidence）

- **测试命令与结论**：
  - `pnpm test`：通过（CLI 21 + Web 57，1 skipped）
  - `pnpm --filter @openclaw-soul/web typecheck`：通过
  - `pnpm --filter @openclaw-soul/web lint`：通过
- **子系统验证（按改动选择）**：（本轮仅 Header 布局，无 CLI / Prisma）
- **结果摘要**：通过

---

## F. Done 判定（Definition of Done）

- [x] 目标与验收条件达成
- [x] 必要测试通过
- [x] 硬约束未触碰
- [x] 验证证据完整
- [x] 剩余风险已说明（窄屏若极端拥挤可后续再收折控件，非本轮）

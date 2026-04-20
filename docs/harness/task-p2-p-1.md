# HARNESS TASK — P2-P-1

## A. 输入任务（Task Intake）

- **任务标题**：语言切换改为图标入口，点击弹窗选择 locale
- **来源**：`docs/IDEAS-INBOX.md`（已 `*` 归入）
- **目标（用户价值）**：节省 header 空间，切换路径一致、可访问
- **范围（允许改动）**：locale 切换 UI（`next-intl` 路由或现有 switcher）；对话框/抽屉组件复用站内模式
- **非目标（本轮不做）**：增加新语言资源文件内容翻译全集
- **验收条件（可验证）**：点击语言图标打开弹窗；选择后导航到对应 `/<locale>/...` 且当前页语义保持；键盘与焦点可关闭弹窗
- **风险点**：与 middleware、`Link` 前缀、已登录回调 URL 的一致性

## B. 执行拆解（Execution Plan）

**方案对比**

| 方案 | 取舍 |
|------|------|
| **A（采用）** | `Globe` 图标 + `Dialog`，列表映射 `routing.locales`，`router.replace(pathname, { locale })` 与旧行为一致 |
| B | `DropdownMenu` | 依赖另一套浮层，与现有 Dialog 模式略混 |
| C | 抽屉 | 移动端友好但 header 动作偏重 |

**子步骤**

1. `nav` 文案：标题、说明、`localeNameEn` / `localeNameZh`（`en`+`zh` 双语）。
2. `LocaleSwitcher`：受控 `Dialog` + 与 `ModeToggle` 一致的 `icon-sm` 按钮。
3. 列表项：`aria-current`、当前项 `Check` + `bg-muted`；选后 `replace` 并关弹窗。
4. `pnpm test`、web typecheck、lint。

## C. 实施记录（Implementation Log）

- **实际改动文件**：`web/src/components/locale-switcher.tsx`，`web/messages/en.json`，`web/messages/zh.json`
- **关键实现说明**：沿用 `usePathname` + `router.replace(..., { locale })`，与原先一键互切等效，仅交互改为显式列表，便于扩展更多 locale。
- **与硬约束对齐说明**：未触碰 `apply`/脱敏相关路径。

## D. 验收证据（Verification Evidence）

- **测试命令与结论**：
  - `pnpm test`：通过
- **子系统验证**：
  - `pnpm --filter @openclaw-soul/web typecheck`、`lint`：通过
- **结果摘要**：通过

## E. 失败回流（Failure Feedback，若未通过必填）

—

## F. Done 判定（Definition of Done）

- [x] 目标与验收条件达成
- [x] 必要测试通过
- [x] 硬约束未触碰
- [x] 验证证据完整
- [x] 剩余风险已说明（未来新增 locale 需补 `localeName*` 或改为动态 key）
- [ ] （如失败）已产出下一轮任务

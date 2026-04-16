# HARNESS TASK (P2-E-1)

## A. 输入任务（Task Intake）

- **任务标题**：P2-E-1 Header 品牌与首屏视觉最小改造
- **来源**：`docs/ROADMAP.md`（P2-E）
- **目标（用户价值）**：首页首屏更有辨识度，用户更快理解品牌与产品气质
- **范围（允许改动）**：`web` 首页 Hero + Header 视觉层（不改核心业务流程）
- **非目标（本轮不做）**：
  - 全站视觉重做
  - Logo 资产大改（仅最小可上线版本）
  - 动效系统重构
- **验收条件（可验证）**：
  - Hero 首屏品牌元素可见
  - Header 标题视觉样式有明显改进
  - 不影响现有登录/导航/多语言路径
- **风险点**：样式回归、移动端布局溢出、可访问性对比度

## B. 执行拆解（Execution Plan）

1. 盘点现有 header/home 结构，确定最小改动点
2. 实现品牌视觉增强（标题、强调层、轻量装饰）
3. 适配移动端与暗色模式
4. 跑 lint/typecheck/test 与必要 smoke
5. 产出 PR 与风险说明

## C. 实施记录（Implementation Log）

- **实际改动文件**：
  - `web/src/components/site-header.tsx`
  - `web/src/app/[locale]/page.tsx`
  - `web/messages/en.json`
  - `web/messages/zh.json`
- **关键实现说明（为什么这样做）**：
  - 采用“最小可上线”策略，仅增强 Header 品牌识别与 Home Hero 视觉层次，不改数据查询与登录/导航流程，降低回归风险并满足验收目标。
  - Header 通过轻量品牌徽记 + 二级短标语提升辨识度；Home Hero 通过渐变容器、kicker、副标题提升首屏信息密度与视觉聚焦。
- **与硬约束对齐说明**：
  - `apply` 写配置未触发破坏性删除
  - 未暗示自动脱敏

## D. 验收证据（Verification Evidence）

- **测试命令与结论**：
  - `pnpm --filter @openclaw-soul/web lint`：通过
  - `pnpm --filter @openclaw-soul/web typecheck`：通过
  - `pnpm --filter @openclaw-soul/web test`：通过（`17 passed | 1 skipped` files，`53 passed | 1 skipped` tests）
- **子系统验证（按改动选择）**：
  - Web：首页与 header 关键路径 smoke（结构未改，登录/注册/控制台导航入口保持原路径）
- **结果摘要**：
  - Hero 首屏品牌元素可见（kicker + badge + 副标题 + 视觉容器）
  - Header 标题视觉样式改进（品牌徽记 + 两层品牌文本）
  - 现有登录/导航/多语言路径未改
  - 剩余风险：超窄移动端下 Header 品牌副标可能较紧凑（不影响导航功能）
  - 回滚方式：回退 `web/src/components/site-header.tsx`、`web/src/app/[locale]/page.tsx`、`web/messages/en.json`、`web/messages/zh.json`

## E. 失败回流（Failure Feedback，若未通过必填）

- **失败现象**：
- **根因假设（<=3）**：
  1.
  2.
  3.
- **下一轮最小任务（<=0.5 天）**：
- **需要新增的测试/CI 守门**：

## F. Done 判定（Definition of Done）

- [x] 目标与验收条件达成
- [x] 必要测试通过
- [x] 硬约束未触碰
- [x] 验证证据完整
- [x] 剩余风险已说明
- [ ] （如失败）已产出下一轮任务

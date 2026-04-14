# HARNESS TASK (P2-F-1)

## A. 输入任务（Task Intake）

- **任务标题**：P2-F-1 画廊检索 MVP（关键词 + 标签）
- **来源**：`docs/ROADMAP.md`（P2-F）
- **目标（用户价值）**：用户更快找到想聊的 Soul，降低浏览成本
- **范围（允许改动）**：`web` 画廊列表检索交互、必要后端查询与测试
- **非目标（本轮不做）**：
  - 高级排序算法
  - 向量检索/语义检索
  - 复杂多维筛选面板
- **验收条件（可验证）**：
  - 支持关键词搜索（标题/摘要/slug 至少一项）
  - 支持基础标签筛选（若当前无标签字段则先定义最小兼容策略）
  - 搜索与筛选可组合且结果可预期
- **风险点**：查询性能、空结果体验、与多语言文案一致性

## B. 执行拆解（Execution Plan）

1. 确认当前画廊数据结构与可用检索字段
2. 设计 MVP 查询参数与接口契约
3. 落地前后端检索与筛选
4. 增加空态/无结果态与可见反馈
5. 跑自动化验证并产出 PR

## C. 实施记录（Implementation Log）

- **实际改动文件**：
  - `web/src/app/[locale]/page.tsx`
  - `web/src/components/home-pack-gallery.tsx`（新增）
  - `web/messages/en.json`
  - `web/messages/zh.json`
  - `docs/HARNESS-TASK-P2-F-1.md`
- **关键实现说明（为什么这样做）**：
  - 当前库表无独立 tags 字段，采用最小兼容策略：从 `packFilePaths` 推导基础标签（SOUL/IDENTITY/AGENTS/MEMORY 等），先提供可用筛选能力，后续可平滑迁移到持久化标签。
  - 关键词筛选匹配 `title/summary/slug/author handle`，并与标签筛选做交集，保证组合筛选结果可预期。
- **与硬约束对齐说明**：
  - `apply` 写配置未触发破坏性删除
  - 未暗示自动脱敏

## D. 验收证据（Verification Evidence）

- **测试命令与结论**：
  - `pnpm --filter @openclaw-soul/web lint`：通过
  - `pnpm --filter @openclaw-soul/web typecheck`：通过
  - `pnpm --filter @openclaw-soul/web test`：通过（`17 passed | 1 skipped` files，`53 passed | 1 skipped` tests）
- **子系统验证（按改动选择）**：
  - Web：画廊搜索/筛选关键路径 smoke（关键词、标签、组合筛选与清空筛选）
- **结果摘要**：
  - 关键词搜索可用（`title/summary/slug/author`）
  - 标签筛选可用（最小兼容策略：从 `packFilePaths` 派生 SOUL/IDENTITY/AGENTS/MEMORY）
  - 搜索与筛选可组合，空结果态与清空筛选入口已提供
  - 剩余风险：当前标签为推导值，不代表业务语义标签；后续若引入持久化 tags 字段需做兼容迁移
  - 回滚方式：回退 `web/src/app/[locale]/page.tsx`、`web/src/components/home-pack-gallery.tsx`、`web/messages/en.json`、`web/messages/zh.json`

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

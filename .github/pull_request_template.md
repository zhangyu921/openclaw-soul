## 任务上下文

- Roadmap 项：`<P?-X>`
- Harness task 文档：`docs/harness/task-*.md`
- 当前状态（必须与 label 一致）：`status:todo|in-progress|needs-review|changes-requested|ready-to-merge|done`

## 变更说明（Why > What）

- 本次解决的问题：
- 采用该方案的原因：
- 影响范围（模块/用户路径）：

## 验收证据（必填）

- [ ] `pnpm test`
- [ ] `pnpm typecheck`
- [ ] 关键路径 smoke（如 `pnpm e2e:smoke`）
- 关键输出/结论：

## 风险与回滚（必填）

- 已知风险：
- 不覆盖范围：
- 回滚方案（命令或步骤）：

## 审阅与合并

- [ ] 需要审阅（`status:needs-review`）
- [ ] 已按审阅意见修复（`status:changes-requested` -> `status:needs-review`）
- [ ] 审阅通过且 CI 绿（`status:ready-to-merge`）

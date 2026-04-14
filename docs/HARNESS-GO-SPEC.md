# HARNESS-GO SPEC

定义 `/harness-go` 的单轮执行协议：持续推进 roadmap，同时保持可审阅、可回滚、可验证。

---

## 输入与前置

- 输入：
  - `docs/ROADMAP.md`
  - `docs/IDEAS-INBOX.md`
  - `docs/HARNESS-STATE-MACHINE.md`
- 前置条件：
  - PR labels 已创建（`status:*`）
  - CI 可运行 `test + typecheck + e2e:smoke`

---

## 单轮流程

1. **Resume 未完成任务**
   - 扫描 `ROADMAP` 中 `🚧/👀/🛠️/✅(待合并)`。
   - 先处理已开始任务，不抢新任务。

2. **Ingest Ideas**
   - 读取 `IDEAS-INBOX` 新条目（自由一行一条）。
   - 去重并提炼为候选任务草案。
   - 候选项仅在用户确认后写入 roadmap。

3. **挑选并行任务**
   - 本轮最多 2~3 项，且尽量跨模块减少冲突。
   - 每项必须有独立 task 文档（`docs/HARNESS-TASK-*.md`）。

4. **并行实现 + 验证**
   - 任务内可嵌 superpowers 流程。
   - 每项必须有可复现证据（命令/测试/smoke）。

5. **开 PR 并同步状态**
   - `ROADMAP` 状态改为 `👀`（`needs_review`）。
   - PR 打 `status:needs-review`。

6. **审阅回路**
   - 若你要求修改：`🛠️` + `status:changes-requested`。
   - 修复后回到 `👀` + `status:needs-review`。

7. **合并回路**
   - 仅当审阅通过 + CI 绿：`✅(待合并)` + `status:ready-to-merge`。
   - 合并后：`✅` + `status:done`，并记录上线验证结论。

---

## 输出格式（每轮结束）

- **待你审阅**：PR 列表 + 一句话风险提示
- **待你决策**：路线分歧点（最多 3 个）
- **已上线**：本轮已完成任务与证据链接
- **下一轮候选**：最多 3 项（含推荐顺序）

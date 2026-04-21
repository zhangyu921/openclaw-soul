# HARNESS TASK TEMPLATE

用于把 roadmap/issue 转成可执行的单轮任务。建议每次仅填写 1 个任务。

---

## A. 输入任务（Task Intake）

- **任务标题**：
- **来源**：`docs/ROADMAP.md` / issue 链接 / 其他
- **目标（用户价值）**：
- **范围（允许改动）**：
- **非目标（本轮不做）**：
- **验收条件（可验证）**：
- **风险点**：安全 / 隐私 / 兼容性 / 回滚

---

## B. 执行拆解（Execution Plan）

由 [`harness-recon`](../skills/harness/recon.md) skill 产出。分歧度评分必须填，供 [`harness-go`](../skills/harness-go.md) 3d 分流。

```yaml
divergence: low | medium | high
divergence_rationale: <一句话，指向 recon skill 中的触发条件>
scope_files_estimate: <数字>
touches_hard_constraints: <true | false>
recommended_alternative_id: A
alternatives_blocked_if_chosen: <若选推荐方案会关上哪些门；none 表示无>
```

**方案对比**

| 方案 | 思路 | 取舍 | 建议 |
|------|------|------|------|
| **A（推荐）** | | | ✅ |
| B | | | — |

**推荐方案子步骤**（3~5 步；轻量模式直接在此列；PR 模式写「详见 plan」并附 plan 路径）

1.
2.
3.

**未采纳方案的触发条件**

- 若 <条件> → 改走 B

---

## C. 实施记录（Implementation Log）

- **实际改动文件**：
- **关键实现说明（为什么这样做）**：
- **与硬约束对齐说明**：
  - `apply` 写配置未触发破坏性删除
  - 未暗示自动脱敏

---

## D. 验收证据（Verification Evidence）

- **测试命令与结论**：
  - `pnpm test`：
- **子系统验证（按改动选择）**：
  - CLI：`pnpm run ocs -- <subcommand>`
  - Web：构建/关键路径 smoke
- **结果摘要**：通过 / 未通过（附原因）

---

## E. 失败回流（Failure Feedback，若未通过必填）

- **失败现象**：
- **根因假设（<=3）**：
  1.
  2.
  3.
- **下一轮最小任务（<=0.5 天）**：
- **需要新增的测试/CI 守门**：

---

## F. Done 判定（Definition of Done）

- [ ] 目标与验收条件达成
- [ ] 必要测试通过
- [ ] 硬约束未触碰
- [ ] 验证证据完整
- [ ] 剩余风险已说明
- [ ] （如失败）已产出下一轮任务

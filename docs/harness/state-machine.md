# HARNESS STATE MACHINE

用于 `ROADMAP ↔ PR` 的统一状态协议，避免任务状态双写和歧义。

---

## 1) 状态定义

- `todo`：任务已收录，尚未开始
- `in_progress`：任务正在实现
- `needs_review`：PR 已创建，等待人工审阅
- `changes_requested`：审阅意见已给出，等待修复
- `ready_to_merge`：审阅通过且 CI 通过，可合并
- `done`：已合并并完成上线验证（或明确不需要上线）

---

## 2) ROADMAP 与 PR Label 映射

| 任务状态 | ROADMAP 标记 | PR Label |
|---|---|---|
| `todo` | 空 | `status:todo` |
| `in_progress` | `🚧` | `status:in-progress` |
| `needs_review` | `👀` | `status:needs-review` |
| `changes_requested` | `🛠️` | `status:changes-requested` |
| `ready_to_merge` | `✅(待合并)` | `status:ready-to-merge` |
| `done` | `✅` | `status:done` |

说明：

- PR 只能有一个 `status:*` label。
- 任务状态与 PR label 不一致时，以 `ROADMAP` 为准并立即纠正。

---

## 3) 允许的状态流转

`todo -> in_progress -> needs_review -> ready_to_merge -> done`

可回退分支：

- `needs_review -> changes_requested`
- `changes_requested -> needs_review`
- `ready_to_merge -> changes_requested`

禁止跳跃：

- 不允许 `todo -> ready_to_merge`
- 不允许 `in_progress -> done`（除非明确无 PR 且为文档类微改）

---

## 4) 自动化执行约束（给 /harness-go）

1. 每轮最多并行 2~3 个 `in_progress` 任务。
2. 只有 `ready_to_merge` 且 CI 绿的 PR 才允许自动合并。
3. 合并后必须跑最小生产 smoke；失败则回流为 `changes_requested`。
4. 每轮结束产出汇总：`待审阅`、`待决策`、`已上线` 三段。

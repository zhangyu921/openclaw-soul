# HARNESS CHECKPOINT NOW

跨 chat 恢复的唯一入口。新对话只需读此文件 + ROADMAP 即可继续。

更新日期：2026-04-20

---

## 1) 全局状态

- **PR cap**：3
- **开放 PR 数**：0
- **IDEAS-INBOX 已读行数**：27（新增 2 条已归入 **P2-O-1**、**P2-P-1**）
- **上次 tick**：2026-04-20 — P0：合并 **#15**（P2-M-1 Pack Chat typing）；P2：收件箱两行入队
- **下一 tick 建议**：P3 **P2-N-1**（或 **P2-O-1** / **P2-P-1**，按队列顺序）

---

## 2) 活跃任务追踪

| ID | 任务 | 状态 | 分支 | PR | 备注 |
|----|------|------|------|----|------|
| P2-E-1 | Header 品牌与首屏视觉最小改造 | ✅ done | — | #10 (merged) | — |
| P2-F-1 | 画廊检索 MVP | deferred | — | — | 待数据库检索方案 |
| P2-G-1 | 登录入口整合 | ✅ done | — | #11 (merged) | Task：`docs/HARNESS-TASK-P2-G-1.md` |
| P2-H-1 | 创建 pack 后跳转详情页 | ✅ done | — | — | `docs/harness/task-p2-h-1.md` |
| P2-I-1 | Soul 对话本地缓存 + 新对话 | ✅ done | — | #12 (merged) | `docs/harness/task-p2-i-1.md` |
| P2-J-1 | 头像二次上传刷新 | ✅ done | — | — | `docs/harness/task-p2-j-1.md` |
| P2-K-1 | Pack zip 懒惰生成 | ✅ done | — | #13 (merged) | `docs/harness/task-p2-k-1.md` |
| P2-L-1 | 我的 Souls 列表移除 | ✅ done | — | #14 (merged) | `docs/harness/task-p2-l-1.md` |
| P2-M-1 | Pack Chat typing 指示 | ✅ done | — | #15 (merged) | `docs/harness/task-p2-m-1.md` |
| P2-N-1 | 包内文件按需预览 | todo | — | — | `docs/harness/task-p2-n-1.md`（草案） |
| P2-O-1 | Header 窄屏防折行 | todo | — | — | `docs/harness/task-p2-o-1.md`（草案） |
| P2-P-1 | 语言切换图标 + 弹窗 | todo | — | — | `docs/harness/task-p2-p-1.md`（草案） |

---

## 3) 新对话启动语句

```
/harness-go
```

Agent 会自动读取本文件并按优先级队列执行下一个动作。

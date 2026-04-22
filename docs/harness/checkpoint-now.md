# HARNESS CHECKPOINT NOW

跨 chat 恢复的唯一入口。新对话只需读此文件 + ROADMAP 即可继续。

更新日期：2026-04-22

---

## 1) 全局状态

- **PR cap**：3
- **开放 PR 数**：1（P2-T-1 high 分歧：仅 plan/spec，待审后改 `status:plan-approved`）
- **IDEAS-INBOX 已读行数**：37
- **上次 tick**：2026-04-22 — **P2-T-1** 产出 `harness/p2-t-1` 文档 + draft PR（**仅 plan，分歧度 high**）；等 plan review
- **下一 tick 建议**：人审 through：将 P2-T-1 PR label 换为 **`status:plan-approved`** 后，下一 `/harness-go` 走 **P1.5** 按 plan 实现；或 **P4** 若暂缓实现

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
| P2-N-1 | 包内文件按需预览 | ✅ done | — | — | `docs/harness/task-p2-n-1.md` |
| P2-O-1 | Header 窄屏防折行 | ✅ done | — | — | `docs/harness/task-p2-o-1.md` |
| P2-P-1 | 语言切换图标 + 弹窗 | ✅ done | — | — | `docs/harness/task-p2-p-1.md` |
| P2-Q-1 | Chat 分享到对话截图 | ✅ done | — | #16 (merged) | `docs/harness/task-p2-q-1.md` |
| P2-R-1 | Header 语言/主题按钮左移 | ✅ done | — | — | `docs/harness/task-p2-r-1.md` |
| P2-S-1 | 详情 hero apply 复制 + CLI 文案 | ✅ done | — | #17 (merged) | `docs/harness/task-p2-s-1.md` |
| P2-T-1 | 画廊查看次数 | plan 审中 | `harness/p2-t-1` | [#18](https://github.com/zhangyu921/openclaw-soul/pull/18) (draft) | `docs/harness/task-p2-t-1.md`；等 `status:plan-approved` 后实现 |

---

## 3) 新对话启动语句

```
/harness-go
```

Agent 会自动读取本文件并按优先级队列执行下一个动作。

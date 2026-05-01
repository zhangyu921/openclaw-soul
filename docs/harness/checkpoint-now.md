# HARNESS CHECKPOINT NOW

跨 chat 恢复的唯一入口。新对话只需读此文件 + ROADMAP 即可继续。

更新日期：2026-04-27

---

## 1) 全局状态

- **PR cap**：3
- **开放 PR 数**：0（推测；gh auth 过期无法确认）
- **IDEAS-INBOX 已读行数**：38
- **上次 tick**：2026-04-27 — logout button 迁移任务（`wanman/logout-btn-dashboard-nav`）代码完成，3 commits 已 push；`pnpm test`（85 pass）/ web typecheck / build 全部通过
- **gh auth 阻断**：`gh auth login` 需要交互式重认证，当前无法创建 PR / 查询 PR 状态
- **下一 tick 建议**：修复 gh auth → 为 logout button 创建 PR；择期推进 **P2-F 画廊检索** 或 **API route 测试覆盖**（pack CRUD/chat 路由 0 覆盖）

---

## 2) 活跃任务追踪

| ID | 任务 | 状态 | 分支 | PR | 备注 |
|----|------|------|------|----|------|
| P2-E-1 | Header 品牌与首屏视觉最小改造 | ✅ done | — | #10 (merged) | — |
| P2-F-1 | 画廊检索 MVP | deferred | — | — | 待数据库检索方案 |
| P2-G-1 | 登录入口整合 | ✅ done | — | #11 (merged) | `docs/harness/task-p2-g-1.md` |
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
| P2-T-1 | 画廊查看次数 | ✅ done | — | #18 (merged) | `docs/harness/task-p2-t-1.md` |
| P2-U-1 | 全站 favicon 与 Header 品牌标统一 | ✅ done | — | — | `docs/harness/task-p2-u-1.md` |
| P5 | 退出登录按钮移到 dashboard 导航栏 | 🚧 in_progress | `wanman/logout-btn-dashboard-nav` | 待创建（gh auth 阻断） | capsule `b77c324c`，3 commits 已 push |

---

## 3) 阻断项

- **gh auth 过期**：2026-04-27 检测到 `gh auth status` 失败（token invalid），需交互式 `gh auth login -h github.com`。影响：无法创建 PR、无法查询 PR 状态。

---

## 4) 新对话启动语句

```
/harness-go
```

Agent 会自动读取本文件并按优先级队列执行下一个动作。

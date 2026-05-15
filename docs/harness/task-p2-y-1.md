# HARNESS TASK — P2-Y-1

## A. 输入任务（Task Intake）

- **任务标题**：ChatThread 持久化：服务端保存对话历史，跨设备同步
- **来源**：CEO 战略规划 — Soul 对话记忆与连续性研究（Level 1）
- **目标（用户价值）**：用户与 Soul 的对话不再丢失——换设备、清缓存后仍可恢复历史对话；支持多线程管理（同一 Soul 多个对话主题）
- **范围（允许改动）**：
  - Prisma schema 新增 `ChatThread` + `ChatMessage` 表 + migration
  - 新增 API routes：`GET/POST /api/packs/[handle]/[slug]/chat/threads`、`GET/DELETE /api/packs/[handle]/[slug]/chat/threads/[threadId]`
  - 改造现有 `POST /api/packs/[handle]/[slug]/chat` 接受 `threadId`，完成后异步写消息
  - 客户端 `pack-chat.tsx`：挂载时从 API 恢复历史消息，localStorage 降级为离线缓存
  - 新增线程列表 UI 组件（侧栏或下拉）
- **非目标（本轮不做）**：
  - 跨对话记忆提取（Level 2：UserPackMemory / LLM 摘要）
  - 主动触达（Level 3：Soul 重新激活）
  - 多设备实时同步（本轮仅存储+恢复，不涉及 WebSocket / polling）
  - 线程重命名、线程搜索
- **验收条件（可验证）**：
  - 已登录用户在 Soul A 的聊天，刷新页面或换浏览器后消息仍可恢复
  - 用户可以创建多个线程（「新对话」= 新线程），在线程列表切换
  - 用户可以删除线程
  - localStorage 在 API 可用时仅作缓存（API 失败时 fallback）
- **风险点**：
  - 消息量增长 → 存储成本（预估 1 万次对话 ≈ 20MB，可接受）
  - 隐私：消息落库意味着用户对话内容持久化在服务端，需在 UI 中透明告知
  - 迁移：现有 localStorage 数据如何处理？（建议：首次加载时上传到服务端作为首个线程）

---

## B. 执行拆解（Execution Plan）

```yaml
divergence: medium
divergence_rationale: 涉及 schema 变更 + 多 API route + 客户端状态重构，文件 >3；但方案方向明确，无架构争议
scope_files_estimate: 8
touches_hard_constraints: false
recommended_alternative_id: A
alternatives_blocked_if_chosen: none
```

**背景**

当前聊天消息仅存浏览器 `localStorage`，服务器端零持久化。API route 流式返回后消息即消失。用户换设备、清缓存后对话全部丢失。每次打开都是「第一次见这个 Soul」。

**方案对比**

| 方案 | 思路 | 取舍 | 建议 |
|------|------|------|------|
| **A（推荐）** | ChatThread + ChatMessage 两张表；API 改造接受 threadId 并异步落库；客户端混合策略（API 优先 + localStorage fallback） | 新增 2 表 4 API，改动面较大；但架构清晰，为 Level 2/3 奠基 | ✅ |
| B | 仅将 localStorage 消息整体上传到一个 blob 字段（Pack 表加 `chatMessages: Json`） | 实现快（1 字段 + 2 API），但无法支持多线程、增量写入、单条消息查询 | — |
| C | 使用 Vercel KV / Redis 存储消息 JSON | 无需 schema 变更，但引入新依赖；结构化查询困难 | — |

**推荐方案子步骤**

### 1. Schema 变更

新增两张表（详见研究结论）：

- `ChatThread`：`id, userId, packId, title?, createdAt, updatedAt`；`@@unique([userId, packId, id])`；`@@index([userId, packId])`
- `ChatMessage`：`id, threadId, role (user|assistant), content (Text), createdAt`

### 2. API 改造

- 改造 `POST /api/packs/[handle]/[slug]/chat`：接受可选 `threadId`；若无则自动创建新线程；每次 exchange 完成后异步写入 2 条 ChatMessage（用户 + AI）
- 新增 `GET /api/packs/[handle]/[slug]/chat/threads`：返回当前用户在此 Soul 下的线程列表（id, title, updatedAt, 首条消息预览）
- 新增 `GET /api/packs/[handle]/[slug]/chat/threads/[threadId]`：返回该线程所有消息
- 新增 `DELETE /api/packs/[handle]/[slug]/chat/threads/[threadId]`：删除线程及所有消息

### 3. 客户端改造

- `pack-chat.tsx` 挂载时：先调 `GET threads` → 取最近线程 → `GET messages` → 水合到 `useChat` initialMessages
- localStorage 降级为 API 失败时的 fallback（现有逻辑保留在 catch 分支）
- 消息发送后：API 流式返回 + 客户端乐观更新；exchange 完成后 API 已异步落库
- 新增 `pack-chat-thread-list.tsx`：侧栏或下拉显示线程列表、切换、删除
- 「新对话」按钮行为改为：创建新线程（空 initialMessages）

### 4. 数据迁移

- 首次加载时检测 localStorage 是否有旧消息 → 弹窗提示「是否保存之前的对话？」→ 确认后上传创建首个线程 → 清除 localStorage

### 5. 隐私提示

- 第一次聊天时，在 USER 弹窗底部加一行 muted 文案：「对话内容将保存在你的账户中，仅你可见」

### 6. 验证

- `pnpm test`（含新增 API route 测试）
- `pnpm --filter @openclaw-soul/web typecheck` + `lint`
- `prisma migrate dev` 无报错

**未采纳方案的触发条件**

- 若用户量小、存储成本敏感 → 方案 B（blob JSON）可作为过渡
- 若团队决定全面引入 Redis → 方案 C 可与 session store 等其他需求捆绑评估

---

## C. 实施记录（Implementation Log）

（待执行后填写）

---

## D. 验收证据（Verification Evidence）

（待执行后填写）

---

## E. 失败回流（Failure Feedback）

（待执行后填写，若未通过必填）

---

## F. Done 判定（Definition of Done）

- [ ] Schema migration 成功
- [ ] 目标与验收条件达成
- [ ] `pnpm test` 通过（含新增测试）
- [ ] `pnpm --filter @openclaw-soul/web typecheck` 通过
- [ ] `pnpm --filter @openclaw-soul/web lint` 通过
- [ ] 硬约束未触碰
- [ ] 隐私提示已加入 UI

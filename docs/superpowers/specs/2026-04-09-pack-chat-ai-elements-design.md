# Pack 详情 chat：AI Elements 前端升级（设计）

**日期**：2026-04-09  
**状态**：已确认（brainstorming 收口）  
**范围**：`web/` — Pack 详情页「与 pack 对话」**前端 UI/交互**；**默认不**改 chat API 协议与模型拼装逻辑。

**关联**：

- 既有即时 chat 能力见 [`2026-04-06-p1-c-instant-chat-design.md`](2026-04-06-p1-c-instant-chat-design.md)（本 spec 在其之上做 **展示层** 升级）。
- 多语言总策略见 [`2026-04-08-web-i18n-design.md`](2026-04-08-web-i18n-design.md)；本 spec 对**本轮文案**采用宽松策略（见 §6）。

**路线图**：[`docs/ROADMAP.md`](../../ROADMAP.md) ideas（更好的 chat 对话效果 with AI element）。

---

## 1. 目标与成功标准

### 1.1 目标

- 在 **不改变既有产品行为**（登录门槛、USER 弹窗与 `localStorage`、`useChat` + `DefaultChatTransport`、`prepareSendMessagesRequest` 注入 `userBlock`）的前提下，将消息区与输入区升级为 **Vercel AI Elements**（`ai-elements` CLI，基于 shadcn/ui）与现有 **Tailwind + shadcn** 主题一致的体验。
- **必须有**：助手侧 **Markdown 渲染**（含常用 GFM）、流式输出可读、busy 时禁用发送、错误信息可见。
- **尽量有**：单条消息 **复制**；用户/助手消息 **清晰视觉区分**（以 Elements 默认能力为主）。
- **有则接、无则记为后续**：**重新生成**最后一条助手回复、**停止生成**（仅当 `@ai-sdk/react` `useChat` 暴露对应能力且接入成本低）。

### 1.2 非目标（本轮）

- 修改 **`POST /api/packs/[handle]/[slug]/chat`** 的请求/响应契约、模型选型、服务端 system 拼装（除非发现与 `UIMessage` / 流式协议 **不兼容**，则单独记录并最小修复）。
- 全站抽象「通用 Chat 壳」组件库；仅允许 **轻量文件拆分**（见 §4）。
- 对话落库、跨设备同步。

---

## 2. 方案选择

| 方案 | 说明 | 结论 |
|------|------|------|
| **A — 以 AI Elements 为主** | 按官方文档初始化并 `npx ai-elements@latest add <component>`，与现有 `useChat` 对接 | **采用** |
| **B — 混合** | 仅部分区域用 Elements，其余自绘 | 备选（仅当 CLI 与 Next 16 / 现有 shadcn 冲突时局部退回） |
| **C — 全自研** | `react-markdown` + 自绘气泡 | 不采用（与目标不符） |

**官方参考**：[AI Elements 概览与 Setup](https://sdk.vercel.ai/elements/overview)（实现前核对 **具体组件名与 props**，以当前文档为准）。

---

## 3. 技术约束

### 3.1 保持的前端契约

- **`useChat`**：`id`、`transport`（`DefaultChatTransport`、`api`、`credentials: "include"`、`prepareSendMessagesRequest` 合并 `userBlock`）保持不变，除非 Elements 示例 **强制**要求调整且与 AI SDK v6 类型一致。
- **消息正文抽取**：继续以 `UIMessage.parts` 中 `type === "text"` 的片段为准；若改用 Elements 推荐渲染方式，须保证 **流式更新** 与 **最终文本** 一致，并保留/更新 [`textFromMessage`](../../../web/src/app/[locale]/packs/[handle]/[slug]/pack-chat.tsx) 类逻辑或等价实现。

### 3.2 主题与样式

- **单一主题源**：沿用项目现有 CSS 变量与 shadcn 配置；CLI 若修改 `globals.css`、`components.json` 或新增组件路径，仅做 **最小合并**，避免双轨主题。
- **暗色模式**：与站点 `next-themes` 行为一致；若 Elements 某子块样式异常，优先用 **局部 className / wrapper** 修正。

### 3.3 安全（Markdown）

- 助手 Markdown **仅展示**：与站内其他 Markdown 预览一致，**不执行**用户 HTML；代码块仅高亮展示。若引入额外依赖，须遵循项目既有安全习惯。

---

## 4. 文件与代码组织

- **主入口**：[`web/src/app/[locale]/packs/[handle]/[slug]/pack-chat.tsx`](../../../web/src/app/[locale]/packs/[handle]/[slug]/pack-chat.tsx) — 保留流程状态机（空包、未登录、`flowStarted`、`PackChatUserDialog`、`userBlock`）；**替换**中间「消息列表 + 输入表单」为 AI Elements 组合。
- **可选拆分**：若单文件过长，可抽 **`pack-chat-thread.tsx`** 或 **`components/pack-chat/*`**，**不**强行创建全站共享抽象。
- **新增文件**：以 AI Elements CLI 生成物为准；自定义包装组件放在与 `pack-chat` 同域或 `components/` 下，命名清晰（如 `PackChatMessageList`）。

---

## 5. 交互与状态

| 状态 | 行为 |
|------|------|
| `status === "streaming"` 或 `"submitted"` | 输入区禁用；展示「进行中」指示（以 Elements + 现有文案习惯为准） |
| `error` | 展示可读错误信息（沿用或增强 `error.message`） |
| 空消息列表 | 空状态提示（可 i18n，见 §6） |

**停止 / 重新生成**：实现阶段查阅 `useChat` 是否提供 `stop`、`reload`（或等价）；**有则接**，**无则**在本 spec「后续」中记一笔，不阻塞本轮交付。

---

## 6. 文案与 i18n

- **倾向**：Pack 详情页外层 Card 标题、说明、CTA、`flowStarted` 前提示、错误与空状态等 **新增或本次修改** 的字符串，优先使用 **`useTranslations`** 并写入 `web/messages/en.json` 与 `zh.json`。
- **宽松策略（已确认）**：AI Elements **内置英文**或覆盖成本高的文案，**允许保留英文**；后续可单开 PR 统一清扫。
- **边界**：用户消息、USER 块、模型回复等 **用户/模型生成内容** 不进入 i18n JSON（与既有 i18n 设计一致）。

---

## 7. 测试与验收

- **单元测试**：若保留独立 `textFromMessage`（或等价），覆盖 **多段 text part**、**空列表**；CLI 改动导致 `parts` 用法变化时更新测试。
- **手动验收**：登录 → 完成或跳过 USER 设定 → 发送多轮消息 → 验证 Markdown（标题、列表、代码块）与流式显示；切换主题（若适用）无严重回归。
- **不强制** E2E；`pnpm -C web test` / `lint` / `build` 在实现计划中列为必跑项。

---

## 8. 风险与缓解

| 风险 | 缓解 |
|------|------|
| `ai-elements` 与 Next 16 / shadcn 版本摩擦 | 查官方 issue；必要时方案 B 局部自绘 |
| CLI 大 diff 难以 review | 分 commit：先 init + 最小组件，再接 `pack-chat` |
| i18n 与 Elements 字符串混杂 | §6 已允许英文 fallback；文档中列出未覆盖项 |

---

## 9. 后续（非本轮必做）

- 重新生成、停止生成（若本轮未接）。
- 将 pack-chat 剩余硬编码中文迁入 `messages`（全量清扫）。
- ROADMAP ideas 中「agent.md chat 文件改进」「参考 soul dic」属 **文档/叙事**，**单独需求**，不在本 spec 范围。

---

## 10. 实现协作方式

用户批准本 spec 后，由 **`writing-plans`** 产出分步实现计划（含依赖安装、CLI 命令、验证清单）；**不在 spec 批准前写实现代码**。

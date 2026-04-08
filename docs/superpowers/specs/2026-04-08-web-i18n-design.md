# Web 多语言（i18n）设计

**状态**：已确认（brainstorming 收口）  
**范围**：`web/`（Next.js 16 App Router）  
**关联**：`docs/ROADMAP.md` P2

## 1. 目标与成功标准

- **产品优先级**：登录后路径体验优先（dashboard、创建/编辑 pack、相关对话框等）；公开页可在同一套路由结构下分期补译文。
- **工作流**：文案以仓库内 **key-value 文件** 为真源；维护者用 IDE/Cursor + AI **补全/润色** 目标语言，**人工审 PR**；不引入 TMS；不强制 CLI 批量翻译（日后可加脚本，非本设计范围）。
- **URL**：全站页面使用 **`/[locale]/...`**（如 `/zh/dashboard`、`/en/packs/handle/slug`）；**`/api/*`、静态资源、`/_next`** 不带 locale 前缀。
- **语言检测与兜底**：
  - 首次访问 `/`：依据 **`Accept-Language`** 在 **`en` / `zh`** 间选择；无法匹配或不可靠时 **兜底 `en`**。
  - **Cookie 记住用户选择**（第一期必做）：用户通过语言切换显式选择后写入 cookie；后续访问 **优先级：`cookie` > `Accept-Language` > 兜底 `en`**。Cookie 名与具体 max-age 在实现阶段与 `next-intl` 惯例对齐并写入代码注释或 `web/AGENTS.md` 一句说明。

## 2. 方案选择

| 方案 | 说明 | 结论 |
|------|------|------|
| **next-intl** | App Router、`middleware`、服务端/客户端 `t()`、locale-aware `Link` | **采用** |
| 自研 `[locale]` + Context | 依赖少，自维护成本高 | 不采用 |
| 以客户端为主的 i18n | 首屏与 RSC 体验差 | 不采用 |

## 3. 架构要点

### 3.1 路由与文件布局

- 将现有页面迁移至 **`src/app/[locale]/...`**（一次性结构迁移，避免长期双轨 URL）。
- 根 `layout`：保证 **`html lang`** 与当前 `locale` 一致；会话与 `SiteHeader` 等现有逻辑放入 `[locale]` 下 layout 或保持可复用的服务端封装，**不改变业务安全模型**。

### 3.2 文案资源

- 放置 **`web/messages/en.json`** 与 **`web/messages/zh.json`**（第一期可单文件；后续可按模块拆分为多文件再合并导入，由实现计划定）。
- **Key 规范**：稳定、语义化（如 `dashboard.nav.packs`）；不以整句英文当 key。
- **缺译行为**：若 `zh` 缺少某 key，**fallback 到 `en`**（与全局兜底语言一致）。

### 3.3 与用户内容边界

- Pack 标题、SOUL/Markdown 正文、chat 用户消息等 **用户生成内容** 不进入 i18n JSON，保持作者语言。

### 3.4 `metadata` 与 SEO

- 至少对首页、dashboard 入口等关键路由按 locale 提供 **`title` / `description`**；其余可分期补齐。

### 3.5 字体

- 中文 UI 可读性：评估在中文 locale 下补充 **CJK 字体**（可与 UI  polish 同期，不阻塞 i18n 骨架）。

## 4. 分期（文案）

- **结构**：一次完成 **`[locale]`** 路由与 middleware、语言切换、cookie。
- **翻译填充**：第一期优先 **dashboard、login、register、与从零创建/编辑 pack 强相关** 的 UI 字符串；其余页面可暂示英文 fallback，后续 PR 补 `zh`。

## 5. 错误与 API

- **`/api/*`** 返回体默认仍以 **英文** 为主（或错误码 + 固定英文 message）；若未来要对齐 UI 语言，单独开需求，不在本设计范围。

## 6. 测试与验收（概要）

- 访问 `/` 在无 cookie 时根据 `Accept-Language` 进入 `/en` 或 `/zh`；无偏好时进 `/en`。
- 切换语言后 cookie 生效，刷新后保持；新开标签在同域下行为符合预期。
- 主要登录后路径在 `zh` 下关键文案为中文（以第一期范围为准）；内部链接均带正确 locale。

## 7. 实现协作方式

- **默认使用 subagent 模式**：独立子任务（例如 middleware + 配置、迁移 `[locale]` 目录、按模块替换文案、metadata）在实现阶段 **并行拆分**（见 `dispatching-parallel-agents` / Task 工具），减少单会话上下文膨胀；合并前跑 `web` 的 `lint` / `build` / 相关测试。

## 8. 后续

- 用户批准本 spec 后，由 **`writing-plans`** 产出分步实现计划（含任务边界与验证命令）；**不在 spec 批准前写实现代码**。

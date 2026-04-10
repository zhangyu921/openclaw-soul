# P2-C：全站文案与多语言（设计）

**日期**：2026-04-10  
**状态**：待审（brainstorming 收口）  
**范围**：`web/` — 在既有 `next-intl` 与 `messages/*.json` 上，将 **`src/app/[locale]`** 内其余用户可见文案迁入多语言，并与首页 **语气、称谓** 对齐。

**关联**：

- 路线图：[`docs/ROADMAP.md`](../../ROADMAP.md) **P2-C**。
- 多语言基础设施与约束：[`2026-04-08-web-i18n-design.md`](2026-04-08-web-i18n-design.md)（URL、cookie、fallback、UGC 边界、API 语言策略等；本 spec **不重复**修改那些全局约定，仅补充 **P2-C 文案与产品用词**）。
- 站点协作入口：[`web/AGENTS.md`](../../../web/AGENTS.md)。

---

## 1. 目标与成功标准

### 1.1 目标

- **`[locale]` 下用户可见字符串**（含页面 `metadata` 的 `title` / `description`、Suspense fallback、空态、按钮与表单标签、导航与页脚、**展示在浏览器内给用户看的错误/提示**）均以 **`messages/en.json` 与 `messages/zh.json`** 为真源。
- **语气**：与首页一致——面向用户、少内部/开发者 jargon；**基调**：温柔地帮助用户找到喜欢的 Soul；**不**用隐私相关表述制造恐慌。
- **称谓**：用户向文案统一使用 **Soul**；**中文 UI 统一写拉丁字 `Soul`**（与品牌拼写、英文站一致）。
- **禁用**：用户可见中英文里 **不出现** 英文 `pack` 或将其作为产品称谓（见 §1.3 例外）。

### 1.2 非目标（本 spec）

- 修改 **`/api/*`** 响应体默认语言策略（仍以既有设计为准，偏英文或错误码亦可）。
- 将 **用户生成内容**（Soul 标题、Markdown 正文、chat 消息等）迁入 i18n JSON。
- 为改文案而 **重命名 URL 路径**（例如 `/packs/...`）；若未来产品要求改公开 URL，单独立项。
- **P2-B**（首页信息结构重组）：本 spec **可**顺带润色已存在于 `home` 的句子以统一语气，**不**将首页版式重排纳入 P2-C 必交付项。

### 1.3 「pack」与代码/URL

- **允许**：代码目录名、API route、Prisma 模型、CLI 子命令、`apply [handle]/[slug]` 等 **开发者向** 上下文继续使用 `pack` 等技术词。
- **不允许**：面向最终用户在 UI 里用「pack」指代可浏览、可安装、可编辑的对象；统一说 **Soul**。

---

## 2. 方案选择（消息组织）

| 方案 | 说明 | 结论 |
|------|------|------|
| **单文件 + namespace 前缀** | 延续 `en.json` / `zh.json`，用 `auth.*`、`dashboard.*`、`packDetail.*` 等前缀 | **采用** |
| 按域拆多文件再 merge | 减少单文件冲突，需 merge 约定 | 本阶段不采用；文件过大时再评估 |
| 每页单一大 object | 与路由一一对应 | 不采用；跨页复用成本高 |

---

## 3. 架构与约定

### 3.1 Key 与 namespace

- Key **稳定、语义化**（如 `dashboard.nav.souls`）；不以整句英文当 key。
- 建议 namespace（实现时可微调）：`common`、`home`、`packChat`、`auth`、`dashboard`、`packDetail`、`packEdit`、`privacy`、`cliDevice`、`tokens`、`nav`、`footer`、`errors`（仅 **UI 展示** 用）。
- 既有 **`packChat`** 中仍含「pack」向用户表述的句子，纳入本轮 **改写为 Soul** 并迁入/合并 key。

### 3.2 缺译行为

- `zh` 缺少某 key 时 **fallback 到 `en`**（与全局 i18n 设计一致）。

### 3.3 Privacy 页语气（已定）

- **说明 + 安抚优先**：先交代数据如何处理、对用户的价值，再展开细节；中英 **结构策略一致**；避免首屏堆砌恐吓式风险表述。

---

## 4. 交付节奏（已定）

- **一轮交付**：同一里程碑内收齐 §1.1 范围内文案；验收时主要路径在 `en` / `zh` 下无 **有意遗漏** 的硬编码用户字符串（开发期-only 或注释可除外）。

---

## 5. 验收与自检（概要）

- **手动路径**（示例）：首页 → 登录/注册 → dashboard → 任一 Soul 详情（展示、编辑、chat）→ privacy → tokens / CLI device；切换语言重复。
- **自检**：对用户可见文案 **不出现 pack 作为产品名**；可辅以 `grep` 或清单（由实现计划细化）。

---

## 6. 后续

- 用户批准本 spec 后，由 **`writing-plans`** 产出实现计划（任务切分与验证命令）；**不在 spec 批准前写实现代码**。

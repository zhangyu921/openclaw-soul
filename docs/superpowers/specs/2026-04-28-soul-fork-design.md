# Soul Fork（一键 Fork）设计稿

**日期**：2026-04-28  
**状态**：已定稿（待实现）  
**范围**：`web/`（Fork API、Pack 溯源字段、详情页 Fork 入口与 Tip）；CLI **不包含** `fork` 子命令（MVP）；用户仍用 `apply` 装到本机。

**已选方案**：专用 Fork API（见 [`README`](../../README.md) 与既有 `POST /api/packs` 分离），服务端事务内完成库表与存储复制。

---

## 1. 背景与目标

**背景**：用户希望像 GitHub 一样，在喜欢上某个已上架 Soul 时，**快速**在**自己账号**下得到一份**完整可编辑**副本，并保留对来源的展示。

**目标**

- 登录用户在**他人**的、**画廊可见**（`LISTED`）Soul 详情页可发起 **Fork**。
- Fork 完成后跳转到**新 Soul 详情页**；新包默认 **`UNLISTED`**，由用户后续自行公开。
- 新包为**完整副本**：与源在作者侧可见的内容一致，包括包内 Markdown/二进制、头像、showcase 等（与「完整副本」拍板一致）。
- 详情页展示简短溯源文案，风格对齐 GitHub：**`Forked from <sourceHandle>/<sourceSlug>`**（`sourceHandle` / `sourceSlug` 为 fork 当时的源；见 §3）。

**非目标**

- Fork **自己的** Soul（MVP 不提供；避免与编辑权混淆；后续可另做 Duplicate）。
- CLI `ocs fork`。
- 在本机自动生成 workspace（仍由用户自行 `apply`）。

---

## 2. 前置条件与权限

| 条件 | 行为 |
| --- | --- |
| 源 `visibility !== LISTED` | 访客不可见详情；**不提供** Fork。 |
| 未登录 | 不进入完成态 Fork 流；可展示「登录后 Fork」类引导（实现以现有登录入口为准）。 |
| 当前用户为 **作者** | **不展示** Fork 按钮。 |
| 其他 | 仅当浏览者为**已登录非作者**且源为 **LISTED** 时展示可用 Fork 流程。 |

---

## 3. 数据模型（概念）

在 `Pack` 上增加（命名以实现阶段 Prisma 为准）：

- **`forkedFromPackId`**：`String?`，外键指向源 `Pack.id`，`onDelete: SetNull`（源删除后新包仍存在）。
- **`forkedFromHandle`**、**`forkedFromSlug`**：`String?`，在 **fork 写入时一次性固化** 的快照，用于 Tip 与链接构造；Tip **优先使用快照**，避免源删后无法展示「fork 自谁」。

展示规则：

- 若快照存在：详情页（作者可见的 fork 包）显示 **`Forked from forkedFromHandle/forkedFromSlug`**；若源 Pack 仍存在且仍为可解析公开页，「`forkedFromHandle/forkedFromSlug`」链到源详情路由。
- 若源已删或不可访问：仍显示同上文案（纯文本或可点链接按 404/全站策略处理，与现有 notFound 一致即可）。

不要求在 UI 展示完整 fork 链（fork 的 fork）；仅展示**直接父**。

---

## 4. API 与流程

- **方法**：`POST` 至专用端点，例如 `/api/packs/[handle]/[slug]/fork`（最终以实现为准）。
- **鉴权**：与站点其他「登录用户写操作」一致（Session；**不**要求 Bearer CLI token 作为 MVP 主路径）。
- **Body**：`{ "slug": "<新 slug>" }`（或等价 form 字段），`slug` 须通过既有 `assertValidSlug` 与 **`@@unique([authorId, slug])`** 校验。
- **成功**：创建新 `Pack` 及关联行；**存储**层对头像、二进制、showcase 引用等按 **per-pack 独立复制**（新 key），保证后续编辑**不**影响源包。
- **冲突**：当前用户下 slug 已存在 → **409**，错误信息明确。
- **限流**：与 **publish** 同类或共享「发布类」限流，防止滥用。

成功后响应应携带新包定位信息（如 `handle` + `slug`），前端 **跳转** 至 `/<locale>/packs/<currentUserHandle>/<newSlug>`（与现有多语言路由一致）。

---

## 5. UI 要点

- **Fork 入口**：仅在 §2 允许时展示；点击后收集**新 slug**（Dialog 或等价），确认后请求 API。
- **Tip**：新包详情页（作者视角；若仅作者可见 UNLISTED，则仅作者看到）在显著位置展示一句：**`Forked from <handle>/<slug>`**（英文固定前缀 + 实际 handle/slug，与 GitHub 习惯一致）。`messages/en.json` / `zh.json` 可提供整句模板或前缀+插值，**避免**冗长说明。

---

## 6. 测试与验收

- Fork 后：新包 **UNLISTED**；非作者访问新详情 → **notFound**（与现有 UNLISTED 规则一致）；作者可见且 Tip 正确。
- 包内文件条数、关键路径与源一致；编辑新包**不**改源包。
- slug 冲突 → 409；未登录 / 作者本人 / 非 LISTED 源 → 不完成 Fork 或对应 4xx。
- 源删除后：新包仍在；Tip 仍显示 `Forked from` + 快照 handle/slug。

---

## 7. 实现计划

实现前另立 **`writing-plans`** 产出的实现计划文档；本 spec 不绑定具体文件路径与函数名。

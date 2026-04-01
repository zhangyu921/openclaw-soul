# Dashboard 总览与「我的 Pack」列表（设计稿）

**日期**：2026-04-01  
**状态**：修订稿（待实现；含作者入口与上架/下架）

**背景**：登录后个人区当前仅 `/dashboard/tokens`（API token、handle、登出）。作者通过 CLI `publish` 上架的 `Pack` 在数据库中已有 `authorId`，但站内无统一入口快速跳到本人 pack 详情。本设计增加 **`/dashboard` 总览**（紧凑列表 + 状态），与 **`/dashboard/tokens` 子页** 共用仪表盘壳；顶栏默认进入总览。

---

## 1. 目标与非目标

**目标**

- 登录用户在 **一页内** 看到自己上传（发布）的全部 Pack，**含已下架（revoked）**，并带 **状态标识**，便于与 CLI / 公开展示对照。
- **紧凑列表**（非首页画廊大图卡片），主信息密度适合「定位 slug / 标题」。
- **每一行均可进入该 Pack 的作者视图**（见下），**不依赖** 是否已设置公开 `handle`；有 handle 时再提供公开详情页链接。

**非目标**

- 不改动 CLI `publish` 的 zip 上传协议；**数据模型**仍为单表 `Pack` + `revokedAt` 软下架。
- 总览页本身不承担大段编辑表单；**摘要编辑、头像等** 仍在详情/作者页完成。

---

## 2. 路由与信息架构

| 路径 | 行为 |
|------|------|
| `/dashboard` | 个人总览：「我的 Pack」紧凑列表（默认页）。未登录 → `redirect` 到 `login?next=/dashboard`（与 tokens 页会话策略一致）。 |
| `/dashboard/tokens` | 现有 TokenPanel 能力不变（token、handle、登出）。未登录 → `login?next=/dashboard/tokens`。 |
| `/dashboard/packs/[slug]` | **作者专属 Pack 视图**（见第 4.2 节）：仅当前登录用户且为该 Pack 的 `authorId` 可访问；按 `slug` + session 解析，**无需 URL 中出现 handle**。未登录或非作者 → 404 或重定向登录（与站点惯例一致）。 |
| 顶栏（已登录） | 用户显示名/邮箱链接 **指向 `/dashboard`**（替代当前直达 `/dashboard/tokens`）。 |

**共享壳**：新增 `app/dashboard/layout.tsx`，在子页面顶部提供二级导航 **「总览」** 与 **「API tokens」**（文案可与实现微调），当前路由高亮。

**登录重定向**：新入口默认 `next=/dashboard`；保留对已有 `next=/dashboard/tokens` 的兼容。

---

## 3. 数据与查询

- **数据源**：`Pack`，`where: { authorId: sessionUserId }`，`orderBy: { createdAt: 'desc' }`。
- **字段**：至少 `slug`, `title`, `revokedAt`, `avatarRelPath`；作者 **handle** 来自 `User`（与 `authorId` 关联），用于拼公开 URL 与无 handle 提示。
- **范围**：**不过滤** `revokedAt`；全部展示，由 UI 标注状态（见下）。

---

## 4. UI 与交互

**列表形态**

- **紧凑列表**：每行建议包含：缩略图（小）、标题（可单行截断）、`handle/slug` 或仅 `slug`、**状态**（例如「公开中」/「已下架」）、主操作。
- 视觉与现有 `Card`/站点 tokens 对齐，避免新设计语言；具体用 `Table` 或 `div` 栅格由实现按现有组件库选择。

**状态**

- `revokedAt == null` → **公开中**（或等价文案）。
- `revokedAt != null` → **已下架**（与详情页作者可见逻辑一致）。

**链接规则**

- **主操作（始终）**：**进入作者视图** → `/dashboard/packs/<slug>`。不依赖 handle；无 handle 时这是唯一详情入口。
- **次要链接（可选）**：当用户 **已设置 `handle`** 时，可另起「公开页」链到 `/packs/<handle>/<slug>`（与画廊一致）；若 pack 已 revoked，行为与现详情页一致（仅作者可见）。
- **无 handle**：行内仍可提示「设置 handle 后会有公开画廊链接」，链到 `/dashboard/tokens`；**不**阻塞进入作者视图。

### 4.2 作者专属页 `/dashboard/packs/[slug]`

**目的**：复用（或抽取共享）现有 `/packs/[handle]/[slug]` 上的作者能力：预览、编辑摘要、头像、**下架** 等；使 **无公开 handle** 时也能在站内管理 Pack。

**解析**：`where: { slug, authorId: sessionUserId }`（利用 `@@unique([authorId, slug])`）。

**与公开页关系**：若存在 `handle`，页内展示公开 URL 文案 + 链到 `/packs/<handle>/<slug>`。

### 4.3 上架与下架（网站内）

**现状**：下架通过 `POST /api/packs/<handle>/<slug>/revoke`，路径依赖 **handle**；「再次公开」文案指向 CLI `publish --replace`。

**本设计补充**

1. **下架（网站）**：作者视图须能完成下架。实现二选一或组合：
   - **A**：新增 **`POST /api/me/packs/[slug]/revoke`**（或等价路径），服务端用 `session + slug` 查 `authorId` 后设置 `revokedAt`（与现 revoke 业务规则一致）；作者页与总览跳转 **不依赖 handle**。
   - **B**：保留原 API，仅在 **已有 handle** 时从作者页调用；无 handle 时必须走 **A**，否则下架只能在 CLI 侧间接完成（不满足「总览一手管理」）。

2. **上架 / 重新公开（网站）**：若产品要求 **不下 CLI 即可恢复画廊展示**，需新增 **仅作者** 的接口（例如 **`POST /api/me/packs/[slug]/unrevoke`**），将 `revokedAt` 置空；须与隐私说明、速率限制策略一致，并与 **`publish --replace`** 语义对齐（避免双路径冲突——实现时在代码注释与文案中写清：网站「重新上架」= 取消软下架；zip 内容更新仍靠 CLI）。

总览行内 **可选**：快捷「下架 / 重新上架」按钮（调用上述 API），减少跳转；**最小实现**可仅在作者页提供按钮，总览只链到作者页。

**空状态**

- 无任何 Pack：短说明 + 提示使用 `npx @openclaw-soul/cli publish`（语气可与首页空画廊一致）。

---

## 5. 错误处理与鉴权

- 所有 dashboard 路由：**服务端**用现有 `readSessionUserId()`；未登录统一重定向登录页并带 `next`。
- `/dashboard/packs/[slug]` 与 `/api/me/packs/...`：**仅**当 `pack.authorId === sessionUserId` 时成功；否则 404（避免泄露 slug 是否存在）。
- 新增 `me` 类 API：**不得**通过遍历 slug 枚举他人数据；仅允许 **当前用户自己的** `authorId + slug`。

---

## 6. 测试与验证（实现阶段）

- 手动：未登录访问 `/dashboard`、已登录无 pack、有 pack 无 handle（作者页可进、公开链提示）、有 handle 含 revoked、下架/重新上架（若实现 unrevoke）、顶栏与二级导航。
- 若仓库已有 dashboard 相关测试则扩展；否则不强制新增 E2E，以人工回归为主。

---

## 7. 实现备忘（非规范）

- `TokenPanel` 所在页从「孤页」变为 layout 子路由；确认 `h1`、padding 与 layout 标题不重复。
- `login` 表单与其它 `next` 传参处：按需把默认或示例改为 `/dashboard`（保持向后兼容）。
- 公开详情页 `/packs/[handle]/[slug]` 与作者页 `/dashboard/packs/[slug]`：优先 **抽取共享展示块** 避免漂移；或作者页 **server redirect** 到公开 URL（仅当 handle 存在且用户为作者），无 handle 时仅渲染作者模板。
- 实现顺序建议：作者页路由 + `me` revoke → 总览列表链到作者页 → 可选 unrevoke 与总览快捷操作。

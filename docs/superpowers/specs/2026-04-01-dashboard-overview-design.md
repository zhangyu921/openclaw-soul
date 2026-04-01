# Dashboard 总览与「我的 Pack」列表（设计稿）

**日期**：2026-04-01  
**状态**：修订稿（待实现；复用公开详情页，无作者独立路由）

**背景**：登录后个人区当前仅 `/dashboard/tokens`（API token、handle、登出）。作者通过 CLI `publish` 上架的 `Pack` 在数据库中已有 `authorId`，但站内无统一入口快速跳到本人 pack。本设计增加 **`/dashboard` 总览**（紧凑列表 + 状态），与 **`/dashboard/tokens` 子页** 共用仪表盘壳；顶栏默认进入总览。

**前提**：注册流程已要求 **Public handle**（见 `web` 注册页与 API）。本设计 **不** 为「未设置 handle」单独分支；总览用当前用户的 `User.handle` 拼链接。若历史数据存在 `handle` 为空，实现时可 fallback（如提示补全），不作主线。

---

## 1. 目标与非目标

**目标**

- 登录用户在 **一页内** 看到自己上传的全部 Pack，**含已下架（revoked）**，并带 **状态标识**。
- **紧凑列表**；每行进入 **既有公开详情** **`/packs/<handle>/<slug>`**（`handle` 为该用户当前 handle，与 `Pack` 作者一致）。
- **下架后的 Pack**：**仅作者** 打开详情可见；访客与未登录用户 **404**（与现 `web/src/app/packs/[handle]/[slug]/page.tsx` 中 `revokedAt && !isAuthor → notFound` 一致）。实现/回归时 **必须保持** 该语义。

**非目标**

- **不** 新增 `/dashboard/packs/[slug]` 等作者专属路由；详情 UI 与能力 **复用** `/packs/[handle]/[slug]`。
- 不改动 CLI `publish` zip 协议；数据模型仍为 `Pack` + `revokedAt` 软下架。

---

## 2. 路由与信息架构

| 路径 | 行为 |
|------|------|
| `/dashboard` | 个人总览：「我的 Pack」紧凑列表。未登录 → `redirect` 到 `login?next=/dashboard`。 |
| `/dashboard/tokens` | 现有 TokenPanel 不变。未登录 → `login?next=/dashboard/tokens`。 |
| `/packs/<handle>/<slug>` | **唯一** Pack 详情入口；总览每行链到此 URL。下架 Pack 仅作者可访问（见上）。 |
| 顶栏（已登录） | 用户链接 **指向 `/dashboard`**。 |

**共享壳**：`app/dashboard/layout.tsx`，二级导航 **「总览」** 与 **「API tokens」**。

**登录重定向**：新默认 `next=/dashboard`；保留 `next=/dashboard/tokens` 兼容。

---

## 3. 数据与查询

- `Pack`，`where: { authorId: sessionUserId }`，`orderBy: { createdAt: 'desc' }`，**含** `revokedAt`。
- 同时取当前用户 **`handle`**（`User.handle`），用于拼 **`/packs/<handle>/<slug>`**。

---

## 4. UI 与交互

**列表**：紧凑行：小图、标题、`handle/slug`、状态（公开中 / 已下架）、**进入详情** → `/packs/<handle>/<slug>`。

**下架与上架**

- **下架**：继续用现有 **`POST /api/packs/<handle>/<slug>/revoke`**（路径含 handle，与本前提一致）。
- **再次公开**：产品文案可继续指向 CLI `publish --replace`；若日后增加网站内 `unrevoke`，仍为 **仅作者** 接口，且不得破坏「访客看不到 revoked」的规则。

**空状态**：无 Pack → 提示 `npx @openclaw-soul/cli publish`。

---

## 5. 错误处理与鉴权

- Dashboard：**服务端** `readSessionUserId()`；未登录重定向登录。
- **详情页 revoked**：维持 **仅作者** 可见；任何改动总览或链接时 **回归** 该行为。

---

## 6. 测试与验证（实现阶段）

- 手动：总览链接到正确 `/packs/handle/slug`；**访客 / 非作者访问已下架 URL → 404**；作者仍可访问并看到下架状态与下架相关 UI。

---

## 7. 实现备忘（非规范）

- `TokenPanel` 纳入 `dashboard/layout` 时注意标题与 padding 不重复。
- **不** 为无 handle 用户实现单独详情路由；若需兼容旧账号，仅在总览或 tokens 提示补 handle。

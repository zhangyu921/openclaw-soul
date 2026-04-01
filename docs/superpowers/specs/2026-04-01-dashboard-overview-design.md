# Dashboard 总览与「我的 Pack」列表（设计稿）

**日期**：2026-04-01  
**状态**：已定稿（待实现）

**背景**：登录后个人区当前仅 `/dashboard/tokens`（API token、handle、登出）。作者通过 CLI `publish` 上架的 `Pack` 在数据库中已有 `authorId`，但站内无统一入口快速跳到本人 pack 详情。本设计增加 **`/dashboard` 总览**（紧凑列表 + 状态），与 **`/dashboard/tokens` 子页** 共用仪表盘壳；顶栏默认进入总览。

---

## 1. 目标与非目标

**目标**

- 登录用户在 **一页内** 看到自己上传（发布）的全部 Pack，**含已下架（revoked）**，并带 **状态标识**，便于与 CLI / 公开展示对照。
- **紧凑列表**（非首页画廊大图卡片），主信息密度适合「定位 slug / 标题」。
- 在已有 **公开 handle** 时，一行内可进入 **`/packs/<handle>/<slug>`** 详情。

**非目标**

- 不在此迭代改 publish API、不改 Pack 数据模型。
- 总览不承担「编辑 pack 元数据」的完整表单（详情页已有摘要编辑、下架等）；总览只做 **导航 + 状态展示**。

---

## 2. 路由与信息架构

| 路径 | 行为 |
|------|------|
| `/dashboard` | 个人总览：「我的 Pack」紧凑列表（默认页）。未登录 → `redirect` 到 `login?next=/dashboard`（与 tokens 页会话策略一致）。 |
| `/dashboard/tokens` | 现有 TokenPanel 能力不变（token、handle、登出）。未登录 → `login?next=/dashboard/tokens`。 |
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

- 当用户 **已设置 `handle`** 且该行 pack 可解析为公开路径时：主操作为 **进入详情** → `/packs/<handle>/<slug>`（作者可见 revoked pack，与现详情页一致）。
- 当 **未设置 `handle`**：不得链到无效公开 URL；行内说明 **需先在 API tokens 页设置 handle**，并链到 `/dashboard/tokens`。

**空状态**

- 无任何 Pack：短说明 + 提示使用 `npx @openclaw-soul/cli publish`（语气可与首页空画廊一致）。

---

## 5. 错误处理与鉴权

- 所有 dashboard 路由：**服务端**用现有 `readSessionUserId()`；未登录统一重定向登录页并带 `next`。
- 不新增「按用户枚举他人 Pack」的 API；查询仅绑定当前 session。

---

## 6. 测试与验证（实现阶段）

- 手动：未登录访问 `/dashboard`、已登录无 pack、有 pack 无 handle、有 handle 含 revoked、顶栏链接与二级导航切换。
- 若仓库已有 dashboard 相关测试则扩展；否则不强制新增 E2E，以人工回归为主。

---

## 7. 实现备忘（非规范）

- `TokenPanel` 所在页从「孤页」变为 layout 子路由；确认 `h1`、padding 与 layout 标题不重复。
- `login` 表单与其它 `next` 传参处：按需把默认或示例改为 `/dashboard`（保持向后兼容）。

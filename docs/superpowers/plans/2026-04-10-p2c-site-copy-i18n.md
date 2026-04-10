# P2-C 全站文案与多语言 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将 `web/src/app/[locale]` 及全站 header 等用户可见英文/中文硬编码 **全部迁入** `web/messages/en.json` 与 `web/messages/zh.json`，并按 [P2-C 设计 spec](../specs/2026-04-10-p2c-site-copy-i18n-design.md) **润色为面向用户的 Soul 语气**（用户可见处不说 pack）。

**Architecture:** 沿用既有 `next-intl`：`Server Component` 用 `getTranslations` + `setRequestLocale`；`"use client"` 用 `useTranslations`。文案真源为 **两个 JSON 文件**，按 **语义化 namespace** 分层（如 `nav`、`auth`、`dashboard`），避免整句当 key。不新增 i18n 基础设施。

**Tech Stack:** Next.js App Router、`next-intl` 3.x、`pnpm` workspace 包 `@openclaw-soul/web`。

---

## 涉及文件一览（实现前通读）

| 类别 | 路径 |
|------|------|
| 文案真源 | `web/messages/en.json`、`web/messages/zh.json` |
| 合并/校验（一般不改行为） | `web/src/lib/i18n-messages.ts` |
| 布局与全局 metadata | `web/src/app/[locale]/layout.tsx` |
| 全站顶栏 | `web/src/components/site-header.tsx` |
| 主题切换（aria） | `web/src/components/mode-toggle.tsx` |
| 语言切换按钮文案 | `web/src/components/locale-switcher.tsx`（可选：标签进 messages） |
| 首页 | `web/src/app/[locale]/page.tsx`（已有 `home`，按需润色） |
| Dashboard | `web/src/app/[locale]/dashboard/layout.tsx`、`dashboard/page.tsx`、`dashboard-nav.tsx`、`dashboard-footer.tsx`、`create-pack-dialog.tsx`、`copy-publish-command.tsx` |
| Tokens | `web/src/app/[locale]/dashboard/tokens/page.tsx`、`token-panel.tsx` |
| 登录注册 | `web/src/app/[locale]/login/page.tsx`、`login-form.tsx`、`register/page.tsx` |
| Privacy | `web/src/app/[locale]/privacy/page.tsx` |
| CLI device | `web/src/app/[locale]/cli/device/page.tsx`、`device-client.tsx` |
| Soul 详情簇 | `web/src/app/[locale]/packs/[handle]/[slug]/page.tsx`、`pack-chat.tsx`、`pack-chat-user-dialog.tsx`、`avatar-upload.tsx`、`pack-title-edit.tsx`、`pack-summary-edit.tsx`、`pack-showcase.tsx`、`pack-publish.tsx`、`pack-source-files.tsx`、`pack-revoke.tsx` |

---

## 约定（所有任务共用）

1. **Key 命名**：`namespace.sectionKey`，如 `nav.login`、`dashboard.createSoul.title`。
2. **中文 UI**：产品对象统一 **Soul**（拉丁字）；**不要**在用户可见句子里用 pack 指代上架内容。
3. **插值**：动态值用 `t('key', { name: value })`，JSON 里 `{name}`。
4. **每任务结束**：在仓库根执行验证（见文末 **验证命令**），通过后再 `git commit`。

---

### Task 1: 全局 layout metadata + `nav` / `common` 基底

**Files:**

- Modify: `web/messages/en.json`、`web/messages/zh.json`
- Modify: `web/src/app/[locale]/layout.tsx`
- Modify: `web/src/components/site-header.tsx`
- Modify: `web/src/components/mode-toggle.tsx`

- [ ] **Step 1: 在 JSON 中增加 `nav` 与 `common`（或扩展现有 `common`）**

在 `en.json` 增加（示例；具体措辞以 user-facing 为准）：

```json
{
  "common": {
    "siteName": "OpenClaw Soul"
  },
  "nav": {
    "login": "Log in",
    "register": "Sign up",
    "dashboard": "Dashboard",
    "themeLight": "Switch to light mode",
    "themeDark": "Switch to dark mode",
    "themePending": "Theme"
  }
}
```

`zh.json` 给对等翻译（站点名可保留英文 product 名；按钮用自然中文）。

- [ ] **Step 2: `[locale]/layout.tsx` 使用 locale 化 metadata**

在 `generateMetadata` 内使用 `getTranslations({ locale, namespace: 'common' })` 或单独 `metadata` namespace，使 `title` / `description` **不再**写死 `"OpenClaw workspace pack registry"`，改为描述 Soul 注册/发现（**不出现 pack** 作为产品词）。需 `const { locale } = await params` 与 `setRequestLocale(locale)` 模式与 `page.tsx` 一致。

参考现有首页写法：

```2:4:web/src/app/[locale]/page.tsx
import { getTranslations, setRequestLocale } from "next-intl/server";
// ...
```

- [ ] **Step 3: `SiteHeader` 客户端接入 `useTranslations('nav')`**

将 `Login` / `Register` 替换为 `t('login')` / `t('register')`；品牌链文字可使用 `useTranslations('common')` 的 `siteName` 与 JSON 对齐。

- [ ] **Step 4: `ModeToggle` 接入 `useTranslations('nav')`**

替换三处 `aria-label` 字符串为 `t('themeLight')` 等。

- [ ] **Step 5: 验证并提交**

运行 **验证命令**；`git add` 上述文件；`git commit -m "feat(web): i18n layout metadata and nav strings"`。

---

### Task 2: Dashboard 壳层 — `dashboard-nav`、`dashboard-footer`、`dashboard/layout`

**Files:**

- Modify: `web/messages/en.json`、`web/messages/zh.json`
- Modify: `web/src/app/[locale]/dashboard/dashboard-nav.tsx`
- Modify: `web/src/app/[locale]/dashboard/dashboard-footer.tsx`
- Modify: `web/src/app/[locale]/dashboard/layout.tsx`（若有硬编码 title/metadata）

- [ ] **Step 1: 增加 `dashboard` namespace**

至少包含：侧栏/子导航「我的 Soul」或「Your Souls」（**禁止**「我的 pack」）、API tokens 链接文案、`aria-label` for Dashboard nav。

将 `dashboard-nav.tsx` 中写死的 `items` 改为从 `t.raw()` 或分别 `t('navMySouls')` 等读取。

- [ ] **Step 2: footer 中链文与版权句进 messages**

- [ ] **Step 3: 验证并提交**

`git commit -m "feat(web): i18n dashboard shell nav and footer"`。

---

### Task 3: Dashboard 主页与创建 Soul 对话框

**Files:**

- Modify: `web/messages/en.json`、`web/messages/zh.json`
- Modify: `web/src/app/[locale]/dashboard/page.tsx`
- Modify: `web/src/app/[locale]/dashboard/create-pack-dialog.tsx`
- Modify: `web/src/app/[locale]/dashboard/copy-publish-command.tsx`

- [ ] **Step 1: 列出本页所有用户可见串**（空态、卡片标题、按钮、`Badge`、CLI 说明）

`create-pack-dialog.tsx` 中与「从零构建」相关的标题/说明改为 Soul 语气；**文件名可仍为 create-pack-dialog**（仅代码路径）。

- [ ] **Step 2: Server 部分用 `getTranslations`；客户端子组件用 `useTranslations`**

若 `dashboard/page.tsx` 为 Server Component，优先在父级取 `t` 并传下去，或拆出 client 子组件集中 `useTranslations('dashboard')`。

- [ ] **Step 3: 验证并提交**

`git commit -m "feat(web): i18n dashboard home and create soul dialog"`。

---

### Task 4: API Tokens 页面

**Files:**

- Modify: `web/messages/en.json`、`web/messages/zh.json`
- Modify: `web/src/app/[locale]/dashboard/tokens/page.tsx`
- Modify: `web/src/app/[locale]/dashboard/tokens/token-panel.tsx`

- [ ] **Step 1: 增加 `tokens` namespace**（标题、说明、创建/撤销、空态、错误 toast 文案若在本文件展示）

- [ ] **Step 2: 接入 `t()` 并提交**

`git commit -m "feat(web): i18n API tokens page"`。

---

### Task 5: 登录、注册与 Suspense fallback

**Files:**

- Modify: `web/messages/en.json`、`web/messages/zh.json`
- Modify: `web/src/app/[locale]/login/page.tsx`
- Modify: `web/src/app/[locale]/login/login-form.tsx`
- Modify: `web/src/app/[locale]/register/page.tsx`

- [ ] **Step 1: 增加 `auth` namespace**（表单标签、错误提示、按钮、`Loading…`）

`login/page.tsx` 中 `Loading…` 改为 `t('loading')` 需在能访问 `next-intl` 的上下文中：可用小型 client `LoginPageShell` 包一层 Suspense fallback，或 `next-intl` 文档允许的 `NextIntlClientProvider` 子树（遵循现有 `layout` 已包裹 provider 的事实：`login/page` 为 server 时 fallback 可考虑 `useTranslations` 的 client 小组件）。

- [ ] **Step 2: 验证并提交**

`git commit -m "feat(web): i18n login and register"`。

---

### Task 6: Privacy 页（语气：安抚优先）

**Files:**

- Modify: `web/messages/en.json`、`web/messages/zh.json`
- Modify: `web/src/app/[locale]/privacy/page.tsx`

- [ ] **Step 1: 将正文拆为多条 key 或使用单 key 大块**

长文可分段 `privacy.section1`… 便于中英分别润色；**首段**满足 spec：先价值与说明，再细节。

- [ ] **Step 2: `generateMetadata` 使用翻译后的 title/description**

- [ ] **Step 3: 验证并提交**

`git commit -m "feat(web): i18n privacy page copy"`。

---

### Task 7: CLI device 授权页

**Files:**

- Modify: `web/messages/en.json`、`web/messages/zh.json`
- Modify: `web/src/app/[locale]/cli/device/page.tsx`
- Modify: `web/src/app/[locale]/cli/device/device-client.tsx`

- [ ] **Step 1: 增加 `cliDevice` namespace**，覆盖状态机各步文案与按钮。

- [ ] **Step 2: 验证并提交**

`git commit -m "feat(web): i18n CLI device flow"`。

---

### Task 8: Soul 详情 — 页面壳与编辑/发布/撤销

**Files:**

- Modify: `web/messages/en.json`、`web/messages/zh.json`
- Modify: `web/src/app/[locale]/packs/[handle]/[slug]/page.tsx`
- Modify: `web/src/app/[locale]/packs/[handle]/[slug]/pack-title-edit.tsx`
- Modify: `web/src/app/[locale]/packs/[handle]/[slug]/pack-summary-edit.tsx`
- Modify: `web/src/app/[locale]/packs/[handle]/[slug]/avatar-upload.tsx`
- Modify: `web/src/app/[locale]/packs/[handle]/[slug]/pack-showcase.tsx`
- Modify: `web/src/app/[locale]/packs/[handle]/[slug]/pack-publish.tsx`
- Modify: `web/src/app/[locale]/packs/[handle]/[slug]/pack-revoke.tsx`

- [ ] **Step 1: 使用 `packDetail` / `packEdit` namespace**（二选一或合并，保持 JSON 清晰）

所有按钮、标签、空态、上架/下架说明中的用户可见 **pack** 改为 **Soul**。

- [ ] **Step 2: `page.tsx` 的 `generateMetadata` 与可见标题** 走 `getTranslations`。

- [ ] **Step 3: 验证并提交**（文件多时可拆两次 commit：`page`+核心组件 与 showcase 分离）。

`git commit -m "feat(web): i18n pack detail shell and edit components"`。

---

### Task 9: Soul 详情 — 包内文件与 chat

**Files:**

- Modify: `web/messages/en.json`、`web/messages/zh.json`
- Modify: `web/src/app/[locale]/packs/[handle]/[slug]/pack-source-files.tsx`
- Modify: `web/src/app/[locale]/packs/[handle]/[slug]/pack-chat.tsx`（已部分 i18n）
- Modify: `web/src/app/[locale]/packs/[handle]/[slug]/pack-chat-user-dialog.tsx`

- [ ] **Step 1: 更新 `packChat` 与相关 key**

将仍含「pack」的 **用户可见** 句改为 Soul（例如 `zh` 里「当前 pack 的上下文」→「当前 Soul 的上下文」）；保留技术日志/开发者注释中的 pack 若存在。

- [ ] **Step 2: `pack-source-files` 全部进 messages**（含二进制提示、保存状态）

- [ ] **Step 3: 验证并提交**

`git commit -m "feat(web): i18n soul detail source files and chat copy"`。

---

### Task 10: 首页与全局润色 + 自检

**Files:**

- Modify: `web/messages/en.json`、`web/messages/zh.json`
- Modify: `web/src/app/[locale]/page.tsx`（仅当需改 key 引用或补 metadata）

- [ ] **Step 1: 通读 `home` namespace**，按 spec 微调语气与 Soul 用词一致。

- [ ] **Step 2: 自检 grep**

在 `web/src` 下对用户可见文案做检查（路径名除外）：

```bash
cd web && rg -n '"[^"]*pack[^"]*"' src/app/\[locale\] src/components/site-header.tsx src/components/mode-toggle.tsx 2>/dev/null | head -50
```

人工排除：URL 路径、`packChat` namespace 名、文件名、import 路径。若发现用户可见句仍含 pack，改掉。

- [ ] **Step 3: 全量验证并提交**

`git commit -m "feat(web): polish home copy and P2-C string audit"`（若无代码改动可跳过或改为 docs-only）。

---

## 验证命令（每任务或至少 Task 10 必跑）

在仓库根：

```bash
pnpm --filter @openclaw-soul/web lint
pnpm --filter @openclaw-soul/web build
```

可选：

```bash
pnpm --filter @openclaw-soul/web test
```

**期望：** `lint` 无 error；`build` 成功。若 JSON 语法错误，`build` 或 `i18n-messages` 会失败。

---

## Plan self-review（对照 spec）

| Spec 要求 | 对应任务 |
|-----------|----------|
| 提取硬编码 → messages | Task 1–10 |
| 面向用户、Soul、禁 pack（UI） | 全文约定 + Task 8–10 grep |
| Privacy 语气 A | Task 6 |
| 不改 API/UGC/i18n 框架 | 本 plan 仅列 `[locale]` 与 header 等；未含 `app/api` |
| 一轮收完 + 走查 | Task 10 |

无 TBD；若某文件无硬编码则跳过该文件并在 commit 说明中注「no changes」。

---

## Execution handoff

**Plan 已保存至 `docs/superpowers/plans/2026-04-10-p2c-site-copy-i18n.md`。可选执行方式：**

1. **Subagent-Driven（推荐）** — 每 Task 新开子代理，任务间人工 review，迭代快。  
2. **Inline Execution** — 本会话内按 Task 顺序执行，大块之间设 checkpoint。

**你希望用哪一种？**（若自行实现，可直接按表中 Task 顺序做。）

# HARNESS TASK P2-H-1

## A. 输入任务

- **任务标题**：创建 pack 后自动跳转详情页
- **来源**：`docs/ROADMAP.md` P2-H / inbox
- **目标（用户价值）**：Dashboard「从零构建」创建成功后立即进入新 pack 详情页，无需手动找链接。
- **范围（允许改动）**：验收与文档；若发现跳转缺失再改 `web/`。
- **非目标（本轮不做）**：改创建 API 契约、改 slug 规则。
- **验收条件（可验证）**：成功 `POST /api/packs/create` 后客户端导航到 `viewPath`（`/packs/<handle>/<slug>`，经 i18n `router`）。
- **风险点**：无；仅确认现有行为。

## B. 执行拆解

1. 阅读 `POST /api/packs/create` 与 `createEmptyPackForUserId` 返回的 `viewPath`。
2. 阅读 `DashboardCreatePackEntry` 成功分支是否 `router.push(viewPath)`。
3. 记录结论：已满足则 ROADMAP 标 ✅；否则补实现并跑 `pnpm test` + `pnpm --filter @openclaw-soul/web build`。

## C. 实施记录

- **实际改动文件**：无代码变更（行为已在 P1-D 落地）。
- **关键实现说明**：
  - `web/src/lib/pack-create-web.ts`：`viewPath` 为 `` `/packs/${encH}/${encS}` ``。
  - `web/src/app/[locale]/dashboard/create-pack-dialog.tsx`：成功且 `data.viewPath` 非空时 `router.push(data.viewPath)`（`useRouter` 来自 `@/i18n/navigation`，带 locale 前缀）。
- **与硬约束对齐说明**：未触碰 CLI 用户目录破坏性操作。

## D. 验收证据

- **代码审阅**：上述路径与调用链一致即可视为通过。
- **测试**：`pnpm test`（root）— 通过（cli + web vitest）。

## F. Done 判定

- [x] 跳转逻辑在代码库中存在且与 API 一致
- [x] ROADMAP / checkpoint 已更新

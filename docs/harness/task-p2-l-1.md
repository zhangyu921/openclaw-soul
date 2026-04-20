# HARNESS TASK — P2-L-1

## A. 输入任务（Task Intake）

- **任务标题**：「我的 Souls」中移除条目（列表不展示；DB 标记）
- **来源**：`docs/IDEAS-INBOX.md`（已 `*` 归入）
- **目标（用户价值）**：用户可隐藏不再关心的 Soul，列表更干净；释放 slug 供同名新建
- **范围（允许改动）**：`Pack` 模型、dashboard 列表、画廊/API 列表、移除 API、详情可见性
- **非目标（本轮不做）**：硬删；从内部 slug 一键恢复上架与还原公开 slug 的完整产品流
- **验收条件（可验证）**：移除后 dashboard 列表不出现；画廊不出现；`authorId+slug` 可再建新 pack；非作者不能访问该归档条目（作者可凭内部 `hid-<id>` slug 继续编辑/下载）
- **风险点**：旧书签 URL（原 slug）失效；已移除条目禁止再走 publish 上架画廊（避免内部 slug 上架）

## B. 执行拆解（Execution Plan）

1. **Schema**：`authorDashboardHiddenAt`、`slugBeforeDashboardHide`；迁移
2. **移除 API**：`POST .../remove-from-dashboard` — 校验作者、`UNLISTED`、改写 `slug` 为 `hid-<packId>`、写入时间戳与备份 slug
3. **读路径**：dashboard / 首页画廊 / `GET /api/packs` 增加 `authorDashboardHiddenAt: null`；`canViewPack` 与详情页对「隐藏且非作者」拒绝
4. **UI**：dashboard 行内确认对话框 + i18n；`publish` 对隐藏 pack 返回 400
5. **验证**：`pnpm test`、`web` typecheck、lint

## C. 实施记录（Implementation Log）

- **实际改动文件**：`web/prisma/schema.prisma`、迁移、`pack-dashboard-hide.ts`、`remove-from-dashboard` API、`remove-from-dashboard-button.tsx`、`dashboard/page.tsx`、`page.tsx`（首页）、`api/packs/route.ts`、`pack-detail/page.tsx`、`pack-access.ts`、`chat`/`source-file`/`avatar`/`route`（pack GET）、`publish/route.ts`、`messages/en.json`、`messages/zh.json`
- **关键实现说明**：用 `hid-<cuid>` 满足 slug 正则且全局唯一，从而在不删行的前提下释放用户可见 slug；移除时强制下架，避免画廊出现内部链接
- **与硬约束对齐说明**：仅更新库表字段与存储引用路径中的 slug 段随路由变；无 `rm -rf`；文案未暗示脱敏

## D. 验收证据（Verification Evidence）

- **测试命令与结论**：
  - `pnpm test`：通过
  - `pnpm --filter @openclaw-soul/web typecheck`：通过
  - `pnpm --filter @openclaw-soul/web lint`：通过
- **结果摘要**：通过

## F. Done 判定（Definition of Done）

- [x] 目标与验收条件达成
- [x] 必要测试通过
- [x] 硬约束未触碰
- [x] 验证证据完整
- [x] 剩余风险已说明（恢复公开 slug / 上架需后续产品决策）

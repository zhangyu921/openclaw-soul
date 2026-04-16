# HARNESS TASK — P2-K-1

## A. 输入任务（Task Intake）

- **任务标题**：Pack zip 懒惰生成（编辑不落 blob；按需再生成）
- **来源**：`docs/IDEAS-INBOX.md`（已标 `*` 归入）
- **目标（用户价值）**：减少每次保存 md/包内文件时向 blob 写入 zip 的次数，降低无效存储与成本
- **范围（允许改动）**：`syncPackDerivedAfterSourceChange` 及依赖；`/api/.../download`；CLI `apply` 若经服务端取 zip；`Pack.zipRelPath` 语义（可空 / dirty 位）
- **非目标（本轮不做）**：改 CLI 本地打包逻辑以外的协议；画廊检索
- **验收条件（可验证）**：
  - 作者编辑并保存源文件后，**不**必然产生新 blob zip 对象（或明确仅更新路径列表等轻量元数据）
  - 用户点击下载 zip 或 `apply` 需要 zip 时，能拿到与当前库表一致的 zip；必要时此时才 `writeZipForPack`
- **风险点**：`zipRelPath` 为空时旧链接 404；需清晰失效策略与错误提示

## B. 执行拆解（Execution Plan）

1. **现状**：`web/src/lib/pack-source-sync.ts` 在源变更后调用 `buildAndStoreZipFromPackDb`，每次保存都打 zip 并 `writeZipForPack`。
2. **方向 A**：同步路径只 `extractPackFilePathsFromDb` + unlist 规则；**不写 zip**；将 `zipRelPath` 置 `null` 或保留旧 URL 直至下次按需生成（需定义「脏」标记）。
3. **方向 B**：`GET /api/packs/.../download`（及 apply 所用端点）在响应前若缺 zip 或 dirty，则 `buildAndStoreZipFromPackDb` 再返回。
4. **验证**：`pnpm test`、关键 API 手测或 route 测试；确认 blob 写入次数下降。

## C. 实施记录（Implementation Log）

- **实际改动文件**：
  - `web/prisma/schema.prisma` — `zipRelPath` 可选
  - `web/prisma/migrations/20260416180000_pack_zip_rel_path_optional/migration.sql`
  - `web/src/lib/pack-source-sync.ts` — 源变更时删旧 blob、`zipRelPath: null`，不再 `buildAndStoreZipFromPackDb`
  - `web/src/app/api/packs/[handle]/[slug]/download/route.ts` — `zipRelPath` 为空或读失败时按需 `buildAndStoreZipFromPackDb`
- **关键实现说明**：缓存失效后首次下载/apply 会组包并写回 `zipRelPath`（沿用现有 `buildAndStoreZipFromPackDb`）。
- **与硬约束对齐**：不对用户目录做破坏性操作；CLI 仍走同一 download URL。

## D. 验收证据（Verification Evidence）

- `pnpm test`：通过
- `pnpm --filter @openclaw-soul/web typecheck`：通过（`prisma generate` 后 `tsc`）
- `pnpm --filter @openclaw-soul/web lint`：通过
- **结果摘要**：通过

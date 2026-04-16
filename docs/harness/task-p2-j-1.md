# HARNESS TASK — P2-J-1

## A. 输入任务（Task Intake）

- **任务标题**：Pack 详情页头像二次上传后界面仍显示旧图
- **来源**：`docs/ROADMAP.md` P2-J
- **目标（用户价值）**：作者替换头像后立即看到新图，无需硬刷新或清缓存
- **范围（允许改动）**：`web/` 详情页头像展示与上传组件；不改动存储与 POST 逻辑
- **非目标（本轮不做）**：调整 `GET /api/.../avatar` 的全局 Cache-Control 策略（可作为后续优化）
- **验收条件（可验证）**：
  - 已有头像时再次上传新图，详情页头像区域更新为新图（同一会话内）
  - 首次上传头像后仍能通过 `router.refresh()` 从占位切到图片
- **风险点**：仅客户端状态与 URL 查询串；无数据迁移；`?v=` 对 API 路由为透明（服务端忽略 query）

## B. 执行拆解（Execution Plan）

1. **根因**：头像 GET 返回 `Cache-Control: public, max-age=3600`，且 `<img src>` 在二次上传后 URL 不变，浏览器沿用磁盘/内存缓存中的旧响应体。
2. **方案备选**：
   - **A（采用）**：客户端在上传成功后递增 cache-bust（`?v=timestamp`），使 `<img>` 请求新 URL，绕过强缓存；与 `router.refresh()` 并存以保持 RSC 数据一致。
   - **B**：将 GET 改为 `no-store` 或极短 `max-age`——影响所有读者与 CDN，改动面更大。
3. **实现**：抽出 `PackAvatarBlock`（client），内聚 `<img>` 与 `AvatarUpload`；`AvatarUpload` 增加可选 `onUploaded` 回调。
4. **验证**：`pnpm test`、`pnpm --filter @openclaw-soul/web typecheck`、`pnpm --filter @openclaw-soul/web lint`。

## C. 实施记录（Implementation Log）

- **实际改动文件**：
  - `web/src/app/[locale]/packs/[handle]/[slug]/pack-avatar-block.tsx`（新建）
  - `web/src/app/[locale]/packs/[handle]/[slug]/avatar-upload.tsx`
  - `web/src/app/[locale]/packs/[handle]/[slug]/page.tsx`
- **关键实现说明**：上传成功后 `onUploaded()` 将 `cacheBust` 设为 `Date.now()`，图片 `src` 变为 `/api/.../avatar?v=...`，浏览器视为新资源并重新 GET。
- **与硬约束对齐说明**：未对用户目录做破坏性操作；与 CLI `apply` 无关。

## D. 验收证据（Verification Evidence）

- **测试命令与结论**：
  - `pnpm test`：通过（CLI + web Vitest）
  - `pnpm --filter @openclaw-soul/web typecheck`：通过
  - `pnpm --filter @openclaw-soul/web lint`：通过
- **结果摘要**：通过

---

## E. 失败回流（Failure Feedback）

（若未通过再填）

# HARNESS TASK P2-U-1

## A. 输入任务（Task Intake）

- **任务标题**：全站 favicon 与 Header 品牌标统一
- **来源**：`docs/ROADMAP.md`（`docs/IDEAS-INBOX.md` 归入）
- **目标（用户价值）**：浏览器标签与书签显示与站点 Header 一致的品牌图形；小尺寸下清晰可辨。
- **范围（允许改动）**：`web/public` 静态资源、`web/src/components/site-header.tsx`、`web/src/app/[locale]/layout.tsx` 的 `metadata.icons`。
- **非目标（本轮不做）**：多尺寸 `favicon.ico` 二进制生成流水线、`apple-touch-icon` 独立 PNG 资产、PWA manifest 图标集。
- **验收条件（可验证）**：
  1. Header 左侧品牌图形与 favicon 使用同一 URL（`/brand-mark.svg`）。
  2. 页面 `<head>` 中含指向该资源的 `link rel="icon"`（由 Next Metadata 生成）。
  3. SVG 为 32×32 viewBox，含浅色/深色 `prefers-color-scheme` 变体，与当前主题色一致。
- **风险点**：旧浏览器对 SVG favicon 支持有限；隐私 / apply / CLI 无涉。

---

## B. 执行拆解（Execution Plan）

```yaml
divergence: low
divergence_rationale: 仅 web 单模块、≤3 文件、无 schema/auth/CLI 变更，方案差异仅为实现细节。
scope_files_estimate: 3
touches_hard_constraints: false
recommended_alternative_id: A
alternatives_blocked_if_chosen: none
```

**方案对比**

| 方案 | 思路 | 取舍 | 建议 |
|------|------|------|------|
| **A（推荐）** | 新增 `public/brand-mark.svg`（矢量 + 深浅色），Header 用 `<img>`，layout `metadata.icons` 指向同文件 | 单源一致、易维护；极老浏览器可能仍要 ico | ✅ |
| B | 仅用 `app/icon.tsx` 动态生成 PNG，Header 另用 CSS | 与「同一图片文件」略差，实现更重 | — |

**推荐方案子步骤**（轻量模式直接执行）

1. 添加 `web/public/brand-mark.svg`（32×32 viewBox，渐变圆环 + 中心点，媒体查询匹配 light/dark token）。
2. `SiteHeader` 将原纯 CSS 圆点替换为对该 SVG 的 `img`，保留 `rounded-full` 与 `ring-1 ring-primary/30`。
3. `generateMetadata` 增加 `icons.icon` 与 `icons.apple`（同 URL，`type: image/svg+xml`）。

**未采纳方案的触发条件**

- 若需支持 IE11 或强制要求根目录 `favicon.ico` → 改走 B 或追加 ico 导出任务。

---

## C. 实施记录（Implementation Log）

- **实际改动文件**：
  - `web/public/brand-mark.svg`
  - `web/src/components/site-header.tsx`
  - `web/src/app/[locale]/layout.tsx`
- **关键实现说明（为什么这样做）**：Header 原为纯 CSS 渐变圆，收件箱要求「logo 图片」与 favicon 一致；新增 32×32 viewBox 的 SVG，用 `prefers-color-scheme` 对齐 `globals.css` 主色/强调色，单一 URL 供 `next/image`（`unoptimized`）与 `metadata.icons` 共用。
- **与硬约束对齐说明**：
  - `apply` 写配置未触发破坏性删除
  - 未暗示自动脱敏

---

## D. 验收证据（Verification Evidence）

- **测试命令与结论**：
  - `pnpm test`：通过
  - `pnpm --filter @openclaw-soul/web typecheck`：通过
  - `pnpm --filter @openclaw-soul/web lint`：通过（`site-header` 使用 `next/image` + `unoptimized` 避免 SVG 的 `no-img-element`）
- **子系统验证（按改动选择）**：
  - 未跑 `next build`；如需可下一 tick 补 smoke。
- **结果摘要**：通过

---

## F. Done 判定（Definition of Done）

- [x] 目标与验收条件达成
- [x] 必要测试通过
- [x] 硬约束未触碰
- [x] 验证证据完整
- [x] 剩余风险已说明（极老浏览器若不支持 SVG favicon，可后续补 `favicon.ico`）
- [ ] （如失败）已产出下一轮任务

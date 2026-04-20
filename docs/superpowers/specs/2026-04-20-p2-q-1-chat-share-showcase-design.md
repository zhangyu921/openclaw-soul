# P2-Q-1：Pack Chat 分享到「对话截图」— 设计说明

**日期**：2026-04-20  
**状态**：已批准；implementation plan 见 [`../plans/2026-04-20-p2-q-1-chat-share-showcase.md`](../plans/2026-04-20-p2-q-1-chat-share-showcase.md)  
**范围**：`web/` 详情页 Pack Chat + Showcase 对话截图画廊

---

## 1. 目标与成功标准

- **用户价值**：作者能把当前 Pack Chat 线程以**视觉块**形式放进详情页 **「对话截图」** 横滑区，读者一眼看到对话形态，无需在正文里堆 Markdown。
- **成功标准**：
  - 作者在 Chat 区通过 **「分享」** 入口，可选 **下载 Markdown**（保留现有能力）或 **生成对话图 → 预览 → 确认后** 上传到「对话截图」；
  - 上传走**现有** `POST /api/packs/.../showcase-image`，**不**新增「文字块」类 DB 结构；
  - 生成与压缩在**浏览器**完成，服务端**不**做图片合成；仅接收与现有人工上传截图相同的 multipart；
  - 满张数 / 超体积 / 未登录 / 非作者时，有明确错误提示。

---

## 2. 背景与约束

- **画廊现状**：`Pack.showcaseImageRefs` 为图片引用列表；`MAX_SHOWCASE_IMAGES = 10`，单张 `MAX_SHOWCASE_IMAGE_BYTES = 2 MiB`；客户端已有 `compressShowcaseForUpload` 等压缩路径。
- **已否定的方向**：仅把对话写进 `showcaseMd` 再在正文里「假装截图」— 与产品期望的「出现在对话截图栏」不一致；**扩展 JSON 存纯文字 transcript** — 可不必做，因已选择 **C（真图上传）**。
- **隐私**：与现有人工截图一致；**不**声称自动脱敏。

---

## 3. 交互设计（已确认：预览后再上传 = **A**）

### 3.1 主入口

- 将当前 **「下载为 Markdown」** 独立按钮，收敛为 **「分享」** 主按钮（图标可用 `Share2` 等，与产品一致即可）。
- 点击 **分享** → 打开 **菜单**（dropdown / popover / sheet，按现有 UI 组件选型），至少包含：
  1. **下载对话（Markdown）** — 行为与现有一致（`messagesToMarkdown` 等）。
  2. **生成对话图并添加到对话截图…** — 进入 **预览流程**（见下）。

### 3.2 预览流程（A）

1. 用户选「生成对话图…」→ 客户端根据当前消息列表 **渲染为一张位图**（实现细节见 §4）。
2. 展示 **预览对话框**：缩略图 / 可滚动预览 + 文案说明（将占用一张对话截图名额、约 2 MiB 限制等）。
3. 用户 **确认** → 将生成的 `File` 经必要时压缩后，`POST` 到 `showcase-image`（与 `PackShowcase` 里添加图片相同）。
4. 用户 **取消** → 不上传，不产生副作用。
5. 上传成功后：**刷新页面或刷新 Showcase 区**（`router.refresh()` 或与现有编辑保存一致），使新图出现在「对话截图」栏。

### 3.3 权限与可见性

- **上传到对话截图**：仅 **登录且为 pack 作者**（与现有 `showcase-image` POST 一致）。
- **下载 Markdown**：可与现有一致（有消息即可；是否要求登录按当前 `ConversationDownload` 行为，不强行改变）。

---

## 4. 技术方案要点

### 4.1 客户端制图

- **输入**：当前线程 `UIMessage[]`（与下载一致；建议 **排除** assistant 错误气泡，避免把堆栈截进图）。
- **输出**：`Blob` / `File`（`image/webp` 或 `image/jpeg`），尺寸与长宽比需写入服务端已有的 width/height 探测逻辑（与现上传一致）。
- **实现选项**（在 implementation plan 中择一，本设计不锁死）：
  - **DOM 离屏渲染 + 截屏**（如 `html-to-image` / `dom-to-image` 等，需评估包体与跨浏览器）；或
  - **Canvas 自绘**气泡与文字（无额外依赖，长对话需处理换行与最大高度）。
- **体积**：生成后若超过 `MAX_SHOWCASE_IMAGE_BYTES`，复用 **`compressShowcaseForUpload`** 或与本项目 `compress-showcase-client` 中 **≤2 MiB** 编码逻辑一致，直到满足或给出可读错误。

### 4.2 长对话

- 若单张图过高：策略需在实现阶段定一条（**分页多张** 超出 MVP 则 **单张内截断 + 文案提示** 或 **限制最大导出高度**），本设计要求：**不得**静默丢失内容而不提示。

### 4.3 API 与数据

- **不**新增 `appendShowcaseMd` 专用字段；**不**改 Prisma 模型。
- 仅复用：`POST /api/packs/[handle]/[slug]/showcase-image`（及现有张数、类型校验）。

---

## 5. 错误处理（摘要）

| 场景 | 行为 |
|------|------|
| 已达 `MAX_SHOWCASE_IMAGES` | 提示用户先在 Showcase 编辑中删除或替换一张 |
| 压缩后仍超上限 | 提示缩短对话或后续版本支持分页（若 MVP 仅单张） |
| 未登录 / 非作者点上传 | 401/403 与现有一致，前端展示可读文案 |
| 生成失败（Canvas/字体） | 提示重试或改用「下载 Markdown」 |

---

## 6. 非目标（本轮）

- 服务端生成图片、OCR、自动脱敏；
- 分享到站外社交网络（仅站内上传 + 本地下载）；
- 与「展示正文」`showcaseMd` 联动合并。

---

## 7. 验收与测试

- 手动：作者路径 — 分享 → 预览 → 确认 → 画廊出现新图；访客/未上架可见性符合现有规则。
- CI：`pnpm test`、`pnpm --filter @openclaw-soul/web typecheck`、`pnpm --filter @openclaw-soul/web lint`。

---

## 8. 自审（spec checklist）

- 无 TBD：关键未定项仅为 **制图实现选型** 与 **长对话截断策略**，在 implementation plan 中收敛。
- 与「对话截图」产品表述一致：展示在画廊，占名额，真图文件。
- 与「预览后再上传」一致。

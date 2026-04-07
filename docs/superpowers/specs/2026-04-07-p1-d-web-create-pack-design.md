# P1-D：Web 从零创建 pack（设计稿）

**日期**：2026-04-07  
**状态**：已定稿（待实现）  
**范围**：`web/`（dashboard、pack 创建 API、详情「包内文件」、上架/下载与同步行为）；CLI 既有 `publish` 流程**不**改为本 spec 的主路径，但须与「空包」「列表态」规则兼容。

**路线图**：[`docs/ROADMAP.md`](../../ROADMAP.md) **P1-D**。

---

## 1. 背景与目标

**背景**：作者当前主要依赖本机 CLI 上传 zip 创建 pack；希望在不离开浏览器的前提下，从 dashboard **新建 slug** 进入详情页，在「包内文件」中**新增 Markdown 并在线编辑**，与既有库表真源、`syncPackDerivedAfterSourceChange` 链路一致。

**目标**

- Dashboard：在「在本机 workspace 发布」**之前**增加入口 **「从零构建你的 SOUL」**；点击后 **Dialog** 输入 **slug**，确认后 **跳转** 至 `/packs/<handle>/<slug>`。
- **创建**：服务端创建 **无源文件**的 pack（`UNLISTED`）；`title` **默认等于 slug**（详情页可再改 Display title）。
- **包内文件**：作者侧 **始终** 展示「包内文件」模块；列表为空时展示 **空态** 与 **新建 Markdown 文件**（仅 `.md` 路径，与 `isMarkdownPath` / `normalizeZipEntryPath` 一致）。
- **二进制**：本站 **不**在 P1-D 提供「新增二进制」；仍由 CLI/zip 带入；既有「二进制仅路径与大小」行为不变。

**非目标**

- 改 CLI 交互主流程、token 发版流程。
- 自动从模板生成 `SOUL.md` 全文（可在空态文案中 **建议** 路径名，见 [`docs/pack-context/`](../../pack-context/) 约定）。

---

## 2. 「空包」定义与产品规则

**真源**：`PackMarkdownFile` 与 `PackBinaryFile` 行数 **均为 0** 时视为 **空包**。Showcase、chat 等 **不计入**「是否有可 apply 内容」。

| 规则 | 行为 |
| --- | --- |
| 上架（`POST .../publish`，首次设为 `LISTED`） | 若为空包 → **400**，错误信息说明需先添加包内文件。 |
| 下载 zip（`GET .../download`） | 若为空包 → **400**（推荐，与「无内容」区分）或 **404**；须与现有 `not found` 语义文档化；**禁止**返回空 zip 给任何角色。 |
| UI（作者） | 空包时：**上架**、**Download zip** **禁用**并附简短说明（服务端仍须校验）。 |

---

## 3. 列表态数据一致性（自动 UNLISTED）

当派生数据同步完成（`syncPackDerivedAfterSourceChange` 或等价路径）后，若 **`packFilePaths` 对应源文件集合为空**（即无 md/bin 行）且当前 `visibility === LISTED`：

- **必须**将 `Pack.visibility` 更新为 **`UNLISTED`**，避免出现「画廊可见但无法下载 / 无内容」的僵尸状态。
- 触发场景包括但不限于：网页删除最后一个文件（若后续实现删除）、CLI 覆盖 zip 导致库表被清空等——以 **同步完成后的 DB 真源** 为准。

---

## 4. 实现路径（已拍板）

### 4.1 创建空 pack

- **方案**：**方案 1** — 新增 **Session 鉴权**的 HTTP API（例如 `POST /api/packs/create`，具体路径以实现为准），**不**复用 Bearer `POST /api/packs`。
- **服务端步骤（概念）**：校验登录与 public handle；`assertValidSlug`；`@@unique([authorId, slug])`；写入 **空 zip** 至存储以满足 `Pack.zipRelPath` 非空约束；`ingest` 空 zip；`buildAndStoreZipFromPackDb` 更新 zip 与 `packFilePaths`；必要时复用与 CLI 创建相同的内部 lib，仅入口与鉴权不同。
- **可选**：后续若增加 Server Action，应调用同一 **createEmptyPack** 逻辑，避免分叉。

### 4.2 新建 vs 更新 Markdown

- **`POST`** `.../source-file`：**专责创建** 新的 Markdown 行：`{ path, content }`（`content` 可为空字符串）；路径已存在 → **409**（或明确错误码），**不**与 PATCH 混用。
- **`PATCH`** `.../source-file`：**保持**「仅更新 **已存在** 的 Markdown」；不存在 → **404**。

---

## 5. UI 要点

- **Dashboard**：新入口置于「在本机 workspace 发布」**上方**；无 handle 时与现有 dashboard 一致（先引导设置 handle）。
- **详情页**：作者 **始终** 渲染「包内文件」；`PackSourceFiles` 在 **零文件** 时 **不**再 `return null`，改为空态 + 新建流程。
- **访客**：未上架 pack 仍 **notFound**（与现有一致）；已上架且**非空**时展示包内预览（与现有 `showPreview` 意图一致；空且已上架在 §3 下应已被自动 UNLISTED，理论上访客不应见到空上架包）。

---

## 6. 测试与验收

- Session 用户创建 slug → 详情页打开 → 空包：**publish** / **download** API **拒绝**；按钮不可用。
- `POST` 创建首个 `.md` → sync 成功 → **publish** / **download** **允许**（在未违反其他校验前提下）。
- 若某操作使库表从非空变为空且曾为 `LISTED`：同步后 **`UNLISTED`**，画廊不再展示（与列表查询一致）。

---

## 7. 与相关文档

- 全仓协作入口：[`AGENTS.md`](../../../AGENTS.md)
- Pack 语境参考（命名与层级）：[`docs/pack-context/AGENTS.md`](../../pack-context/AGENTS.md)

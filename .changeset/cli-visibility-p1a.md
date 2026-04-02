---
"@openclaw-soul/cli": patch
---

### `publish`

- **默认可见性**：新上传的 pack 默认与 registry 对齐为 **未公开（草稿）**，不会直接出现在画廊；成功后在 TTY 下会提示「当前为草稿」及如何公开。
- **`--public`**：与 `--replace` 等选项可同时使用；指定后本次上传为 **公开上架**（registry 侧 `LISTED`）。
- **`--replace` 且不传 `--public`**：multipart **不传** `visibility` 字段，由服务端 **保留** 该 slug 已有可见性（避免覆盖上传时误改公开状态）。
- **响应**：解析并校验服务端返回的 `visibility` 字段（若存在）。

### `apply`

- **元数据**：在下载 zip 前会请求 `GET /api/packs/<handle>/<slug>`，以判断 pack 是否 **未公开**；未公开 pack 需能证明作者身份。
- **`--token`**：可选，等价于环境变量 **`OPENCLAW_SOUL_TOKEN`**；拉取 **未公开** pack 时 **必须** 提供（与下载接口 Bearer 一致）。
- **TTY**：若目标为未公开 pack，在原有确认前会提示「当前为草稿 / 将使用 token 下载」。
- **下载**：对 **未公开** pack 的 zip 请求会携带 **`Authorization: Bearer <token>`**；**已公开** pack 仍为匿名下载，行为与此前一致。

### 其它

- 新增内部模块 `registry-pack-meta.ts`（封装 registry pack 元数据拉取）；`downloadToFile` 支持可选 `RequestInit`（用于带鉴权下载）。

# OpenClaw Soul 路线图

> **现状**：MVP 已能跑通生产部署、CLI 发布与画廊基本路径；本文件把 **对外展示** 目标与 **CLI / 平台后续** 放在同一处，避免多份计划漂移。迭代时以增改 checklist 为主，不发散成大杂烩。

---

## 北极星

- **对外 URL 可打开**：别人不用克隆仓库就能进画廊、点进你的 pack。
- **故事闭环**：「这是什么 → 为什么酷 → 我怎么得到同款」在 60 秒内能说清（页面 + 可选短视频/线程文）。

---

## 支柱一：上线与稳定（P0）

| # | 事项 | 完成标准（简） |
|---|------|----------------|
| 1 | 生产数据库 | Postgres（如 Neon）+ Prisma migrate；与本地 SQLite 文档分离 |
| 2 | 生产文件存储 | zip/头像不落容器盘；Vercel Blob / R2 / S3 等任一可跑通 |
| 3 | 部署 Web | 稳定域名或 Vercel 默认域；`DATABASE_URL` / `STORAGE` / `AUTH_SECRET` 配齐 |
| 4 | 环境文档 | [`docs/DEPLOY.md`](DEPLOY.md)：一条「从零到线上」命令级步骤 |
| 5 | 自己的 pack 上去 | 用生产 `OPENCLAW_SOUL_API` 成功 `publish`，画廊可见、可点进详情 |

**上线即胜利**：先做到表 1–5，再考虑别的。（多数项已在 2026-03 前后闭环，见下方复盘。）

---

## 支柱二：展示成果、引发「想拥有」（P1）

| # | 事项 | 完成标准（简） |
|---|------|----------------|
| A | 画廊「门面」 | 首页能一眼看出：这是 **OpenClaw 人设 / workspace** 分享站，不是你的私人笔记站 |
| B | 你的 showcase pack | 至少 1 个 pack：标题/摘要/头像 **为展示而写**（不必完美，但要诱人点进去） |
| C | 点进去能懂 | pack 详情页：一句 **这人设干嘛的** + `ocs apply handle/slug` 可复制（已指向生产 API 说明） |
| D | 妙用证据（你自选形态） | 聊天记录截图打码、或 SOUL/IDENTITY 里金句摘录、或 30s 录屏——**固定放在一处**：详情扩展区 / 外链 Notion / 推文，并在页面上给 **单一入口链接** |
| E | 「想拥有」路径 | 新访客 3 步内看到：**注册 / token / `ocs login` + `publish` 或 `apply`**（README + 站内短链即可） |

**种草不靠功能堆**：表 A–E 本质是 **叙事 + 一条清晰路径**，功能可以仍很 MVP。

---

## 后续：CLI 与 registry 协同（未排期）

当主域名或 API base 变更、旧域名仍可用时，希望 **不必只依赖用户手改文档**：

- **服务端**：通过响应头或 JSON（例如 `X-OpenClaw-Soul-Registry-Base`、或 `GET /.well-known/openclaw-soul.json`）下发「当前推荐的 registry base URL」。
- **CLI**：在成功请求后比对用户 `OPENCLAW_SOUL_API`（含 `~/.config/openclaw-soul/env`）；若与推荐不一致，**提示**并可选 **写回**用户配置（与 `persistOpenclawSoulCredentials` / `upsertEnvKeyInFile` 衔接）。
- 与旧 URL 长期并存时，便于渐进迁移。

实现细节待定。**当前**：连接失败类错误中会提示用户更新 CLI（`device-login.ts`）。

---

## 刻意延后（防 scope 爆炸）

- 复杂推荐算法、社交关注、评论系统  
- 全自动脱敏流水线（先有 **隐私页 + 自觉打码** 即可）  
- 多语言整站（先中英混排文案即可）

---

## 建议执行顺序（可勾）

1. [ ] 支柱一 1 → 2 → 3（数据与存储与部署绑在一起做完）  
2. [ ] 支柱一 4 → 5（文档 + 你自己的生产首包）  
3. [ ] 支柱二 A → B → C（门面 + 你的 showcase）  
4. [ ] 支柱二 D → E（妙用证据 + 拥有路径）

---

## 复盘槽位（每次大进展写一行）

| 日期 | 进展 |
|------|------|
| 2026-03-24 | P0 闭环：Postgres + Vercel Blob、自定义域与 `OPENCLAW_SOUL_SITE_URL`；CLI 弱网/代理/重试与 publish multipart（undici）；上架成功提示 `viewUrl` 对齐主域；Blob 上传 `addRandomSuffix` 保留历史对象；头像在浏览器与 CLI（sharp）本机压缩至 512 KiB 内。 |
| 2026-03-26 | CLI：默认 `OPENCLAW_SOUL_API` 简化为「未设置则用 `constants` 线上地址」；本地开发依赖根目录 `.env.cli`；`device-login` 连接失败时提示更新 CLI；路线图合并为本文。 |
| （填） | （填） |

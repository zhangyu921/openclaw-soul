## Harness 状态机（任务真源）

本文件是 roadmap 任务状态的事实来源；PR 用 label 镜像同一状态。

- `todo`：未开始（表格里留空）
- `in_progress`：进行中（表格里用 `🚧`）
- `needs_review`：已提 PR 待审（表格里用 `👀`）
- `changes_requested`：审阅要求修改（表格里用 `🛠️`）
- `ready_to_merge`：审阅通过且 CI 绿（表格里用 `✅(待合并)`）
- `done`：已合并上线（表格里用 `✅`）

约束：

1. 一个子任务同一时间只能处于一个状态。
2. 子任务状态变化时，必须同时更新对应 PR label（见 `docs/harness/state-machine.md`）。
3. 若无 PR，不得进入 `needs_review` / `changes_requested` / `ready_to_merge`。

## 当前执行队列

| 状态 | ID | 任务 | Task 文档 |
|---|---|---|---|
| ✅ | P2-E-1 | Header 品牌与首屏视觉最小改造 | [`docs/harness/task-p2-e-1.md`](harness/task-p2-e-1.md) |
|    | P2-F-1 | 画廊检索 MVP（延期；后续走数据库检索方案） | [`docs/harness/task-p2-f-1.md`](harness/task-p2-f-1.md) |
| ✅ | P2-G-1 | 登录入口整合：GitHub 主入口 + 邮箱分流 /register | [`docs/HARNESS-TASK-P2-G-1.md`](HARNESS-TASK-P2-G-1.md) |
| ✅ | P2-H-1 | 创建 pack 后自动跳转详情页 | [`docs/harness/task-p2-h-1.md`](harness/task-p2-h-1.md) |
| ✅ | P2-I-1 | Soul 对话本地缓存 + 新对话按钮 | [`docs/harness/task-p2-i-1.md`](harness/task-p2-i-1.md) |
| ✅ | P2-J-1 | Bug: 头像二次上传后页面未刷新 | [`docs/harness/task-p2-j-1.md`](harness/task-p2-j-1.md) |
| ✅ | P2-K-1 | Pack zip 懒惰生成（apply/下载时再写 blob 缓存） | [`docs/harness/task-p2-k-1.md`](harness/task-p2-k-1.md) |
| ✅ | P2-L-1 | 我的 Souls：从列表移除（DB 标记；列表隐藏；释放 slug） | [`docs/harness/task-p2-l-1.md`](harness/task-p2-l-1.md) |
| 👀 | P2-M-1 | Pack 详情 Chat：流式/思考阶段 typing 指示（不展示思考内容） | [`docs/harness/task-p2-m-1.md`](harness/task-p2-m-1.md) |
|    | P2-N-1 | 详情页包内文件：默认仅列表，点击再拉取预览（减闪烁） | [`docs/harness/task-p2-n-1.md`](harness/task-p2-n-1.md) |

约束：一任务一 commit（小任务）或一分支一 PR（大任务）；开放 PR ≥ 3 时不开新任务。

## P0 （已完成）

| 完成 | # | 事项 | 完成标准（简） |
| --- | --- | --- | --- |
| ✅ | 1 | 生产数据库 | Postgres（如 Neon）+ Prisma migrate；与本地 SQLite 文档分离 |
| ✅ | 2 | 生产文件存储 | zip/头像不落容器盘；Vercel Blob / R2 / S3 等任一可跑通 |
| ✅ | 3 | 部署 Web | 稳定域名或 Vercel 默认域；`DATABASE_URL` / `STORAGE` / `AUTH_SECRET` 配齐 |
| ✅ | 4 | 环境文档 | `docs/DEPLOY.md`：一条「从零到线上」命令级步骤 |
| ✅ | 5 | 自己的 pack 上去 | ✅ 用生产 `OPENCLAW_SOUL_API` 成功 `publish`，画廊可见、可点进详情 |

**上线即胜利**：先做到表 1–5，再考虑别的。（多数项已在 2026-03 前后闭环；持续验证与叙事复盘见 P3。）

## P1

**工程顺序**以本表为准。

| 完成 | 段 | 定位 | 内容（简） |
| --- | --- | --- | --- |
| ✅ | **P1-A** | **当前能力的重新调整** | 上架节奏与草稿：元数据/头像以 Web 为主、上传后不必立刻公开；在线编辑与预览路径向「库表真源 + 必要时再生成下载物」演进；减少「一次 publish 就要完美」的摩擦。 |
| ✅ | **P1-B-1** | **库表真源 / 按需 zip** | 上传时把 Markdown 等正文**直接落库**；`apply` 时再**打包并部署**到用户本机 workspace（与下方「妙用」站点交付解耦）。 |
| ✅ | **P1-B-2** | 优化上传和线上修改体验 | Web：Display title 可编辑；CLI：交互不再问 title/summary/avatar（`--title` 等仍可选），默认标题 IDENTITY Name 否则 slug；先问是否整 workspace（默认否）再选根文件；上传成功提示去网页完善与上架；另：覆盖上传时保留上架状态、未上架 pack 头像 GET 与 JSON 可见性一致。 |
| ✅ | **P1-B-3** | 详情页优化 | pack 详情新增 showcase 展示区，展示区分为正文（格式 md）+ 图片画廊按一行排列展示，正文可重复编辑，画廊意图是上传对话截图，展示细节能力；画廊最多支持 10 张，按比例优先展示前几张，之后可以滑动查看，点击可看大图；整体画廊效果要动态、流畅。 |
| ✅ | **P1-B-4** | 实现 pack 内 md 内容预览和在线编辑 | 详情页「包内文件」：Markdown 列表可选、GFM 预览，作者可编辑保存并重算 zip / SOUL 摘要；二进制仅路径与大小提示，无预览。 |
| ✅ | **P1-C** | 实现即时 chat | 详情页多轮对话；系统与用户侧约定上下文一并注入；登录且仅对可见 pack 开放；与本机 OpenClaw 深度联动解耦，先做站内闭环。 |
| ✅ | **P1-D** | 直接在 web 创建 pack | 在用户 dashboard【在本机 workspace 发布】前新增【从零构建你的 SOUL】，点击之后弹出框输入要创建的 slug 名称，确认后进入新增的 pack 详情页，用户手动在现有的【包内文件】模块新增文件并编辑（复用编辑逻辑，添加新增文件），及实现其他需要的配套逻辑。 |

## P2

**定位**：Web 体验延展（不与 P1 混排优先级；维护者择期推进）。

| 完成 | 段 | 定位 | 内容（简） |
| --- | --- | --- | --- |
| ✅ | P2-A | Web 多语言 | `/[locale]`（`en`/`zh`），`next-intl` + `messages/*.json`；站内路由 locale-aware；UI 文案分期迁入 `messages`。 |
| ✅ | P2-B | 首页信息结构 | 三段话用清晰的声明/分块呈现，避免堆成一段；设计优先帮助用户一眼理解价值。 |
| ✅ | P2-C | 全站文案与多语言 | 其余页面跟进多语言，语气对齐首页：面向用户、少 jargon、用户可见处用 Soul、不出现 pack 作产品名；不拿隐私吓人；基调温柔。 |
| ✅ | P2-D | 登录与账号 | 多登录渠道（含 GitHub）；邮件登录/注册需要验证码。 |
| ✅ | P2-E | 品牌与首屏视觉 | Logo、Header 标题更具设计感。 |
|    | P2-F | 画廊检索 | 可搜索、可按标签筛选（依赖更多 soul 来源后再发力）。 |
| ✅ | P2-G | 登录入口整合 | GitHub 主入口；验证码登录在 `/login`；密码登录/注册在 `/register`；注册 handle 可后置。 |
| ✅ | P2-H | 创建 pack 后跳转 | 「从零构建」创建成功后 `router.push(viewPath)` 进入详情页（见 task-p2-h-1）。 |
| ✅ | P2-I | Soul 对话本地缓存 | 站内对话缓存到本地（localStorage）；「新对话」清空线程（见 P2-I-1）。 |
| ✅ | P2-J | 头像二次上传刷新 | Bug fix：再次上传头像后页面仍显示旧图，需缓存失效 / URL bust / refetch。（见 P2-J-1） |
| ✅ | P2-K | Pack zip 懒惰生成 | 避免每次改 md/包内文件都重打 zip；仅在 `apply` 或用户下载需要时再生成并落 blob 缓存，减少无效占用。（见 P2-K-1） |
| ✅ | P2-L | 我的 Souls 列表治理 | 用户可从「我的 Souls」移除条目：库表标记、列表不展示；移除时下架并释放 slug（P2-L-1 已合并）。 |
|    | P2-M | Pack Chat 体验 | 流式生成时展示「对方正在输入」类 typing，不暴露中间思考文本。 |
|    | P2-N | 包内文件加载 | 详情页默认仅文件列表，点击再拉取预览，减少闪烁（见 P2-N-1）。 |

## P3

**验证与复盘**（外人路径、门面叙事等）

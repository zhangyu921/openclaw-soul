# HARNESS TASK PILOT (2026-04-13 · P2-D-2)

本文件记录 `P2-D` 子任务「邮件验证码登录 MVP」的单轮执行闭环。

---

## A. 输入任务（Task Intake）

- **任务标题**：P2-D-2 Web 邮箱验证码登录最小闭环
- **来源**：`docs/ROADMAP.md`（P2-D 登录与账号）
- **目标（用户价值）**：用户可在不输入密码的情况下使用邮箱验证码登录，降低登录摩擦
- **范围（允许改动）**：`web/` 认证 API、登录页 UI、必要测试与部署文档
- **非目标（本轮不做）**：
  - 邮件模板系统与品牌化信件
  - 第三方邮件服务 SDK 深度集成
  - 登录方式绑定/解绑管理页
- **验收条件（可验证）**：
  - 登录页可发起邮箱验证码请求并提交验证码登录
  - 验证码成功后创建会话并进入登录态
  - 无数据库的 smoke 环境可自动化验证该流程
- **风险点**：验证码泄露、过期码复用、生产环境未配置投递通道

---

## B. 执行拆解（Execution Plan）

1. 增加验证码存储模型与迁移，支持过期与单次使用
2. 实现验证码请求 API（生成、落库、投递）
3. 实现验证码校验 API（校验、核销、创建 session）
4. 在登录页加入邮箱验证码登录入口
5. 补充单元测试与 smoke 测试并记录验证证据

---

## C. 实施记录（Implementation Log）

- **实际改动文件**：
  - `web/prisma/schema.prisma`
  - `web/prisma/migrations/20260413210000_email_login_code/migration.sql`
  - `web/src/lib/email-login.ts`
  - `web/src/app/api/auth/email/request/route.ts`
  - `web/src/app/api/auth/email/request/route.test.ts`
  - `web/src/app/api/auth/email/verify/route.ts`
  - `web/src/app/api/auth/email/verify/route.test.ts`
  - `web/src/app/[locale]/login/login-form.tsx`
  - `web/tests/smoke/github-login.spec.ts`
  - `web/playwright.config.ts`
  - `web/messages/en.json`
  - `web/messages/zh.json`
  - `web/.env.example`
  - `docs/DEPLOY.md`
- **关键实现说明（为什么这样做）**：
  - 采用 `EmailLoginCode` 表保存验证码哈希，避免明文存储并支持过期/核销。
  - 验证码登录与现有 session 体系复用同一 JWT cookie，减少改动面与回归风险。
  - 为 Playwright 引入 `EMAIL_LOGIN_MOCK_USER_ID` 非生产 mock 分支，保证 CI 与本地 smoke 不依赖数据库/人工步骤。
- **与硬约束对齐说明**：
  - `apply` 与写配置未触发破坏性删除
  - 未暗示自动脱敏

---

## D. 验收证据（Verification Evidence）

- **测试命令与结论**：
  - `pnpm --filter @openclaw-soul/web exec prisma generate`：通过
  - `pnpm --filter @openclaw-soul/web test`：通过（16 files passed, 48 tests passed, 1 skipped）
  - `pnpm --filter @openclaw-soul/web typecheck`：通过
  - `cd web && pnpm lint`：通过
  - `pnpm --filter @openclaw-soul/web e2e:smoke`：通过（Playwright smoke 5 passed）
- **子系统验证（按改动选择）**：
  - Web：登录页新增验证码入口，可请求验证码并提交校验。
  - Web：验证码 API 覆盖成功与失败核心分支（缺参、无效码、有效码）。
  - Web：smoke 覆盖「请求验证码 -> 校验登录 -> session cookie 写入」自动化链路。
- **结果摘要**：邮箱验证码登录 MVP 已落地并通过自动化验证；生产环境可通过 `AUTH_EMAIL_CODE_WEBHOOK_URL` 对接真实投递通道。
- **结果摘要**：邮箱验证码登录 MVP 已落地并通过自动化验证；生产环境可优先配置 `RESEND_API_KEY + AUTH_EMAIL_FROM`，或使用 `AUTH_EMAIL_CODE_WEBHOOK_URL` 对接自建投递通道。

---

## E. 失败回流（Failure Feedback，若未通过必填）

- **失败现象**：初版 smoke 依赖数据库导致 500
- **根因假设（<=3）**：
  1. Playwright webServer 未提供可用 PostgreSQL
  2. 测试用例直接走注册与 DB 路径，不适配无 DB smoke
  3. 缺少与 GitHub OAuth 一致的非生产 mock 分支
- **下一轮最小任务（<=0.5 天）**：增加真实邮件投递 provider 适配（Resend/SMTP）并补 webhook 契约测试
- **需要新增的测试/CI 守门**：CI 可考虑追加 route 级别验证码过期/复用边界测试

---

## F. Done 判定（Definition of Done）

- [x] 目标与验收条件达成
- [x] 必要测试通过
- [x] 硬约束未触碰
- [x] 验证证据完整
- [x] 剩余风险已说明
- [x] （如失败）已产出下一轮任务

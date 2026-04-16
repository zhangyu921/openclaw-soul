# HARNESS TASK PILOT (2026-04-13)

本文件是首轮真实任务样例，按 `docs/harness/task-template.md` 填写。

---

## A. 输入任务（Task Intake）

- **任务标题**：P2-D-1 Web GitHub 登录通路最小闭环
- **来源**：`docs/ROADMAP.md`（P2-D 登录与账号）
- **目标（用户价值）**：用户可用 GitHub 账号登录，减少首次体验门槛
- **范围（允许改动）**：`web/` 登录入口、认证配置、必要文案与测试
- **非目标（本轮不做）**：
  - 邮件验证码登录
  - 账号合并/迁移策略
  - 多 provider UI 大改
- **验收条件（可验证）**：
  - 登录页/入口可见 GitHub 登录按钮
  - 本地或测试环境可完成一次 GitHub OAuth 登录回跳
  - 登录后可访问需要登录态的页面
- **风险点**：OAuth 回调配置错误、会话失效、文案与隐私提示不一致

---

## B. 执行拆解（Execution Plan）

1. 盘点现有认证实现与登录入口，确认最小改动面
2. 接入 GitHub provider（仅保留本轮所需配置）
3. 在登录入口加入 GitHub 登录按钮与最小文案
4. 增加/更新认证相关测试或 smoke 验证脚本
5. 本地跑验证命令并记录证据

---

## C. 实施记录（Implementation Log）

- **实际改动文件**：
  - `web/src/app/api/auth/github/start/route.ts`
  - `web/src/app/api/auth/github/callback/route.ts`
  - `web/src/app/api/auth/github/callback/route.test.ts`
  - `web/src/lib/auth-redirect.ts`
  - `web/src/lib/auth-redirect.test.ts`
  - `web/src/app/[locale]/login/login-form.tsx`
  - `web/messages/en.json`
  - `web/messages/zh.json`
  - `web/.env.example`
  - `web/playwright.config.ts`
  - `web/tests/smoke/github-login.spec.ts`
  - `web/vitest.config.ts`
  - `web/.gitignore`
  - `web/package.json`
  - `package.json`
  - `.github/workflows/ci.yml`
  - `docs/DEPLOY.md`
  - `docs/GITHUB-OAUTH-SANDBOX-CHECKLIST.md`
- **关键实现说明（为什么这样做）**：
  - 保持现有 session 体系不变，只在登录入口增加 GitHub OAuth 分支，避免引入大规模认证重构。
  - 新增 `auth-redirect` helper 统一处理 locale 与 `next` 路径安全，避免 open redirect 与跳转到 API 路径。
  - OAuth 失败统一回跳登录页并附带错误参数，用户可见反馈明确。
- **与硬约束对齐说明**：
  - `apply` 写配置未触发破坏性删除
  - 未暗示自动脱敏

---

## D. 验收证据（Verification Evidence）

- **测试命令与结论**：
  - `cd web && pnpm test`：通过（14 files passed, 42 tests passed, 1 skipped）
  - `cd web && pnpm lint`：通过
  - `cd web && pnpm typecheck`：通过
  - `cd web && pnpm e2e:smoke`：通过（Playwright smoke 4 passed）
- **子系统验证（按改动选择）**：
  - Web：登录页已接入 GitHub 登录按钮；OAuth start/callback 路由已实现；登录成功后写入现有 session 并跳转 `next`。
  - Web：Playwright smoke 覆盖「登录入口可见 + OAuth start 重定向 + state 失败回跳 + mock callback 成功写 session」。
  - Web：Vitest route 分支测试补齐 callback 失败分支（token 交换失败、邮箱不可解析）且不依赖人工授权流程。
- **结果摘要**：代码实现、类型检查与自动化验证通过；OAuth 核心成功/失败链路可在本地与 CI 自动验证，无需人工联调作为日常阻塞项。

---

## E. 失败回流（Failure Feedback，若未通过必填）

- **失败现象**：暂无（自动化验证通过）
- **根因假设（<=3）**：
  1. GitHub OAuth app 回调 URL 与环境不一致
  2. 认证密钥或 session 配置不完整
  3. 中间件对登录后路由放行逻辑缺失
- **下一轮最小任务（<=0.5 天）**：补充真实 GitHub sandbox 联调清单（含回调域名、权限、失败分支截图）✅ 已产出并更新为自动化优先：`docs/GITHUB-OAUTH-SANDBOX-CHECKLIST.md`
- **需要新增的测试/CI 守门**：已补 callback 失败分支、未登录跳转、callback 成功设置 session 与重定向断言

---

## F. Done 判定（Definition of Done）

- [x] 目标与验收条件达成
- [x] 必要测试通过
- [x] 硬约束未触碰
- [x] 验证证据完整
- [x] 剩余风险已说明
- [x] （如失败）已产出下一轮任务

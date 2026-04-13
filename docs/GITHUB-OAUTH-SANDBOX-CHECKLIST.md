# GitHub OAuth Sandbox 联调清单

用于验证 `web` 端 GitHub 登录闭环，默认走**自动化联调**（无人工介入），并覆盖关键失败分支。

---

## 1) 执行模式（默认自动化）

- **默认模式（推荐）**：本地/CI 自动化 smoke，不依赖人工登录 GitHub 页面。
- **人工 sandbox 模式（可选）**：仅在上线前做一次真实账号抽检。

---

## 2) 自动化前置配置（必须满足）

- 在测试环境配置：
  - `GITHUB_CLIENT_ID`
  - `GITHUB_CLIENT_SECRET`
  - `AUTH_SECRET`
  - `GITHUB_OAUTH_MOCK_USER_ID`（非生产环境）
- 运行 `pnpm --filter @openclaw-soul/web e2e:smoke`。
- 当前 smoke 已覆盖：
  - 登录入口可见
  - OAuth start 路由重定向参数
  - callback 状态校验失败回跳
  - callback 成功后 session 写入与 `next` 重定向

---

## 3) 权限与最小范围

- 当前实现仅依赖基础登录信息，不要求额外高风险 scope。
- 建议保持 GitHub OAuth 默认 scope（如仅身份识别相关），避免提前引入邮箱写入、组织管理等超范围权限。
- 若后续业务新增 scope，需同步更新：
  - 登录页文案（用户可见）
  - 隐私声明（数据用途）
  - 本清单的验证步骤

---

## 4) 自动化成功链路验证（必测）

1. 访问 `/login`，确认 GitHub 登录入口可见且文案正确。
2. 触发 `/api/auth/github/start`，确认重定向到 GitHub authorize URL 且参数完整。
3. 构造合法 `state + code` 调用 `/api/auth/github/callback`，确认写入 `ocs_session`。
4. 确认 callback 成功后跳回 `next` 指定路径。
5. 访问受保护页面，确认登录态可用。

建议留存证据（自动化）：

- Playwright 通过日志（必选）
- 失败重试 trace / screenshot artifact（推荐）
- 关键回跳 URL 断言输出（可选）

---

## 5) 失败分支验证（至少覆盖以下 3 类）

### A. state 校验失败

- 方法：传入错误 `state` 或缺失 `state cookie`。
- 预期：回跳登录页并附带 `error=github_oauth`；不会创建会话。
- 证据：自动化断言日志。

### B. access token 交换失败

- 方法：在 callback 自动化测试中 mock token endpoint 非 2xx 或返回 `error`。
- 预期：回跳登录页错误态，且无会话 cookie。
- 证据：测试断言日志。

### C. 用户邮箱不可解析

- 方法：在 callback 自动化测试中 mock `/user` 与 `/user/emails` 均无有效 email。
- 预期：回跳登录页错误态，且无会话 cookie。
- 证据：测试断言日志。

---

## 6) 人工 sandbox 抽检（可选）

仅在发布前做一次，不作为日常阻塞项：

- 在真实 GitHub OAuth App 下走完整授权流程。
- 抽检 callback URL 与生产域名完全一致。
- 记录 1 组成功链路截图即可。

---

## 7) 排障对照表（快速定位）

| 现象 | 高概率原因 | 优先检查 |
|------|------------|----------|
| GitHub 提示 redirect_uri mismatch | callback URL 配置不一致 | GitHub App 配置 vs 实际域名 |
| 授权后回到登录页且无法登录 | `GITHUB_CLIENT_SECRET` 错误/缺失 | 部署环境变量与重部署状态 |
| 登录成功但受保护页仍被拦截 | session/JWT 未生效或中间件放行缺失 | `AUTH_SECRET`、cookie、middleware |

---

## 8) 验收口径（本轮完成标准）

- `pnpm --filter @openclaw-soul/web e2e:smoke` 通过。
- callback 成功分支与失败分支 A/B/C 在自动化测试中有可追溯断言证据。
- 证据可直接附加到 harness 任务记录，无需人工补跑。

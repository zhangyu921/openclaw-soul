# HARNESS TASK P2-G-1

## A. 输入任务

- **任务标题**：登录入口整合（GitHub 主入口 + 邮箱折叠）
- **来源**：`docs/ROADMAP.md`
- **目标（用户价值）**：登录/注册页以 GitHub 为主操作路径，邮箱作为补充；减少首屏噪音。
- **范围（允许改动）**：`web/` 登录页、注册页 UI；`messages/*.json` 文案。
- **非目标（本轮不做）**：改 OAuth 后端、合并 `/login` 与 `/register` 为单一路由。
- **验收条件（可验证）**：
  - 默认仅突出 GitHub 按钮（含 GitHub icon）；邮箱表单默认隐藏。
  - 灰色小字可展开/收起邮箱区域；展开后行为与改动前一致。
  - 注册页同样：GitHub 主入口 + 邮箱注册表单可折叠。
- **风险点**：无障碍（expand 控件需可键盘操作）；i18n 键齐全。

## B. 执行拆解

1. 调整 `login-form.tsx`：折叠状态、GitHub 主按钮 + icon、文案键。
2. 调整 `register/page.tsx`：同上 + GitHub 跳转与登录页一致。
3. 更新 `en.json` / `zh.json`。
4. `pnpm exec eslint` / `pnpm run build`（web 包）自检。

## C. 实施记录

- **实际改动文件**：
  - `web/src/app/[locale]/login/login-form.tsx` — GitHub 主按钮 + 邮箱区默认折叠
  - `web/src/app/[locale]/register/page.tsx` — 同上；OAuth `next` 与登录对齐
  - `web/src/components/icons/github-mark.tsx` — GitHub 标记 SVG（lucide 1.x 无 Github 导出）
  - `web/messages/en.json`、`web/messages/zh.json` — 展开/收起文案
- **关键实现说明**：邮箱表单用 `border-t` + 灰色文字按钮展开，避免首屏堆叠；注册页补充 GitHub OAuth 入口。

## D. 验收证据

- **测试命令与结论**：`cd web && pnpm run build` — 通过

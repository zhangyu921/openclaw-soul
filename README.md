# OpenClaw Soul

Registry + CLI for sharing and applying **OpenClaw workspace** packs as zip uploads: the non-interactive default subset is root **`SOUL.md`** plus **`IDENTITY.md`** when present; **`MEMORY.md`** is not included by default—use **`--include MEMORY.md`** or enable it in the interactive publish wizard. Use **`--full`** for the whole workspace directory, or **`--include`** for additional root files. **`apply`** downloads the zip and extracts it locally.

### Why

OpenClaw Soul 帮助人们在 OpenClaw 里**浏览并安装** persona / workspace pack，用可下载工作区快速开局；情绪向与功能向的 pack 都适用。动机与路线图见 [`docs/ROADMAP.md`](docs/ROADMAP.md)。

- **Web**：注册、画廊、API Token、pack 下载（本站部署实例由运营方提供）。
- **CLI**：[`@openclaw-soul/cli`](https://www.npmjs.com/package/@openclaw-soul/cli)（全局命令 **`ocs`**）。

OpenClaw workspace 概念见官方文档：[Agent Workspace](https://docs.openclaw.ai/concepts/agent-workspace)。

## Install

```bash
npm install -g @openclaw-soul/cli
# 或
pnpm add -g @openclaw-soul/cli
```

不全局安装时：

```bash
npx @openclaw-soul/cli --help
```

## Common commands

```bash
npx @openclaw-soul/cli login
npx @openclaw-soul/cli publish
npx @openclaw-soul/cli apply <handle>/<slug>
```

完整子命令与备份/恢复工具见 npm 包说明：**[`packages/cli/README.md`](packages/cli/README.md)**。

`publish` 非交互默认打包 workspace **根目录**的 `SOUL.md` 与（若存在）`IDENTITY.md`；根目录无 `SOUL.md` 会失败退出。`MEMORY.md` 需 **`--include MEMORY.md`** 或在向导中勾选。整目录用 **`--full`**；额外根文件可重复 **`--include <file>`**。交互式向导会先询问是否上传**整个 workspace**（默认否）；选否时再勾选根目录文件。向导**不**再询问展示标题/摘要/头像（默认标题为 IDENTITY **Name**，否则为 slug；可在 registry 网页修改）。子集模式下 `SOUL.md` 必选，`IDENTITY.md` 存在则默认勾选，`MEMORY.md` 默认不勾选。

`login` 使用浏览器授权（device flow），token 写入本机配置（见下）。

## Credentials

1. 环境变量（如 `OPENCLAW_SOUL_TOKEN`）优先于文件。
2. 用户配置文件 **`env`**：
   - macOS / Linux：`~/.config/openclaw-soul/env`（若设置了 `XDG_CONFIG_HOME`，则为 `$XDG_CONFIG_HOME/openclaw-soul/env`）
   - Windows：`%APPDATA%\openclaw-soul\env`
3. 可选：`OPENCLAW_SOUL_CONFIG_DIR` 指向自定义配置目录（其下文件名为 `env`）。

常用变量：`OPENCLAW_SOUL_API`（registry 地址）、`OPENCLAW_SOUL_TOKEN`、`OPENCLAW_SOUL_SITE_URL`（主站 URL，影响授权链接与 `publish` 成功提示的链接）、`OPENCLAW_CONFIG`（`openclaw.json` 路径）。完整列表与代理、超时等见 **[`docs/DEVELOPMENT.md`](docs/DEVELOPMENT.md#环境变量cli)**。

## apply

```bash
npx @openclaw-soul/cli apply alice/my-pack
```

`apply` 会备份已有工作区目录并更新 `openclaw.json` 中的 **`agents.defaults.workspace`**（详见官方 Agent Workspace 文档）。TTY 下会先确认；非交互可加 `-y` / `--yes`。

## Backup（rename / copy，无 rm）

```bash
npx @openclaw-soul/cli archive-directory ~/.openclaw/workspace-demo
npx @openclaw-soul/cli backup-openclaw-config
npx @openclaw-soul/cli restore-openclaw-config --list
npx @openclaw-soul/cli restore-openclaw-config --latest
```

## Privacy

- 条款与说明：站点路径 **`/privacy`**。
- 注册须同意；`publish` 在 TTY 下会提示（同意后写入 `~/.config/openclaw-soul/privacy-ack`）。**非 TTY / CI** 须 **`--accept-privacy`** 或 **`OPENCLAW_SOUL_ACCEPT_PRIVACY=1`**。
- **体积**：pack zip **≤ 2 MiB**；头像 **≤ 512 KiB**（网页与 CLI 上传前会压缩）。
- **频率**：约每自然小时 **20** 次成功发布；超限 **429**。
- 作者可在详情页将 pack **从画廊下架**；同 `slug` 再次 `publish --replace` 可重新公开。

zip 内含哪些文件取决于 **`publish` 选项**（默认子集、`--full`、`--include`）；**作者对上传内容负责**。

## Contributing & development

克隆仓库、本地跑 Web/CLI、维护者发布 npm 包等：**[`docs/DEVELOPMENT.md`](docs/DEVELOPMENT.md)**。AI / 协作者入口：**[`AGENTS.md`](AGENTS.md)**。

其他文档：**[`docs/DEPLOY.md`](docs/DEPLOY.md)**（部署）、**[`docs/ROADMAP.md`](docs/ROADMAP.md)**（路线图）。

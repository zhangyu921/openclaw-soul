# 首页 Slogan 与 Intro 文案对齐（2026-04-09）

## 背景与目标

- 主视觉主题：**Find a soul you really want to talk to.**（中文意译对齐情绪，不逐字硬译。）
- Intro 保留 **What / Who / How** 三段结构（与 `web/src/app/[locale]/page.tsx` 一致）。
- **约束**：文案中 **不出现 “pack”**；**不出现「打包在一起」或等价表述**（英文避免 “bundled” 等）。

## 范围

- **仅** `web/messages/en.json` 与 `web/messages/zh.json` 中 `home` 命名空间下与首页 hero、说明、SEO、空状态相关的键（见下表）。
- **不** 改路由、组件结构或 CLI 行为；`apply` / `publish` 命令示例字符串可保留。

## 最终文案（实现时按此写入）

### 主标题 `heroTitle`

| Key | en | zh |
|-----|----|----|
| `heroTitle` | Find a soul you really want to talk to. | 找到你真正想聊的那一个 Soul。 |

### Intro（标签可保持现有短标签；仅 body 必换）

| Key | en | zh |
|-----|----|----|
| `introWhatBody` | Souls from the community—persona, prompts, and workspace files—so chatting feels like talking to someone you chose, not a generic default. | 社区里的 Soul：人设、提示词与工作区里的内容，让对话像你特意选中的对象，而不是默认模板。 |
| `introWhoBody` | You already use OpenClaw and care how the conversation feels—browse for a match, or publish yours so others can try it. | 你已经用 OpenClaw，在乎对话气质——在画廊里挑一个对的，或分享自己的让别人体验。 |
| `introHowBody` | Use the command below to apply on your machine. | 用下面一条命令在本机 apply。 |

`introWhatLabel` / `introWhoLabel` / `introHowLabel`：**保持** 现有中英文（「这是什么：」/ `What this is:` 等），除非后续单独做 label 微调。

### Badge `badge`

与主站情绪对齐，且不引入 pack：

| en | zh |
|----|----|
| OpenClaw Soul · find your Soul | OpenClaw Soul · 遇见想聊的 Soul |

### SEO `metaDescription`

不含 pack，并点出「发现 + 一条命令装到本机」：

| en | zh |
|----|----|
| Find a soul you want to talk to. Browse Souls from the community for OpenClaw—install with one command. | 找到你想聊的 Soul。浏览社区上架内容，一条命令装到本机 OpenClaw。 |

### 空状态 `emptyDescription`

引导作者上架时 **不说 pack**，可用 Soul 或「作品」：

| en | zh |
|----|----|
| If you're an author: publish your first Soul so browsing and apply have something to show—personas or tools, both work. | 你是作者的话：先 publish 第一个 Soul，逛选与 apply 才有东西可看——人设向或工具向都行。 |

`emptyTitle`、`emptyFromWorkspace`、`applyCommandLine`、`publishCommandLine` 等：**无 pack 则可不改**；若英文 `emptyTitle` 将来改为 “No Souls yet” 类表述，属可选优化，**本 spec 不强制**。

## 验收

- 首页英文/中文切换后，hero + intro + badge + 浏览器 tab 描述（meta）与空状态说明均 **无 “pack” / 无「打包」类表述**。
- 语气与「找对 Soul 再聊」一致，且仍能说清 OpenClaw、画廊、apply 路径。

## 非目标

- 不改其他页面（如 `/packs/...` 路径名、代码标识符中的 pack）。
- 不因本改动新增依赖或改构建流程。

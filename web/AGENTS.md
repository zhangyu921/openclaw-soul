Monorepo 级说明见 [`docs/DEVELOPMENT.md`](../docs/DEVELOPMENT.md)；根目录 **[`AGENTS.md`](../AGENTS.md)** 为全仓协作与领域约束入口。

<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## i18n（`next-intl`）

- **Locales**：`en`（默认）、`zh`；URL 前缀 **`/en/...`、`/zh/...`**（`localePrefix: 'always'`）。
- **文案**：`messages/en.json`、`messages/zh.json`；`zh` 缺 key 时运行时 **回退到 `en`**（见 `src/lib/i18n-messages.ts`、`src/i18n/request.ts`）。
- **语言持久化**：middleware 使用 **`NEXT_LOCALE` cookie**（与 [next-intl `localeCookie`](https://next-intl.dev/docs/routing/configuration#localecookie) 一致；优先级：**cookie > `Accept-Language` > 默认 `en`**）。
- **站内链接**：用 `@/i18n/navigation` 的 `Link` / `redirect` / `useRouter` / `usePathname`，勿写死无前缀路径。
- **Next.js 16**：`middleware.ts` 仍用于 `next-intl`（Edge）；若迁移到官方 `proxy.ts` 范式，需单独跟进与 `next-intl` 文档。
- **工具链**：根目录 [`AGENTS.md`](../AGENTS.md)「仓库习惯」里 **工具与意图** 的原则同样适用；本包内与格式/检查相关的入口示例见 `eslint.config.mjs`（具体规则选项以各工具官方文档为准）。

---
"@openclaw-soul/cli": patch
---

- **默认 registry**：未设置 `OPENCLAW_SOUL_API` 时，从 npm / `npx` 安装的 CLI 默认使用线上 **`https://openclaw-soul.basilfield.com`**；在本 monorepo 内开发仍默认 `http://localhost:3000`（见 `packages/cli/src/constants.ts`）。
- **device-login**：连接被拒时区分 localhost 与线上 origin 的提示文案。
- **文档**：根 README、`packages/cli/README`、`web/.env.example` 同步说明默认 URL。

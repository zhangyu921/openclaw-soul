---
"@openclaw-soul/cli": patch
---

移除 `download`、`import` 子命令；删除仓库内 `example-pack` 示例（若此前脚本依赖该命令，请改用 `apply <handle>/<slug>`）。CLI 帮助与文档已同步；`publish` 向导使用的根文件白名单迁至 `workspace-root-files.ts`。

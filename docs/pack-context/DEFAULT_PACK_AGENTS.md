# DEFAULT_PACK_AGENTS（文档指针）

**OpenClaw Soul 站内对话**里，所有 pack chat 都会注入的 **全局程序层 AGENTS** 正文以仓库源码为准，不在这里重复维护。

- **正文路径**：[web/src/lib/default-pack-agents.md](../../web/src/lib/default-pack-agents.md)（运行时由 [`web/src/lib/default-pack-agents-md.ts`](../../web/src/lib/default-pack-agents-md.ts) 读入并拼进 system prompt）。
- **与作者上传的关系**：若 pack 含根目录 `AGENTS.md`，会在全局段之后以 `USER-UPLOAD-AGENTS.md` 追加；与全局约束冲突时以全局段为准（见该 lib 文件内说明）。

**pack 作者侧**：上架用的根目录 **`AGENTS.md`** 仍是常规 OpenClaw workspace 程序层文件；需要完整工作区行为模板时，可参考本仓库说明（与 Soul 站内全局段不同），见各 spec 与根目录 [`AGENTS.md`](../../AGENTS.md)（使命与约束）、[`docs/REPOSITORY-CONTEXT.md`](../../docs/REPOSITORY-CONTEXT.md)（领域与实现条文）的区分。

注入层级与顺序见 [P1-C instant chat design](../superpowers/specs/2026-04-06-p1-c-instant-chat-design.md)。

# HARNESS TASK — P2-Q-1（草案）

## A. 输入任务（Task Intake）

- **任务标题**：Pack Chat 聊天记录一键分享到 showcase 板块
- **来源**：`docs/IDEAS-INBOX.md`（已 `*` 归入）
- **目标（用户价值）**：复用已有「下载聊天记录」能力，降低把对话亮点放进 showcase 的操作成本
- **范围（允许改动）**：详情页 Chat UI、showcase 写入/上传 API（与现有画廊、正文编辑对齐）
- **非目标（本轮不做）**：全自动抓取或站外分享链路
- **验收条件（可验证）**：作者在详情 chat 可一键将当前线程（或导出格式）写入 showcase 可编辑区或附件流；失败时有明确提示
- **风险点**：showcase 条数/大小限制；隐私（仅作者/可见 pack）；与 lazy zip 缓存一致性

## B. 执行拆解（Execution Plan）

（下轮 tick 补全：与现有「下载聊天记录」实现对照，选定写入 showcase 的数据形态与 API。）

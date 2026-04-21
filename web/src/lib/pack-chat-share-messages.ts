import type { UIMessage } from "ai";
import { isAssistantErrorMessage } from "@/lib/pack-chat-assistant-error";

/** 生成分享图 / Markdown 时排除 assistant 错误气泡。 */
export function filterMessagesForShowcaseShare(messages: UIMessage[]): UIMessage[] {
  return messages.filter((m) => !isAssistantErrorMessage(m));
}

import type { UIMessage } from "ai";

export const ASSISTANT_ERROR_ID_PREFIX = "assistant-error-";

export function isAssistantErrorMessage(message: UIMessage): boolean {
  return (
    message.role === "assistant" && message.id.startsWith(ASSISTANT_ERROR_ID_PREFIX)
  );
}

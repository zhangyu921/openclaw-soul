export function packChatUserBlockStorageKey(
  userId: string,
  handle: string,
  slug: string
): string {
  return `ocs.packChat.userBlock.v1:${userId}:${handle}:${slug}`;
}

/** Persisted `useChat` message list (JSON) for this user + pack. */
export function packChatMessagesStorageKey(
  userId: string,
  handle: string,
  slug: string
): string {
  return `ocs.packChat.messages.v1:${userId}:${handle}:${slug}`;
}

export function packChatUserBlockStorageKey(
  userId: string,
  handle: string,
  slug: string
): string {
  return `ocs.packChat.userBlock.v1:${userId}:${handle}:${slug}`;
}

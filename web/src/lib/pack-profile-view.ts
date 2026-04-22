/**
 * 是否应在当前请求对 Pack 的 profileViewCount 计 +1（作者本人不记）。
 */
export function shouldCountPackProfileView({
  sessionUserId,
  authorId,
}: {
  sessionUserId: string | null;
  authorId: string;
}): boolean {
  if (sessionUserId === null) return true;
  return sessionUserId !== authorId;
}

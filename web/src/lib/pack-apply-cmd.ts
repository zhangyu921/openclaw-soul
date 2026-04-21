/**
 * CLI one-liner shown on pack detail (must match `packages/cli` apply UX).
 */
export function buildPackApplyCommand(handle: string, slug: string): string {
  return `npx @openclaw-soul/cli apply ${handle}/${slug}`;
}

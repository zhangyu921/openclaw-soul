/** 与 `getHomeListingPacks` 的 `unstable_cache` tags 一致。 */
export const HOME_LISTING_PACKS_TAG = "home-listing-packs" as const;

export function packAvatarDataTag(handle: string, slug: string): string {
  return `pack-avatar:${handle}/${slug}`;
}

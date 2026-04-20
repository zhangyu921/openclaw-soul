/** Slug reserved after author removes pack from dashboard; matches `assertValidSlug` pattern. */
export function internalSlugAfterDashboardHide(packId: string): string {
  return `hid-${packId}`;
}

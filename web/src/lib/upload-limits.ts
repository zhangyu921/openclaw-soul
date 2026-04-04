/** Pack zip max size (bytes). Keep in sync with CLI `packages/cli/src/upload-limits.ts`. */
export const MAX_PACK_ZIP_BYTES = 2 * 1024 * 1024;

/** Avatar in multipart publish / avatar API (bytes). 网页/CLI 上传前会压缩到此上限以下。 */
export const MAX_AVATAR_BYTES = 512 * 1024;

export function zipTooLargeMessage(): string {
  return `zip exceeds ${MAX_PACK_ZIP_BYTES} bytes (2 MiB limit)`;
}

export function avatarTooLargeMessage(): string {
  return `avatar exceeds ${MAX_AVATAR_BYTES} bytes (512 KiB limit)`;
}

/** Pack 详情页 showcase 正文（字符数）。 */
export const MAX_SHOWCASE_MD_CHARS = 32_000;

/** Showcase 画廊最多张数。 */
export const MAX_SHOWCASE_IMAGES = 10;

/** Showcase 对话截图单张上限（仅对话截图 API；头像仍用 MAX_AVATAR_BYTES）。 */
export const MAX_SHOWCASE_IMAGE_BYTES = 2 * 1024 * 1024;

export function showcaseImageTooLargeMessage(): string {
  return `showcase image exceeds ${MAX_SHOWCASE_IMAGE_BYTES} bytes (2 MiB limit)`;
}

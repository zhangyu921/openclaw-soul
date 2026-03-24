/** Keep in sync with `web/src/lib/upload-limits.ts`. */
export const MAX_PACK_ZIP_BYTES = 2 * 1024 * 1024;
/** 与 Web 一致；`prepareAvatarForPublish` 会压到此上限以下再上传。 */
export const MAX_AVATAR_BYTES = 512 * 1024;

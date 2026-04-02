/**
 * Zip 摄入与组包共用的路径规范化与分类（纯函数）。
 * 语义与设计稿 §2.1「按相对路径遍历（规范化路径分隔符、拒绝 `..` 等）」一致。
 */

/**
 * 将 zip 条目名规范为相对路径（仅用 `/` 分隔），失败时返回 `null`。
 *
 * 规则：
 * - 将 `\\` 统一为 `/`；
 * - 折叠连续的 `/`（如 `foo//bar` → `foo/bar`）；
 * - 忽略段内的 `.`（当前目录段）；
 * - **拒绝** 任一路径段为 `..`；
 * - **拒绝** 绝对路径：以 `/` 开头，或 Windows 盘符根路径（如 `C:/...`）；
 * - 仅空白、或规范化后无任何段 → `null`。
 *
 * @param name zip 库中的 `entry.fileName` 或等价字符串
 * @returns 规范化后的相对路径，或 `null`（非法或空）
 */
export function normalizeZipEntryPath(name: string): string | null {
  const withSlashes = name.replace(/\\/g, "/").trim();
  if (withSlashes.length === 0) {
    return null;
  }
  // 绝对路径：Unix 根，或 Windows `C:/...`
  if (withSlashes.startsWith("/")) {
    return null;
  }
  if (/^[A-Za-z]:\//.test(withSlashes)) {
    return null;
  }

  const rawSegments = withSlashes.split("/").filter((s) => s.length > 0);
  if (rawSegments.length === 0) {
    return null;
  }

  const out: string[] = [];
  for (const seg of rawSegments) {
    if (seg === "..") {
      return null;
    }
    if (seg === ".") {
      continue;
    }
    out.push(seg);
  }

  if (out.length === 0) {
    return null;
  }
  return out.join("/");
}

/**
 * 判断路径是否视为 Markdown 文件。
 *
 * 与设计稿 §2.1 一致：**以 `.md` 结尾**，扩展名 **大小写不敏感**（如 `.MD`、`.Md` 均算 md）。
 *
 * @param path 已规范化的相对路径或最后一段文件名
 */
export function isMarkdownPath(path: string): boolean {
  return path.toLowerCase().endsWith(".md");
}

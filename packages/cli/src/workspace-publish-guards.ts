import fs from "node:fs";
import path from "node:path";

/**
 * 在 zip / 上传前校验 workspace 根目录存在 `SOUL.md` 普通文件。
 * 调用方应在打包前调用；`buildNonInteractiveSubsetFiles` 假定 SOUL 已通过本函数或等价校验。
 */
export function assertWorkspaceRootSoulFileExists(sourceDir: string): void {
  const abs = path.join(sourceDir, "SOUL.md");
  let st: fs.Stats;
  try {
    st = fs.statSync(abs);
  } catch {
    throw new Error(
      `发布失败：workspace 根目录缺少必需的 SOUL.md 文件（路径：${abs}）`
    );
  }
  if (!st.isFile()) {
    throw new Error(
      `发布失败：SOUL.md 存在但不是普通文件（路径：${abs}）`
    );
  }
}

/**
 * 非交互默认子集：`SOUL.md` + 根目录存在则 `IDENTITY.md` + `--include` 列表（去重）。
 * `includeNames` 须为已校验的根文件名（例如经 `assertSafeRootRelativeFile` 规范化）。
 * 调用方应先执行 `assertWorkspaceRootSoulFileExists(sourceDir)`，再 zip。
 */
export function buildNonInteractiveSubsetFiles(
  sourceDir: string,
  includeNames: string[]
): string[] {
  const result: string[] = ["SOUL.md"];
  const seen = new Set<string>(["SOUL.md"]);

  const identityAbs = path.join(sourceDir, "IDENTITY.md");
  try {
    const st = fs.statSync(identityAbs);
    if (st.isFile()) {
      result.push("IDENTITY.md");
      seen.add("IDENTITY.md");
    }
  } catch {
    // 无 IDENTITY 或非文件：不自动加入
  }

  for (const name of includeNames) {
    if (!seen.has(name)) {
      result.push(name);
      seen.add(name);
    }
  }

  return result;
}

import { revalidateTag } from "next/cache";

/** Next.js 16+：`revalidateTag` 需第二参数，统一走文档推荐的 `max` profile。 */
export function revalidateDataTag(tag: string): void {
  revalidateTag(tag, "max");
}

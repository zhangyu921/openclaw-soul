import { Copy } from "lucide-react";

import { buildPackApplyCommand } from "@/lib/pack-apply-cmd";

export default function PackApplyCommand({
  handle,
  slug,
}: {
  handle: string;
  slug: string;
}) {
  const line = buildPackApplyCommand(handle, slug);

  return (
    <p className="mt-1.5 flex min-w-0 items-center gap-1 font-mono text-xs leading-normal text-muted-foreground">
      <span className="min-w-0 truncate">{line}</span>
      <Copy className="size-3 shrink-0 opacity-70" aria-hidden />
    </p>
  );
}

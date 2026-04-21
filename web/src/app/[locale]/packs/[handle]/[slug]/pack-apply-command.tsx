"use client";

import { useTranslations } from "next-intl";
import { Copy } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { buildPackApplyCommand } from "@/lib/pack-apply-cmd";
import { cn } from "@/lib/utils";

export default function PackApplyCommand({
  handle,
  slug,
}: {
  handle: string;
  slug: string;
}) {
  const t = useTranslations("packDetail");
  const [copied, setCopied] = useState(false);
  const line = buildPackApplyCommand(handle, slug);

  async function onCopy() {
    try {
      await navigator.clipboard.writeText(line);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore — same pattern as dashboard CopyPublishCommand
    }
  }

  return (
    <div className="mt-4 w-full space-y-2 text-left">
      <p className="text-sm text-muted-foreground">{t("applyCopyHint")}</p>
      <div className="flex min-w-0 flex-wrap items-center gap-2">
        <pre
          className={cn(
            "min-w-0 flex-1 overflow-x-auto rounded-xl bg-muted px-3 py-2 font-mono text-xs leading-relaxed sm:text-sm"
          )}
        >
          {line}
        </pre>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="shrink-0 gap-1.5"
          onClick={onCopy}
          title={copied ? t("applyCopied") : t("applyCopyAria")}
        >
          <Copy className="size-4 shrink-0" aria-hidden />
          <span>{copied ? t("applyCopied") : t("applyCopyAction")}</span>
        </Button>
      </div>
    </div>
  );
}

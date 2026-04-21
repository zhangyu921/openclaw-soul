"use client";

import { Check, Copy } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";

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
      // ignore
    }
  }

  return (
    <button
      type="button"
      onClick={onCopy}
      title={copied ? t("applyCopied") : t("applyCopyHint")}
      aria-label={copied ? t("applyCopied") : t("applyCopyHint")}
      className={cn(
        "mt-3 flex min-w-0 max-w-full items-center gap-1.5 rounded-md bg-muted px-2 py-1.5 text-left font-mono text-xs leading-normal text-muted-foreground",
        "cursor-pointer transition-colors hover:bg-muted/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      )}
    >
      <span className="min-w-0 flex-1 truncate">{line}</span>
      {copied ? (
        <Check
          className="size-3 shrink-0 text-emerald-600 dark:text-emerald-400"
          aria-hidden
        />
      ) : (
        <Copy className="size-3 shrink-0 opacity-80" aria-hidden />
      )}
    </button>
  );
}

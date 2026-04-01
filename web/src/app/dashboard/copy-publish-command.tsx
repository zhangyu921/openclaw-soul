"use client";

import { useState } from "react";

import { cn } from "@/lib/utils";

const CMD = "npx @openclaw-soul/cli publish";

export function CopyPublishCommand() {
  const [copied, setCopied] = useState(false);

  async function onCopy() {
    try {
      await navigator.clipboard.writeText(CMD);
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
      title="点击复制"
      className={cn(
        "rounded-md bg-muted px-1.5 py-0.5 font-mono text-[0.7rem] transition-colors sm:text-xs",
        "hover:bg-muted/80 hover:ring-1 hover:ring-border/60",
        "focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
      )}
    >
      {copied ? "已复制" : CMD}
    </button>
  );
}

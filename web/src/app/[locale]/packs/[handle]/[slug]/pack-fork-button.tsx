"use client";

import { GitFork } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { InputGroup, InputGroupAddon, InputGroupInput, InputGroupText } from "@/components/ui/input-group";

export default function PackForkButton({
  userHandle,
  sourceHandle,
  sourceSlug,
}: {
  userHandle?: string;
  sourceHandle: string;
  sourceSlug: string;
}) {
  const t = useTranslations("packFork");
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [slug, setSlug] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit() {
    setError(null);
    const s = slug.trim();
    if (!s) {
      setError(t("slugEmpty"));
      return;
    }
    setLoading(true);
    try {
      const encH = encodeURIComponent(sourceHandle);
      const encS = encodeURIComponent(sourceSlug);
      const res = await fetch(`/api/packs/${encH}/${encS}/fork`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug: s }),
        credentials: "include",
      });
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        viewPath?: string;
      };
      if (!res.ok) {
        const err = typeof data.error === "string" ? data.error : "";
        if (err === "slug_taken") {
          setError(t("slugTaken"));
        } else if (err === "rate_limited") {
          setError(t("rateLimited"));
        } else if (err === "invalid_slug") {
          setError(t("invalidSlug"));
        } else {
          setError(t("failed"));
        }
        return;
      }
      if (typeof data.viewPath === "string" && data.viewPath) {
        setOpen(false);
        setSlug("");
        router.push(data.viewPath);
        return;
      }
      setError(t("badResponse"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <TooltipProvider delay={250}>
        <Tooltip>
          <TooltipTrigger
            render={
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="shrink-0 gap-1 text-muted-foreground"
                onClick={() => {
                  setSlug(sourceSlug);
                  setError(null);
                  setOpen(true);
                }}
              >
                <GitFork className="size-4" aria-hidden />
                {t("button")}
              </Button>
            }
          />
          <TooltipContent side="bottom" align="end">
            <p className="text-pretty">
              {t("buttonTooltip", {
                handle: sourceHandle,
                slug: sourceSlug,
              })}
            </p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
      <Dialog
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          if (!next) {
            setError(null);
            setSlug("");
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("dialogTitle")}</DialogTitle>
            <DialogDescription>{t("dialogDescription")}</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <label
              className="text-sm font-medium text-foreground"
              htmlFor="fork-slug"
            >
              {t("slugLabel")}
            </label>
            <InputGroup>
              <InputGroupAddon align="inline-start" className="font-mono text-sm text-muted-foreground/50">
                {userHandle ?? sourceHandle}
              </InputGroupAddon>
              <InputGroupText className="text-muted-foreground/50">/</InputGroupText>
              <InputGroupInput
                id="fork-slug"
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                autoComplete="off"
                spellCheck={false}
                disabled={loading}
                onKeyDown={(e) => {
                  if (e.key === "Enter") void submit();
                }}
              />
            </InputGroup>
            {error ? (
              <p className="text-sm text-destructive" role="alert">
                {error}
              </p>
            ) : null}
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={loading}
              onClick={() => setOpen(false)}
            >
              {t("cancel")}
            </Button>
            <Button
              type="button"
              disabled={loading}
              onClick={() => void submit()}
            >
              {loading ? t("submitting") : t("submit")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

"use client";

import { Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export type PackChatShareToShowcaseDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  previewFile: File | null;
  busy: boolean;
  onConfirm: () => void | Promise<void>;
};

export default function PackChatShareToShowcaseDialog({
  open,
  onOpenChange,
  previewFile,
  busy,
  onConfirm,
}: PackChatShareToShowcaseDialogProps) {
  const t = useTranslations("packChat");

  const previewUrl = useMemo(() => {
    if (!previewFile) return null;
    return URL.createObjectURL(previewFile);
  }, [previewFile]);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-[min(100vw-2rem,36rem)] gap-3 sm:max-w-lg"
        showCloseButton={!busy}
      >
        <DialogHeader>
          <DialogTitle>{t("sharePreviewTitle")}</DialogTitle>
          <DialogDescription>{t("sharePreviewHint")}</DialogDescription>
        </DialogHeader>
        {previewUrl ? (
          <div className="max-h-[60vh] overflow-auto rounded-md border border-border/80 bg-muted/30">
            {/* eslint-disable-next-line @next/next/no-img-element -- blob preview URL */}
            <img
              alt=""
              className="h-auto w-full object-contain"
              src={previewUrl}
            />
          </div>
        ) : null}
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button
            type="button"
            variant="outline"
            disabled={busy}
            onClick={() => onOpenChange(false)}
          >
            {t("shareCancel")}
          </Button>
          <Button
            type="button"
            disabled={busy || !previewFile}
            onClick={() => void onConfirm()}
          >
            {busy ? (
              <Loader2 className="mr-2 size-4 animate-spin" aria-hidden />
            ) : null}
            {t("shareConfirmUpload")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

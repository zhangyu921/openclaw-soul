"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type ScenarioKey = "vent" | "create" | "discuss" | "custom";

type FormProps = {
  initialMarkdown: string;
  title: string;
  onConfirm: (userBlockMarkdown: string) => void;
  onOpenChange: (open: boolean) => void;
};

function PackChatUserDialogForm({
  initialMarkdown,
  title,
  onConfirm,
  onOpenChange,
}: FormProps) {
  const t = useTranslations("packChat");
  const [step, setStep] = useState<"scenarios" | "custom">("scenarios");
  const [markdown, setMarkdown] = useState(initialMarkdown);

  function handleScenarioPick(key: ScenarioKey) {
    if (key === "custom") {
      setStep("custom");
      return;
    }
    const label = t(`scenarios.${key}.label`);
    const template = t(`scenarios.${key}.preview`);
    onConfirm(`## ${label}\n\n${template}\n`);
    onOpenChange(false);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onConfirm(markdown.trim());
    onOpenChange(false);
  }

  if (step === "scenarios") {
    const scenarioKeys: ScenarioKey[] = ["vent", "create", "discuss", "custom"];
    return (
      <div className="flex max-h-[90vh] flex-col">
        <DialogHeader className="shrink-0 border-b px-6 py-4">
          <DialogTitle>{t("scenarioStepTitle")}</DialogTitle>
        </DialogHeader>
        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-4">
          <p className="mb-4 text-sm text-muted-foreground">
            {t("scenarioStepHint")}
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            {scenarioKeys.map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => handleScenarioPick(key)}
                className="flex flex-col items-start gap-1 rounded-lg border p-4 text-left transition-colors hover:border-primary hover:bg-accent"
              >
                <span className="text-sm font-medium">
                  {t(`scenarios.${key}.label`)}
                </span>
                <span className="text-xs text-muted-foreground">
                  {t(`scenarios.${key}.preview`)}
                </span>
              </button>
            ))}
          </div>
        </div>
        <DialogFooter className="mx-0 mb-0 shrink-0 border-t px-6 py-4 rounded-t-none">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            {t("userDialogCancel")}
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setStep("custom")}
          >
            {t("scenarios.custom.label")}
          </Button>
        </DialogFooter>
      </div>
    );
  }

  return (
    <form
      className="flex max-h-[90vh] flex-col"
      onSubmit={handleSubmit}
    >
      <DialogHeader className="shrink-0 border-b px-6 py-4">
        <DialogTitle>{title}</DialogTitle>
      </DialogHeader>
      <div className="min-h-0 flex-1 overflow-y-auto px-6 py-4">
        <div className="space-y-2">
          <Label htmlFor="pack-chat-user-md">{t("userDialogLabel")}</Label>
          <Textarea
            id="pack-chat-user-md"
            value={markdown}
            onChange={(e) => setMarkdown(e.target.value)}
            className="min-h-[min(60vh,420px)] resize-y font-mono text-sm leading-relaxed"
            spellCheck={false}
            autoComplete="off"
          />
          <p className="text-xs text-muted-foreground">
            {t("userDialogHint")}
          </p>
        </div>
      </div>
      <DialogFooter className="mx-0 mb-0 shrink-0 border-t px-6 py-4 rounded-t-none">
        <Button
          type="button"
          variant="outline"
          onClick={() => setStep("scenarios")}
        >
          {t("userDialogCancel")}
        </Button>
        <Button type="submit" disabled={!markdown.trim()}>
          {t("userDialogConfirm")}
        </Button>
      </DialogFooter>
    </form>
  );
}

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialMarkdown: string;
  title: string;
  onConfirm: (userBlockMarkdown: string) => void;
};

export default function PackChatUserDialog({
  open,
  onOpenChange,
  initialMarkdown,
  title,
  onConfirm,
}: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90vh] max-w-2xl flex-col gap-0 overflow-hidden p-0 sm:max-w-2xl">
        <PackChatUserDialogForm
          key={open ? initialMarkdown : "closed"}
          initialMarkdown={initialMarkdown}
          title={title}
          onConfirm={onConfirm}
          onOpenChange={onOpenChange}
        />
      </DialogContent>
    </Dialog>
  );
}

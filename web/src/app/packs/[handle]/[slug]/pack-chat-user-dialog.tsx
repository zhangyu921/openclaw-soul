"use client";

import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { ParsedUserFields } from "@/lib/user-md-parse";
import { buildUserBlockMarkdown } from "@/lib/user-md-template";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialFields: ParsedUserFields;
  title: string;
  onConfirm: (userBlockMarkdown: string) => void;
};

export default function PackChatUserDialog({
  open,
  onOpenChange,
  initialFields,
  title,
  onConfirm,
}: Props) {
  const [name, setName] = useState("");
  const [whatToCall, setWhatToCall] = useState("");
  const [pronouns, setPronouns] = useState("");
  const [timezone, setTimezone] = useState("");
  const [notes, setNotes] = useState("");
  const [context, setContext] = useState("");

  useEffect(() => {
    if (!open) return;
    setName(initialFields.name ?? "");
    setWhatToCall(initialFields.whatToCall ?? "");
    setPronouns(initialFields.pronouns ?? "");
    setTimezone(initialFields.timezone ?? "");
    setNotes(initialFields.notes ?? "");
    setContext(initialFields.context ?? "");
  }, [open, initialFields]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const md = buildUserBlockMarkdown({
      name,
      whatToCall,
      pronouns,
      timezone,
      notes,
      context,
    });
    onConfirm(md);
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 py-4">
            <div className="space-y-2">
              <Label htmlFor="chat-user-name">Name</Label>
              <Input
                id="chat-user-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoComplete="name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="chat-user-call">What to call them</Label>
              <Input
                id="chat-user-call"
                value={whatToCall}
                onChange={(e) => setWhatToCall(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="chat-user-pronouns">Pronouns</Label>
              <Input
                id="chat-user-pronouns"
                value={pronouns}
                onChange={(e) => setPronouns(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="chat-user-tz">Timezone</Label>
              <Input
                id="chat-user-tz"
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="chat-user-notes">Notes</Label>
              <Textarea
                id="chat-user-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="chat-user-ctx">Context</Label>
              <Textarea
                id="chat-user-ctx"
                value={context}
                onChange={(e) => setContext(e.target.value)}
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit">确认并开始</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

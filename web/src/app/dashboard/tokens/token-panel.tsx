"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LocalDateTime } from "@/components/local-date-time";
import { Separator } from "@/components/ui/separator";
import { privacyLinkClassName } from "@/lib/utils";

type Row = { id: string; label: string | null; createdAt: string };

export default function TokenPanel({
  initialTokens,
  publicHandle,
}: {
  initialTokens: Row[];
  publicHandle: string | null;
}) {
  const router = useRouter();
  const [tokens, setTokens] = useState(initialTokens);
  const [newToken, setNewToken] = useState<string | null>(null);
  const [label, setLabel] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [handleInput, setHandleInput] = useState("");
  const [handleError, setHandleError] = useState<string | null>(null);
  const [handleSaving, setHandleSaving] = useState(false);
  const [handleDone, setHandleDone] = useState(publicHandle);

  async function createToken() {
    setError(null);
    setNewToken(null);
    setLoading(true);
    try {
      const res = await fetch("/api/tokens", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ label: label.trim() || undefined }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : "Failed");
        return;
      }
      if (typeof data.token === "string") setNewToken(data.token);
      setLabel("");
      const list = await fetch("/api/tokens");
      const j = await list.json();
      if (Array.isArray(j.tokens)) {
        setTokens(
          j.tokens.map((t: { id: string; label: string | null; createdAt: string }) => ({
            ...t,
            createdAt: t.createdAt,
          }))
        );
      }
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/");
    router.refresh();
  }

  async function saveHandle() {
    setHandleError(null);
    setHandleSaving(true);
    try {
      const res = await fetch("/api/me/handle", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ handle: handleInput.trim().toLowerCase() }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setHandleError(typeof data.error === "string" ? data.error : "Failed");
        return;
      }
      if (typeof data.handle === "string") setHandleDone(data.handle);
      setHandleInput("");
      router.refresh();
    } finally {
      setHandleSaving(false);
    }
  }

  return (
    <div className="w-full max-w-lg pb-10">
      <div className="mb-8 flex items-center justify-between gap-4">
        <h1 className="font-heading text-2xl font-bold tracking-tight">API tokens</h1>
        <Button type="button" variant="ghost" size="sm" onClick={() => logout()}>
          Log out
        </Button>
      </div>

      {!handleDone ? (
        <Card className="mb-8 border-primary/20 bg-primary/5 shadow-sm ring-1 ring-primary/15">
          <CardHeader>
            <CardTitle className="text-base">设置 public handle</CardTitle>
            <CardDescription>
              发布 pack 与 URL 需要唯一 handle；小写字母、数字、连字符，仅可设一次。
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
              <div className="min-w-0 flex-1 space-y-2">
                <Label htmlFor="dash-handle">Handle</Label>
                <Input
                  id="dash-handle"
                  value={handleInput}
                  onChange={(e) => setHandleInput(e.target.value)}
                  placeholder="your-handle"
                  autoComplete="off"
                  className="h-10 font-mono"
                />
              </div>
              <Button
                type="button"
                disabled={handleSaving || !handleInput.trim()}
                onClick={() => saveHandle()}
                className="shrink-0"
              >
                {handleSaving ? "…" : "Save"}
              </Button>
            </div>
            {handleError ? <p className="text-sm text-destructive">{handleError}</p> : null}
          </CardContent>
        </Card>
      ) : (
        <p className="mb-6 text-sm text-muted-foreground">
          Public handle:{" "}
          <code className="rounded-md bg-muted px-2 py-0.5 font-mono text-sm">{handleDone}</code>
        </p>
      )}

      <Card className="mb-8 border-0 shadow-md ring-1 ring-border/80">
        <CardHeader>
          <CardTitle className="text-base">CLI 与条款</CardTitle>
          <CardDescription>
            使用{" "}
            <code className="rounded bg-muted px-1 font-mono text-xs">npx @openclaw-soul/cli publish</code>{" "}
            即表示你同意{" "}
            <Link href="/privacy" className={privacyLinkClassName}>
              隐私与上传说明
            </Link>
            。
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <p>
            浏览器登录：运行{" "}
            <code className="rounded bg-muted px-1 font-mono text-xs">npx @openclaw-soul/cli login</code>
            ，token 会写入用户配置。脚本/CI 可粘贴下方新建的 token，或设置{" "}
            <code className="rounded bg-muted px-1 font-mono text-xs">OPENCLAW_SOUL_TOKEN</code>。
          </p>
        </CardContent>
      </Card>

      <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="min-w-0 flex-1 space-y-2">
          <Label htmlFor="token-label">Label (optional)</Label>
          <Input
            id="token-label"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="laptop"
            className="h-10"
          />
        </div>
        <Button type="button" disabled={loading} onClick={() => createToken()} className="shrink-0">
          {loading ? "…" : "New token"}
        </Button>
      </div>
      {error ? <p className="mb-4 text-sm text-destructive">{error}</p> : null}
      {newToken ? (
        <Card className="mb-8 border-amber-500/30 bg-amber-500/5 shadow-sm dark:border-amber-400/25 dark:bg-amber-400/10">
          <CardHeader className="pb-2">
            <CardTitle className="text-base text-amber-950 dark:text-amber-50">Copy now — shown once</CardTitle>
          </CardHeader>
          <CardContent>
            <code className="block break-all rounded-md bg-background/80 p-3 font-mono text-sm">{newToken}</code>
          </CardContent>
        </Card>
      ) : null}

      <h2 className="mb-3 text-sm font-medium text-muted-foreground">Existing tokens</h2>
      {tokens.length === 0 ? (
        <p className="text-sm text-muted-foreground">None yet.</p>
      ) : (
        <ul className="space-y-2 text-sm">
          {tokens.map((t) => (
            <li
              key={t.id}
              className="flex justify-between gap-3 rounded-xl border border-border/80 bg-card px-4 py-3 shadow-sm"
            >
              <span>{t.label || "(no label)"}</span>
              <LocalDateTime iso={t.createdAt} className="shrink-0 text-muted-foreground" />
            </li>
          ))}
        </ul>
      )}

      <Separator className="my-10" />
      <p className="text-center text-sm text-muted-foreground">
        <Link href="/" className="underline-offset-4 hover:underline">
          ← Gallery
        </Link>
      </p>
    </div>
  );
}

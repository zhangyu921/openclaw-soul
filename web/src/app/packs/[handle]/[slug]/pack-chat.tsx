"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { packChatUserBlockStorageKey } from "@/lib/pack-chat-storage";
import { parsePackUserMd, type ParsedUserFields } from "@/lib/user-md-parse";
import PackChatUserDialog from "./pack-chat-user-dialog";

function textFromMessage(m: UIMessage): string {
  return m.parts
    .filter((p): p is { type: "text"; text: string } => p.type === "text")
    .map((p) => p.text)
    .join("");
}

type Props = {
  handle: string;
  slug: string;
  userId: string | null;
};

export default function PackChat({ handle, slug, userId }: Props) {
  const pathname = usePathname();
  const loginHref = `/login?next=${encodeURIComponent(pathname)}`;

  const [userBlock, setUserBlock] = useState<string | null>(null);
  const userBlockRef = useRef("");
  useEffect(() => {
    userBlockRef.current = userBlock ?? "";
  }, [userBlock]);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogTitle, setDialogTitle] = useState("对话者设定");
  const [dialogFields, setDialogFields] = useState<ParsedUserFields>({});
  const [hydrated, setHydrated] = useState(false);
  const [usingCached, setUsingCached] = useState(false);

  const chatApi = useMemo(
    () =>
      `/api/packs/${encodeURIComponent(handle)}/${encodeURIComponent(slug)}/chat`,
    [handle, slug]
  );

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: chatApi,
        credentials: "include",
        prepareSendMessagesRequest: async (opts) => ({
          body: {
            ...(opts.body ?? {}),
            userBlock: userBlockRef.current,
          },
        }),
      }),
    [chatApi]
  );

  const chatId = useMemo(() => `pack-chat-${handle}-${slug}`, [handle, slug]);

  const { messages, sendMessage, status, setMessages, error } = useChat({
    id: chatId,
    transport,
  });

  const loadDefaults = useCallback(async (): Promise<ParsedUserFields> => {
    const tz =
      typeof Intl !== "undefined"
        ? Intl.DateTimeFormat().resolvedOptions().timeZone ?? ""
        : "";
    const res = await fetch("/api/auth/me");
    const data = (await res.json().catch(() => ({}))) as {
      user?: { handle?: string | null };
    };
    const h = data.user?.handle?.trim() || "";
    const fields: ParsedUserFields = {
      name: h || undefined,
      whatToCall: h || undefined,
      timezone: tz || undefined,
    };
    const encH = encodeURIComponent(handle);
    const encS = encodeURIComponent(slug);
    try {
      const u = await fetch(
        `/api/packs/${encH}/${encS}/source-file?path=USER.md`
      );
      if (u.ok) {
        const j = (await u.json()) as { kind?: string; content?: string };
        if (j.kind === "markdown" && typeof j.content === "string") {
          Object.assign(fields, parsePackUserMd(j.content));
        }
      }
    } catch {
      /* ignore */
    }
    return fields;
  }, [handle, slug]);

  useEffect(() => {
    if (!userId) {
      setHydrated(true);
      return;
    }
    setHydrated(false);
    (async () => {
      const key = packChatUserBlockStorageKey(userId, handle, slug);
      const cached =
        typeof window !== "undefined" ? window.localStorage.getItem(key) : null;
      if (cached && cached.trim()) {
        setUserBlock(cached);
        setUsingCached(true);
        setHydrated(true);
        return;
      }
      const fields = await loadDefaults();
      setDialogFields(fields);
      setDialogTitle("对话者设定");
      setDialogOpen(true);
      setHydrated(true);
    })();
  }, [userId, handle, slug, loadDefaults]);

  function openDialogForReset() {
    setMessages([]);
    const key = userId
      ? packChatUserBlockStorageKey(userId, handle, slug)
      : null;
    const cached =
      key && typeof window !== "undefined"
        ? window.localStorage.getItem(key)
        : null;
    if (cached && cached.trim()) {
      setDialogFields(parsePackUserMd(cached));
    } else {
      void loadDefaults().then(setDialogFields);
    }
    setDialogTitle("重新设定对话者");
    setDialogOpen(true);
  }

  function onDialogConfirm(md: string) {
    setUserBlock(md);
    setUsingCached(false);
    if (userId && typeof window !== "undefined") {
      const key = packChatUserBlockStorageKey(userId, handle, slug);
      window.localStorage.setItem(key, md);
    }
  }

  const [input, setInput] = useState("");

  useEffect(() => {
    if (!userId) {
      setUserBlock(null);
      setMessages([]);
    }
  }, [userId, setMessages]);

  if (!userId) {
    return (
      <Card className="mt-8 border-0 shadow-md ring-1 ring-border/80">
        <CardHeader>
          <CardTitle className="text-base">与 pack 对话</CardTitle>
          <CardDescription>
            登录后可与当前 pack 的上下文进行多轮对话（演示用途）。
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button render={<Link href={loginHref} />}>登录后开始</Button>
        </CardContent>
      </Card>
    );
  }

  if (!hydrated) {
    return (
      <Card className="mt-8 border-0 shadow-md ring-1 ring-border/80">
        <CardHeader>
          <CardTitle className="text-base">与 pack 对话</CardTitle>
          <CardDescription>准备中…</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const busy = status === "streaming" || status === "submitted";

  return (
    <>
      <PackChatUserDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        initialFields={dialogFields}
        title={dialogTitle}
        onConfirm={onDialogConfirm}
      />
      {userBlock === null ? (
        <Card className="mt-8 border-0 shadow-md ring-1 ring-border/80">
          <CardHeader>
            <CardTitle className="text-base">与 pack 对话</CardTitle>
            <CardDescription>
              请先完成对话者（USER）设定，以便注入与 OpenClaw 对齐的上下文。
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button type="button" onClick={() => setDialogOpen(true)}>
              打开设定
            </Button>
          </CardContent>
        </Card>
      ) : (
      <Card className="mt-8 border-0 shadow-md ring-1 ring-border/80">
        <CardHeader>
          <CardTitle className="text-base">与 pack 对话</CardTitle>
          <CardDescription>
            使用当前 pack 的 SOUL / IDENTITY / AGENTS 与你确认的 USER 上下文。
            对话仅在当前浏览器会话中保留。
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            {usingCached ? "已使用之前的设定开始对话。" : null}{" "}
            <button
              type="button"
              className="font-medium text-primary underline-offset-4 hover:underline"
              onClick={openDialogForReset}
            >
              重新设定
            </button>
          </p>
          <div
            className="max-h-[min(50vh,420px)] space-y-3 overflow-y-auto rounded-xl border border-border/80 bg-muted/20 p-3 text-sm"
            role="log"
            aria-live="polite"
          >
            {messages.length === 0 ? (
              <p className="text-muted-foreground">发送第一条消息开始。</p>
            ) : (
              messages.map((m) => (
                <div
                  key={m.id}
                  className={
                    m.role === "user"
                      ? "ml-8 rounded-lg bg-background px-3 py-2 shadow-sm"
                      : "mr-8 rounded-lg bg-muted/60 px-3 py-2"
                  }
                >
                  <p className="text-xs font-medium text-muted-foreground">
                    {m.role === "user" ? "You" : "Assistant"}
                  </p>
                  <p className="whitespace-pre-wrap break-words">
                    {textFromMessage(m)}
                  </p>
                </div>
              ))
            )}
          </div>
          {error ? (
            <p className="text-sm text-destructive" role="alert">
              {error.message}
            </p>
          ) : null}
          <form
            className="flex flex-col gap-2 sm:flex-row sm:items-end"
            onSubmit={async (e) => {
              e.preventDefault();
              const t = input.trim();
              if (!t || busy) return;
              setInput("");
              await sendMessage({ text: t });
            }}
          >
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="输入消息…"
              rows={2}
              className="min-h-[44px] flex-1"
              disabled={busy}
            />
            <Button type="submit" disabled={busy || !input.trim()}>
              {busy ? "…" : "发送"}
            </Button>
          </form>
        </CardContent>
      </Card>
      )}
    </>
  );
}

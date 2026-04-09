"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { MessageSquare } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  Conversation,
  ConversationContent,
  ConversationDownload,
  ConversationEmptyState,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import {
  Message,
  MessageContent,
  MessageResponse,
} from "@/components/ai-elements/message";
import {
  PromptInput,
  type PromptInputMessage,
  PromptInputSubmit,
  PromptInputTextarea,
} from "@/components/ai-elements/prompt-input";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { packChatUserBlockStorageKey } from "@/lib/pack-chat-storage";
import {
  applyUserMdPlaceholders,
  DEFAULT_USER_MD_TEMPLATE,
} from "@/lib/user-md-template";
import PackChatUserDialog from "./pack-chat-user-dialog";

type Props = {
  handle: string;
  slug: string;
  userId: string | null;
  /** Display title for CTA (e.g. Pack.title). */
  packTitle: string;
  /** No md/bin rows — chat API and UI are disabled. */
  sourceEmpty: boolean;
};

export default function PackChat({
  handle,
  slug,
  userId,
  packTitle,
  sourceEmpty,
}: Props) {
  const t = useTranslations("packChat");
  const pathname = usePathname();
  const loginHref = `/login?next=${encodeURIComponent(pathname)}`;

  const [userBlock, setUserBlock] = useState<string | null>(null);
  const userBlockRef = useRef("");
  useEffect(() => {
    userBlockRef.current = userBlock ?? "";
  }, [userBlock]);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogTitle, setDialogTitle] = useState("对话者设定");
  const [dialogMarkdown, setDialogMarkdown] = useState("");
  /** User clicked「开始与 … 对话」；未点击前不弹 USER 窗、不进入聊天区。 */
  const [flowStarted, setFlowStarted] = useState(false);
  const [usingCached, setUsingCached] = useState(false);
  const [startLoading, setStartLoading] = useState(false);

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
            id: opts.id,
            messages: opts.messages,
            trigger: opts.trigger,
            messageId: opts.messageId,
            userBlock: userBlockRef.current,
          },
        }),
      }),
    [chatApi]
  );

  const chatId = useMemo(() => `pack-chat-${handle}-${slug}`, [handle, slug]);

  const { messages, sendMessage, status, setMessages, error, stop } = useChat({
    id: chatId,
    transport,
  });

  const busy = status === "streaming" || status === "submitted";

  const handlePromptSubmit = useCallback(
    async (message: PromptInputMessage) => {
      if (busy) return;
      const text = message.text.trim();
      if (!text) return;
      setInput("");
      await sendMessage({ text });
    },
    [busy, sendMessage]
  );

  /** Pack `USER.md` if present; otherwise default template with `${…}` replaced. */
  const loadUserMdInitial = useCallback(async (): Promise<string> => {
    const encH = encodeURIComponent(handle);
    const encS = encodeURIComponent(slug);
    const res = await fetch(
      `/api/packs/${encH}/${encS}/source-file?path=USER.md`
    );
    if (res.ok) {
      const j = (await res.json()) as { kind?: string; content?: string };
      if (j.kind === "markdown" && typeof j.content === "string") {
        return j.content;
      }
    }
    const me = (await fetch("/api/auth/me").then((r) =>
      r.json()
    )) as { user?: { handle?: string | null } };
    const userHandle = me?.user?.handle?.trim() ?? "";
    const tz =
      typeof Intl !== "undefined"
        ? Intl.DateTimeFormat().resolvedOptions().timeZone ?? ""
        : "";
    return applyUserMdPlaceholders(DEFAULT_USER_MD_TEMPLATE, {
      userHandle,
      packHandle: handle,
      packSlug: slug,
      timezone: tz,
    });
  }, [handle, slug]);

  const startChatFlow = useCallback(async () => {
    if (!userId) return;
    setStartLoading(true);
    try {
      const key = packChatUserBlockStorageKey(userId, handle, slug);
      const cached =
        typeof window !== "undefined" ? window.localStorage.getItem(key) : null;
      if (cached && cached.trim()) {
        setUserBlock(cached);
        setUsingCached(true);
        setFlowStarted(true);
        return;
      }
      const md = await loadUserMdInitial();
      setDialogMarkdown(md);
      setDialogTitle("对话者设定");
      setFlowStarted(true);
      setDialogOpen(true);
    } finally {
      setStartLoading(false);
    }
  }, [userId, handle, slug, loadUserMdInitial]);

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
      setDialogMarkdown(cached);
    } else {
      void loadUserMdInitial().then(setDialogMarkdown);
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
      setFlowStarted(false);
    }
  }, [userId, setMessages]);

  const displayName = packTitle.trim() || `${handle}/${slug}`;
  const ctaLabel = `开始与【${displayName}】对话`;

  if (sourceEmpty) {
    return (
      <Card className="mt-8 border-0 shadow-md ring-1 ring-border/80">
        <CardHeader>
          <CardTitle className="text-base">与 pack 对话</CardTitle>
          <CardDescription>
            对话需要可注入的 pack 上下文。当前尚无包内文件（Markdown
            或二进制），无法开始对话。
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            请先在上方「包内文件」中至少添加一个文件后再试。
          </p>
        </CardContent>
      </Card>
    );
  }

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
          <Button render={<Link href={loginHref} />}>{ctaLabel}</Button>
        </CardContent>
      </Card>
    );
  }

  if (!flowStarted) {
    return (
      <Card className="mt-8 border-0 shadow-md ring-1 ring-border/80">
        <CardHeader>
          <CardTitle className="text-base">与 pack 对话</CardTitle>
          <CardDescription>
            使用当前 pack 的 SOUL / IDENTITY / AGENTS 与你在对话前确认的 USER
            上下文。对话仅在当前浏览器会话中保留。
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            type="button"
            disabled={startLoading}
            onClick={() => void startChatFlow()}
          >
            {startLoading ? "…" : ctaLabel}
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <PackChatUserDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        initialMarkdown={dialogMarkdown}
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
          <CardContent className="flex flex-wrap gap-2">
            <Button
              type="button"
              onClick={() => {
                void loadUserMdInitial().then((md) => {
                  setDialogMarkdown(md);
                  setDialogTitle("对话者设定");
                  setDialogOpen(true);
                });
              }}
            >
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
          <div className="flex h-[min(50vh,420px)] min-h-[200px] w-full flex-col overflow-hidden rounded-xl border border-border/80 bg-muted/20">
            <Conversation className="min-h-0 flex-1">
              <ConversationContent>
                {messages.length === 0 ? (
                  <ConversationEmptyState
                    description={t("emptyDescription")}
                    icon={
                      <MessageSquare className="size-10 text-muted-foreground" />
                    }
                    title={t("emptyTitle")}
                  />
                ) : (
                  messages.map((message) => (
                    <Message from={message.role} key={message.id}>
                      <MessageContent>
                        {message.parts.map((part, i) => {
                          if (part.type !== "text") {
                            return null;
                          }
                          const partKey = `${message.id}-${i}`;
                          if (message.role === "user") {
                            return (
                              <span
                                key={partKey}
                                className="whitespace-pre-wrap break-words"
                              >
                                {part.text}
                              </span>
                            );
                          }
                          return (
                            <MessageResponse key={partKey}>
                              {part.text}
                            </MessageResponse>
                          );
                        })}
                      </MessageContent>
                    </Message>
                  ))
                )}
              </ConversationContent>
              {messages.length > 0 ? (
                <ConversationDownload messages={messages} />
              ) : null}
              <ConversationScrollButton />
            </Conversation>
          </div>
          {error ? (
            <p className="text-sm text-destructive" role="alert">
              {error.message}
            </p>
          ) : null}
          <PromptInput
            className="relative w-full [&_[data-slot=input-group]]:items-stretch"
            onSubmit={handlePromptSubmit}
          >
            <PromptInputTextarea
              className="min-h-[48px] py-3 pr-12 leading-6 placeholder:leading-6"
              disabled={busy}
              onChange={(e) => setInput(e.currentTarget.value)}
              placeholder={t("inputPlaceholder")}
              value={input}
            />
            <PromptInputSubmit
              aria-label={busy ? t("stop") : t("submit")}
              className="absolute right-2 bottom-2"
              disabled={busy || !input.trim()}
              onStop={stop}
              status={status}
            />
          </PromptInput>
        </CardContent>
      </Card>
      )}
    </>
  );
}

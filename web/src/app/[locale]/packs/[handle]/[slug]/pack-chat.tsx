"use client";

import { useChat, type UIMessage } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { Loader2, MessageSquare, RotateCcw, Share2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link, usePathname, useRouter } from "@/i18n/navigation";
import { AnimatePresence, motion } from "motion/react";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";

const PERSIST_DEBOUNCE_MS = 400;

import {
  Conversation,
  ConversationContent,
  ConversationEmptyState,
  ConversationScrollButton,
  messagesToMarkdown,
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  packChatMessagesStorageKey,
  packChatUserBlockStorageKey,
} from "@/lib/pack-chat-storage";
import {
  applyUserMdPlaceholders,
  DEFAULT_USER_MD_TEMPLATE,
} from "@/lib/user-md-template";
import {
  ASSISTANT_ERROR_ID_PREFIX,
  isAssistantErrorMessage,
} from "@/lib/pack-chat-assistant-error";
import { formatPackChatErrorForDisplay } from "@/lib/pack-chat-client-error";
import {
  buildPackChatShareImageFile,
  SHARE_IMAGE_EMPTY,
} from "@/lib/pack-chat-share-image";
import { filterMessagesForShowcaseShare } from "@/lib/pack-chat-share-messages";
import { MAX_SHOWCASE_IMAGES } from "@/lib/upload-limits";
import PackChatShareToShowcaseDialog from "./pack-chat-share-to-showcase-dialog";
import PackChatUserDialog from "./pack-chat-user-dialog";

function assistantVisibleTextLength(message: UIMessage | undefined): number {
  if (!message || message.role !== "assistant") return 0;
  let raw = "";
  for (const p of message.parts) {
    if (p.type === "text" && p.text) raw += p.text;
  }
  return raw.trim().length;
}

/**
 * DeepSeek 等会先流式输出 reasoning part 再输出正文；UI 在 reasoning 阶段用「正在打字」shimmer，不展示原文。
 */
function assistantReasoningTextLength(message: UIMessage | undefined): number {
  if (!message || message.role !== "assistant") return 0;
  let raw = "";
  for (const p of message.parts) {
    if (p.type === "reasoning" && "text" in p && typeof p.text === "string") {
      raw += p.text;
    }
  }
  return raw.trim().length;
}

function userMessageText(message: UIMessage): string {
  if (message.role !== "user") return "";
  return message.parts
    .filter((p): p is { type: "text"; text: string } => p.type === "text")
    .map((p) => p.text)
    .join("");
}

function subscribePrefersReducedMotion(onChange: () => void) {
  if (typeof window === "undefined") return () => {};
  const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
  mq.addEventListener("change", onChange);
  return () => mq.removeEventListener("change", onChange);
}

function getPrefersReducedMotionSnapshot() {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function usePrefersReducedMotion(): boolean {
  return useSyncExternalStore(
    subscribePrefersReducedMotion,
    getPrefersReducedMotionSnapshot,
    () => false
  );
}

type Props = {
  handle: string;
  slug: string;
  userId: string | null;
  /** Display title for CTA (e.g. Pack.title). */
  packTitle: string;
  /** No md/bin rows — chat API and UI are disabled. */
  sourceEmpty: boolean;
  /** Pack 作者 — 可生成图并上传到对话截图。 */
  isAuthor?: boolean;
  /** 当前对话截图张数（用于满 10 张提示）。 */
  showcaseImageCount: number;
};

export default function PackChat({
  handle,
  slug,
  userId,
  packTitle,
  sourceEmpty,
  isAuthor = false,
  showcaseImageCount,
}: Props) {
  const t = useTranslations("packChat");
  const streamErrorCopy = useMemo(
    () => ({
      generic: t("streamErrorGeneric"),
      unauthorized: t("streamErrorUnauthorized"),
      notFound: t("streamErrorNotFound"),
      rateLimit: t("streamErrorRateLimit"),
      serviceUnavailable: t("streamErrorUnavailable"),
      badRequest: t("streamErrorBadRequest"),
      network: t("streamErrorNetwork"),
    }),
    [t]
  );
  const pathname = usePathname();
  const router = useRouter();
  const loginHref = `/login?next=${encodeURIComponent(pathname)}`;

  const [userBlock, setUserBlock] = useState<string | null>(null);
  const userBlockRef = useRef("");
  useEffect(() => {
    userBlockRef.current = userBlock ?? "";
  }, [userBlock]);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogTitle, setDialogTitle] = useState("");
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

  const { messages, sendMessage, status, setMessages, error, stop, clearError } =
    useChat({
      id: chatId,
      transport,
    });

  const messagesKey = useMemo(
    () => (userId ? packChatMessagesStorageKey(userId, handle, slug) : null),
    [userId, handle, slug]
  );

  /** After restoring from localStorage, allow persisting (avoids wiping storage with [] before load). */
  const [messagesHydrated, setMessagesHydrated] = useState(false);

  useEffect(() => {
    if (!messagesKey || userBlock === null) {
      setMessagesHydrated(false);
      return;
    }
    setMessagesHydrated(false);
    try {
      const raw =
        typeof window !== "undefined" ? window.localStorage.getItem(messagesKey) : null;
      if (raw) {
        const parsed = JSON.parse(raw) as unknown;
        if (Array.isArray(parsed) && parsed.length > 0) {
          setMessages(parsed as UIMessage[]);
        }
      }
    } catch {
      // ignore corrupt storage
    }
    queueMicrotask(() => {
      setMessagesHydrated(true);
    });
  }, [messagesKey, userBlock, setMessages]);

  useEffect(() => {
    if (!messagesKey || userBlock === null || !messagesHydrated) {
      return;
    }
    const id = window.setTimeout(() => {
      try {
        if (messages.length === 0) {
          window.localStorage.removeItem(messagesKey);
        } else {
          window.localStorage.setItem(messagesKey, JSON.stringify(messages));
        }
      } catch {
        // quota or private mode
      }
    }, PERSIST_DEBOUNCE_MS);
    return () => window.clearTimeout(id);
  }, [messages, messagesKey, userBlock, messagesHydrated]);

  useEffect(() => {
    if (!error) return;
    const errText = formatPackChatErrorForDisplay(error, streamErrorCopy);
    setMessages((prev) => {
      let base = prev;
      const last = base[base.length - 1];
      if (
        last?.role === "assistant" &&
        assistantVisibleTextLength(last) === 0
      ) {
        base = base.slice(0, -1);
      }
      return [
        ...base,
        {
          id: `${ASSISTANT_ERROR_ID_PREFIX}${crypto.randomUUID()}`,
          role: "assistant" as const,
          parts: [{ type: "text" as const, text: errText }],
        },
      ];
    });
    clearError();
  }, [error, setMessages, clearError, streamErrorCopy]);

  const busy = status === "streaming" || status === "submitted";
  const prefersReducedMotion = usePrefersReducedMotion();
  /** 仅透明度交叉淡入淡出，避免位移导致「上飘」与布局抖动；略快出、慢进更易读。 */
  const statusLineFadeIn = prefersReducedMotion
    ? { duration: 0.01 }
    : { duration: 0.26, ease: [0.22, 1, 0.36, 1] as const };
  const statusLineFadeOut = prefersReducedMotion
    ? { duration: 0.01 }
    : { duration: 0.18, ease: [0.4, 0, 1, 1] as const };

  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [previewFile, setPreviewFile] = useState<File | null>(null);
  const [shareBusy, setShareBusy] = useState(false);
  const [shareGenerating, setShareGenerating] = useState(false);
  const [shareError, setShareError] = useState<string | null>(null);

  const downloadMarkdown = useCallback(() => {
    const filtered = filterMessagesForShowcaseShare(messages);
    const md = messagesToMarkdown(filtered);
    const blob = new Blob([md], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "conversation.md";
    document.body.append(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }, [messages]);

  const handleGenerateShowcaseImage = useCallback(async () => {
    if (!isAuthor) return;
    if (showcaseImageCount >= MAX_SHOWCASE_IMAGES) {
      setShareError(t("shareShowcaseFull"));
      return;
    }
    setShareError(null);
    setShareGenerating(true);
    try {
      const file = await buildPackChatShareImageFile(messages, {
        truncatedFooter: t("shareImageTruncated"),
      });
      setPreviewFile(file);
      setShareDialogOpen(true);
    } catch (e) {
      if (e instanceof Error && e.message === SHARE_IMAGE_EMPTY) {
        setShareError(t("shareImageEmpty"));
      } else {
        setShareError(t("shareGenerateFailed"));
      }
    } finally {
      setShareGenerating(false);
    }
  }, [isAuthor, showcaseImageCount, messages, t]);

  const handleConfirmShowcaseUpload = useCallback(async () => {
    if (!previewFile) return;
    setShareBusy(true);
    setShareError(null);
    try {
      const form = new FormData();
      form.append("image", previewFile);
      const res = await fetch(
        `/api/packs/${encodeURIComponent(handle)}/${encodeURIComponent(slug)}/showcase-image`,
        { method: "POST", body: form, credentials: "include" }
      );
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setShareError(
          typeof data.error === "string" ? data.error : t("shareUploadFailed")
        );
        return;
      }
      setShareDialogOpen(false);
      setPreviewFile(null);
      router.refresh();
    } finally {
      setShareBusy(false);
    }
  }, [previewFile, handle, slug, router, t]);

  const startNewChat = useCallback(() => {
    stop();
    setShareError(null);
    setMessages([]);
    if (messagesKey) {
      try {
        window.localStorage.removeItem(messagesKey);
      } catch {
        /* ignore */
      }
    }
  }, [stop, setMessages, messagesKey]);

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

  const retryFromUserMessage = useCallback(
    (userMessageIndex: number) => {
      if (busy) return;
      const m = messages[userMessageIndex];
      if (!m || m.role !== "user") return;
      const text = userMessageText(m).trim();
      if (!text) return;
      stop();
      clearError();
      setMessages((prev) => prev.slice(0, userMessageIndex));
      void sendMessage({ text });
    },
    [busy, messages, stop, clearError, setMessages, sendMessage]
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
      setDialogTitle(t("dialogTitleInitial"));
      setFlowStarted(true);
      setDialogOpen(true);
    } finally {
      setStartLoading(false);
    }
  }, [userId, handle, slug, loadUserMdInitial, t]);

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
    setDialogTitle(t("dialogTitleReset"));
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
  const ctaLabel = t("chatWithName", { name: displayName });

  if (sourceEmpty) {
    return (
      <Card className="mt-8 border-0 shadow-md ring-1 ring-border/80">
        <CardHeader>
          <CardTitle className="text-base">{t("cardTitle")}</CardTitle>
          <CardDescription>{t("sourceEmptyBody")}</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">{t("sourceEmptyHint")}</p>
        </CardContent>
      </Card>
    );
  }

  if (!userId) {
    return (
      <Card className="mt-8 border-0 shadow-md ring-1 ring-border/80">
        <CardHeader>
          <CardTitle className="text-base">{t("cardTitle")}</CardTitle>
          <CardDescription>{t("loginCardBody")}</CardDescription>
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
          <CardTitle className="text-base">{t("cardTitle")}</CardTitle>
          <CardDescription>{t("flowIntro")}</CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            type="button"
            disabled={startLoading}
            onClick={() => void startChatFlow()}
          >
            {startLoading ? t("startChatLoading") : ctaLabel}
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
      <PackChatShareToShowcaseDialog
        open={shareDialogOpen}
        busy={shareBusy}
        previewFile={previewFile}
        onConfirm={handleConfirmShowcaseUpload}
        onOpenChange={(open) => {
          setShareDialogOpen(open);
          if (!open) setPreviewFile(null);
        }}
      />
      {userBlock === null ? (
        <Card className="mt-8 border-0 shadow-md ring-1 ring-border/80">
          <CardHeader>
            <CardTitle className="text-base">{t("cardTitle")}</CardTitle>
            <CardDescription>{t("needUserBody")}</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            <Button
              type="button"
              onClick={() => {
                void loadUserMdInitial().then((md) => {
                  setDialogMarkdown(md);
                  setDialogTitle(t("dialogTitleInitial"));
                  setDialogOpen(true);
                });
              }}
            >
              {t("openSettings")}
            </Button>
          </CardContent>
        </Card>
      ) : (
      <Card className="mt-8 border-0 shadow-md ring-1 ring-border/80">
        <CardHeader>
          <CardTitle className="text-base">{t("cardTitle")}</CardTitle>
          <CardDescription>{t("activeIntro")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-1">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="min-w-0 flex-1 text-sm text-muted-foreground">
                {usingCached ? t("cachedNotice") : null}{" "}
                <button
                  type="button"
                  className="font-medium text-primary underline-offset-4 hover:underline"
                  onClick={openDialogForReset}
                >
                  {t("resetSettings")}
                </button>
              </p>
              <TooltipProvider>
                <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={startNewChat}
                    aria-label={t("newChatAria")}
                  >
                    {t("newChat")}
                  </Button>
                  {messages.length > 0 ? (
                    <DropdownMenu>
                      <DropdownMenuTrigger
                        render={
                          <Button
                            variant="outline"
                            size="icon"
                            className="shrink-0"
                            aria-label={t("shareAria")}
                          />
                        }
                      >
                        <Share2 className="size-4" aria-hidden />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() => {
                            void downloadMarkdown();
                          }}
                        >
                          {t("shareDownloadMarkdown")}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          disabled={!isAuthor || shareGenerating}
                          onClick={() => void handleGenerateShowcaseImage()}
                        >
                          {shareGenerating ? (
                            <Loader2
                              className="size-4 shrink-0 animate-spin"
                              aria-hidden
                            />
                          ) : null}
                          {t("shareGenerateShowcaseImage")}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  ) : null}
                </div>
              </TooltipProvider>
            </div>
            {shareError ? (
              <p className="text-right text-xs text-destructive" role="alert">
                {shareError}
              </p>
            ) : null}
          </div>
          <div className="flex h-[min(50vh,420px)] min-h-[200px] w-full flex-col overflow-hidden rounded-xl border border-border/80 bg-muted/20">
            <Conversation className="min-h-0 flex-1">
              <ConversationContent>
                <TooltipProvider>
                {messages.length === 0 ? (
                  <ConversationEmptyState
                    description={t("emptyDescription")}
                    icon={
                      <MessageSquare className="size-10 text-muted-foreground" />
                    }
                    title={t("emptyTitle")}
                  />
                ) : (
                  <>
                    {messages.map((message, idx) => {
                      const isLast = idx === messages.length - 1;
                      if (message.role === "user") {
                        const nextMsg = messages[idx + 1];
                        const showRetry =
                          Boolean(
                            nextMsg &&
                              nextMsg.role === "assistant" &&
                              isAssistantErrorMessage(nextMsg)
                          );
                        const userBubble = (
                          <MessageContent>
                            {message.parts.map((part, i) => {
                              if (part.type !== "text") return null;
                              return (
                                <span
                                  key={`${message.id}-${i}`}
                                  className="whitespace-pre-wrap wrap-break-word"
                                >
                                  {part.text}
                                </span>
                              );
                            })}
                          </MessageContent>
                        );
                        if (!showRetry) {
                          return (
                            <Message from="user" key={message.id}>
                              {userBubble}
                            </Message>
                          );
                        }
                        return (
                          <div
                            key={message.id}
                            className="ml-auto flex w-fit max-w-[95%] flex-row-reverse items-start gap-1"
                          >
                            <Message
                              from="user"
                              className="ml-0! max-w-[min(100%,28rem)]"
                            >
                              {userBubble}
                            </Message>
                            <Tooltip>
                              <TooltipTrigger>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon-sm"
                                  className="mt-1 shrink-0 text-muted-foreground hover:text-foreground"
                                  disabled={busy}
                                  aria-label={t("retryAria")}
                                  onClick={() => retryFromUserMessage(idx)}
                                >
                                  <RotateCcw className="size-4" aria-hidden />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>{t("retryTooltip")}</p>
                              </TooltipContent>
                            </Tooltip>
                          </div>
                        );
                      }

                      return (
                        <Message from={message.role} key={message.id}>
                          <MessageContent>
                            {isLast &&
                            busy &&
                            assistantVisibleTextLength(message) === 0 ? (
                              <div className="flex min-h-9 w-full shrink-0 items-center py-1">
                                <AnimatePresence mode="wait" initial={false}>
                                  {assistantReasoningTextLength(message) === 0 ? (
                                    <motion.div
                                      key="pack-chat-status-thinking"
                                      className="flex w-full items-center"
                                      initial={{ opacity: 0 }}
                                      animate={{
                                        opacity: 1,
                                        transition: statusLineFadeIn,
                                      }}
                                      exit={{
                                        opacity: 0,
                                        transition: statusLineFadeOut,
                                      }}
                                      role="status"
                                      aria-live="polite"
                                      aria-label={t("thinkingAria")}
                                    >
                                      <span className="pack-chat-typing-shimmer inline-block min-w-[10ch] text-sm font-medium select-none">
                                        {t("thinkingShimmer")}
                                      </span>
                                    </motion.div>
                                  ) : (
                                    <motion.div
                                      key="pack-chat-status-typing"
                                      className="flex w-full items-center"
                                      initial={{ opacity: 0 }}
                                      animate={{
                                        opacity: 1,
                                        transition: statusLineFadeIn,
                                      }}
                                      exit={{
                                        opacity: 0,
                                        transition: statusLineFadeOut,
                                      }}
                                      role="status"
                                      aria-live="polite"
                                      aria-label={t("typingAria")}
                                    >
                                      <span className="pack-chat-typing-shimmer inline-block min-w-[10ch] text-sm font-medium select-none">
                                        {t("typingShimmer")}
                                      </span>
                                    </motion.div>
                                  )}
                                </AnimatePresence>
                              </div>
                            ) : null}
                            {message.parts.map((part, i) => {
                              const partKey = `${message.id}-${i}`;
                              if (part.type === "reasoning") {
                                return null;
                              }
                              if (part.type !== "text") {
                                return null;
                              }
                              if (isAssistantErrorMessage(message)) {
                                return (
                                  <pre
                                    key={partKey}
                                    className="max-w-full overflow-x-auto whitespace-pre-wrap wrap-break-word font-mono text-xs text-destructive"
                                  >
                                    {part.text}
                                  </pre>
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
                      );
                    })}
                    {busy && messages.at(-1)?.role === "user" ? (
                      <Message
                        from="assistant"
                        key="pack-chat-assistant-pending"
                      >
                        <MessageContent>
                          <div className="flex min-h-9 w-full shrink-0 items-center py-1">
                            <motion.div
                              initial={{ opacity: 0 }}
                              animate={{
                                opacity: 1,
                                transition: statusLineFadeIn,
                              }}
                              role="status"
                              aria-live="polite"
                              aria-label={t("thinkingAria")}
                            >
                              <span className="pack-chat-typing-shimmer inline-block min-w-[10ch] text-sm font-medium select-none">
                                {t("thinkingShimmer")}
                              </span>
                            </motion.div>
                          </div>
                        </MessageContent>
                      </Message>
                    ) : null}
                  </>
                )}
                </TooltipProvider>
              </ConversationContent>
              <ConversationScrollButton />
            </Conversation>
          </div>
          <PromptInput
            className="relative w-full **:data-[slot=input-group]:items-stretch"
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

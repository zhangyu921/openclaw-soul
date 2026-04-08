"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { MAX_PACK_MARKDOWN_UTF8_BYTES } from "@/lib/upload-limits";
import { cn } from "@/lib/utils";
import { FilePlus, FileText, Loader2, Pencil, Save, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export type SourceFileEntry = {
  path: string;
  kind: "markdown" | "binary";
};

type MdPayload = {
  kind: "markdown";
  path: string;
  content: string;
  updatedAt: string;
};

type BinPayload = {
  kind: "binary";
  path: string;
  byteSize: number | null;
};

type FetchState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ok"; data: MdPayload | BinPayload };

const mdProseClass = cn(
  "rounded-xl border border-border/60 bg-muted/20 p-4 text-sm leading-relaxed",
  "[&_a]:text-primary [&_a]:underline [&_a]:underline-offset-4",
  "[&_code]:rounded-md [&_code]:bg-muted [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-[0.9em]",
  "[&_pre]:overflow-x-auto [&_pre]:rounded-lg [&_pre]:bg-muted [&_pre]:p-3 [&_pre]:font-mono",
  "[&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5",
  "[&_blockquote]:border-l-4 [&_blockquote]:border-primary/40 [&_blockquote]:pl-3 [&_blockquote]:italic",
  "[&_h1]:text-lg [&_h1]:font-semibold [&_h2]:text-base [&_h2]:font-semibold [&_h3]:text-sm [&_h3]:font-semibold"
);

function utf8ByteLength(s: string): number {
  return new TextEncoder().encode(s).length;
}

export default function PackSourceFiles({
  handle,
  slug,
  files,
  isAuthor,
}: {
  handle: string;
  slug: string;
  files: SourceFileEntry[];
  isAuthor: boolean;
}) {
  const router = useRouter();
  const encH = encodeURIComponent(handle);
  const encS = encodeURIComponent(slug);
  const baseUrl = `/api/packs/${encH}/${encS}/source-file`;

  const sorted = useMemo(
    () => [...files].sort((a, b) => a.path.localeCompare(b.path)),
    [files]
  );

  const [selectedPath, setSelectedPath] = useState<string | null>(() =>
    sorted.length > 0 ? sorted[0]!.path : null
  );
  const [fetchState, setFetchState] = useState<FetchState>({ status: "idle" });
  const [editMode, setEditMode] = useState(false);
  const [draftContent, setDraftContent] = useState("");
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [newPath, setNewPath] = useState("");
  const [createError, setCreateError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (sorted.length === 0) {
      setSelectedPath(null);
      return;
    }
    setSelectedPath((prev) => {
      if (prev && sorted.some((f) => f.path === prev)) return prev;
      return sorted[0]!.path;
    });
  }, [sorted]);

  const loadFile = useCallback(
    async (path: string) => {
      setFetchState({ status: "loading" });
      setEditMode(false);
      setSaveError(null);
      const u = new URL(baseUrl, window.location.origin);
      u.searchParams.set("path", path);
      const res = await fetch(u.toString());
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const msg = typeof data.error === "string" ? data.error : "加载失败";
        setFetchState({ status: "error", message: msg });
        return;
      }
      if (data.kind === "markdown") {
        setFetchState({ status: "ok", data: data as MdPayload });
        setDraftContent(typeof data.content === "string" ? data.content : "");
        return;
      }
      if (data.kind === "binary") {
        setFetchState({ status: "ok", data: data as BinPayload });
        setDraftContent("");
        return;
      }
      setFetchState({ status: "error", message: "未知响应" });
    },
    [baseUrl]
  );

  useEffect(() => {
    if (!selectedPath) return;
    void loadFile(selectedPath);
  }, [selectedPath, loadFile]);

  const saveMarkdown = async () => {
    if (!selectedPath || fetchState.status !== "ok" || fetchState.data.kind !== "markdown") {
      return;
    }
    const path = fetchState.data.path;
    const bytes = utf8ByteLength(draftContent);
    if (bytes > MAX_PACK_MARKDOWN_UTF8_BYTES) {
      setSaveError(
        `内容超过上限（${MAX_PACK_MARKDOWN_UTF8_BYTES} UTF-8 字节）`
      );
      return;
    }
    setSaveError(null);
    setSaving(true);
    try {
      const res = await fetch(baseUrl, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path, content: draftContent }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setSaveError(typeof data.error === "string" ? data.error : "保存失败");
        return;
      }
      setEditMode(false);
      await loadFile(path);
      router.refresh();
    } finally {
      setSaving(false);
    }
  };

  const createMarkdownFile = async () => {
    if (!isAuthor) return;
    const raw = newPath.trim();
    if (!raw) {
      setCreateError("请填写相对路径（如 SOUL.md）");
      return;
    }
    setCreateError(null);
    setCreating(true);
    try {
      const res = await fetch(baseUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path: raw, content: "" }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setCreateError(typeof data.error === "string" ? data.error : "创建失败");
        return;
      }
      const created =
        typeof data.path === "string" ? data.path : raw;
      setNewPath("");
      router.refresh();
      setSelectedPath(created);
    } finally {
      setCreating(false);
    }
  };

  if (sorted.length === 0) {
    if (!isAuthor) {
      return null;
    }
    return (
      <Card className="border-0 shadow-md ring-1 ring-border/80">
        <CardHeader>
          <CardTitle className="text-base">包内文件</CardTitle>
          <CardDescription>
            尚无文件。先新建 Markdown（路径以 .md 结尾，例如 SOUL.md）；二进制文件请通过本机 CLI
            上传 zip 更新。
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <Input
              value={newPath}
              onChange={(e) => setNewPath(e.target.value)}
              placeholder="SOUL.md"
              className="font-mono text-sm"
              spellCheck={false}
              aria-label="新建 Markdown 相对路径"
              disabled={creating}
              onKeyDown={(e) => {
                if (e.key === "Enter") void createMarkdownFile();
              }}
            />
            <Button
              type="button"
              size="sm"
              className="shrink-0 gap-1 sm:w-auto"
              disabled={creating}
              onClick={() => void createMarkdownFile()}
            >
              {creating ? (
                <Loader2 className="size-4 animate-spin" aria-hidden />
              ) : (
                <FilePlus className="size-4" aria-hidden />
              )}
              创建
            </Button>
          </div>
          {createError ? (
            <p className="text-sm text-destructive" role="alert">
              {createError}
            </p>
          ) : null}
        </CardContent>
      </Card>
    );
  }

  const mdPayload =
    fetchState.status === "ok" && fetchState.data.kind === "markdown"
      ? fetchState.data
      : null;

  return (
    <Card className="border-0 shadow-md ring-1 ring-border/80">
      <CardHeader>
        <CardTitle className="text-base">包内文件</CardTitle>
        <CardDescription>
          Markdown 可预览；作者可在线编辑。二进制条目仅显示路径，不提供预览。
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-stretch">
          <nav
            className="lg:w-56 lg:shrink-0"
            aria-label="包内文件列表"
          >
            <ul className="max-h-64 space-y-1 overflow-y-auto rounded-xl border border-border/80 bg-muted/40 p-2 lg:max-h-[min(70vh,28rem)]">
              {sorted.map((f) => {
                const active = f.path === selectedPath;
                return (
                  <li key={f.path}>
                    <button
                      type="button"
                      onClick={() => setSelectedPath(f.path)}
                      className={cn(
                        "flex w-full items-start gap-2 rounded-lg px-2 py-1.5 text-left text-xs font-mono transition-colors",
                        active
                          ? "bg-background text-foreground shadow-sm ring-1 ring-border"
                          : "text-muted-foreground hover:bg-muted/80 hover:text-foreground"
                      )}
                    >
                      <span className="mt-0.5 shrink-0">
                        {f.kind === "markdown" ? (
                          <FileText className="size-3.5 opacity-70" aria-hidden />
                        ) : (
                          <span className="block size-3.5 rounded-sm bg-muted-foreground/25" aria-hidden />
                        )}
                      </span>
                      <span className="min-w-0 flex-1 break-all">{f.path}</span>
                      {f.kind === "markdown" ? (
                        <Badge variant="secondary" className="shrink-0 px-1 py-0 text-[0.65rem]">
                          md
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="shrink-0 px-1 py-0 text-[0.65rem]">
                          bin
                        </Badge>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          </nav>

          <div className="min-h-[12rem] min-w-0 flex-1">
            {fetchState.status === "loading" || fetchState.status === "idle" ? (
              <div className="flex h-40 items-center justify-center gap-2 text-muted-foreground">
                <Loader2 className="size-5 animate-spin" aria-hidden />
                <span className="text-sm">加载中…</span>
              </div>
            ) : fetchState.status === "error" ? (
              <p className="text-sm text-destructive" role="alert">
                {fetchState.message}
              </p>
            ) : fetchState.data.kind === "binary" ? (
              <div className="space-y-2 rounded-xl border border-dashed border-border/80 bg-muted/30 p-4">
                <p className="text-sm text-muted-foreground">
                  非 Markdown 文件，仅展示路径（不提供预览或下载链接）。
                </p>
                <pre className="break-all font-mono text-sm leading-relaxed text-foreground">
                  {fetchState.data.path}
                </pre>
                {fetchState.data.byteSize != null ? (
                  <p className="text-xs text-muted-foreground">
                    大小约 {fetchState.data.byteSize.toLocaleString()} 字节（完整内容请使用 Download zip）。
                  </p>
                ) : null}
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                  {isAuthor ? (
                    editMode ? (
                      <>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          disabled={saving}
                          onClick={() => {
                            setEditMode(false);
                            setSaveError(null);
                            if (mdPayload) setDraftContent(mdPayload.content);
                          }}
                        >
                          <X className="size-4" aria-hidden />
                          取消
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          disabled={saving}
                          onClick={() => void saveMarkdown()}
                        >
                          {saving ? (
                            <Loader2 className="size-4 animate-spin" aria-hidden />
                          ) : (
                            <Save className="size-4" aria-hidden />
                          )}
                          保存
                        </Button>
                      </>
                    ) : (
                      <Button
                        type="button"
                        size="sm"
                        variant="secondary"
                        className="gap-1"
                        onClick={() => {
                          setEditMode(true);
                          setSaveError(null);
                          if (mdPayload) setDraftContent(mdPayload.content);
                        }}
                      >
                        <Pencil className="size-4" aria-hidden />
                        编辑
                      </Button>
                    )
                  ) : null}
                  <span className="text-xs text-muted-foreground">
                    {mdPayload
                      ? `更新 ${new Date(mdPayload.updatedAt).toLocaleString()}`
                      : null}
                  </span>
                </div>
                {saveError ? (
                  <p className="text-sm text-destructive" role="alert">
                    {saveError}
                  </p>
                ) : null}
                {editMode && isAuthor ? (
                  <>
                    <Textarea
                      value={draftContent}
                      onChange={(e) => setDraftContent(e.target.value)}
                      rows={18}
                      className="min-h-[14rem] resize-y font-mono text-sm"
                      spellCheck={false}
                      aria-label="Markdown 源码"
                    />
                    <p className="text-right text-xs text-muted-foreground">
                      {utf8ByteLength(draftContent).toLocaleString()} /{" "}
                      {MAX_PACK_MARKDOWN_UTF8_BYTES.toLocaleString()} UTF-8 字节
                    </p>
                  </>
                ) : mdPayload ? (
                  <div className={mdProseClass}>
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {mdPayload.content}
                    </ReactMarkdown>
                  </div>
                ) : null}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

"use client";

import { compressAvatarForUpload } from "@/lib/compress-avatar-client";
import { MAX_SHOWCASE_IMAGES, MAX_SHOWCASE_MD_CHARS } from "@/lib/upload-limits";
import { ChevronLeft, ChevronRight, ImagePlus, Pencil, Trash2, ZoomIn } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

function orderAfterSwapIndices(n: number, i: number, j: number): number[] {
  const order = Array.from({ length: n }, (_, k) => k);
  [order[i], order[j]] = [order[j], order[i]];
  return order;
}

function showcaseImageUrl(handle: string, slug: string, index: number): string {
  return `/api/packs/${encodeURIComponent(handle)}/${encodeURIComponent(slug)}/showcase-image?i=${index}`;
}

export default function PackShowcase({
  handle,
  slug,
  initialShowcaseMd,
  imageCount: initialImageCount,
  isAuthor,
  isListed,
}: {
  handle: string;
  slug: string;
  initialShowcaseMd: string | null;
  imageCount: number;
  isAuthor: boolean;
  isListed: boolean;
}) {
  const router = useRouter();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [lightbox, setLightbox] = useState<number | null>(null);
  const [mdOpen, setMdOpen] = useState(false);
  const [mdValue, setMdValue] = useState(initialShowcaseMd ?? "");
  const [mdError, setMdError] = useState<string | null>(null);
  const [mdSaving, setMdSaving] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [imageCount, setImageCount] = useState(initialImageCount);

  useEffect(() => {
    setMdValue(initialShowcaseMd ?? "");
  }, [initialShowcaseMd]);

  useEffect(() => {
    setImageCount(initialImageCount);
  }, [initialImageCount]);

  const mdTrimmed = initialShowcaseMd?.trim() ?? "";
  const hasBody = mdTrimmed.length > 0;
  const hasGallery = imageCount > 0;
  const visitorCanSee = isListed && (hasBody || hasGallery);
  const authorSeesEmpty = isAuthor && !hasBody && !hasGallery;

  const scrollGallery = useCallback((dir: -1 | 1) => {
    const el = scrollRef.current;
    if (!el) return;
    const amount = Math.min(el.clientWidth * 0.72, 320) + 12;
    el.scrollBy({ left: dir * amount, behavior: "smooth" });
  }, []);

  if (!isAuthor && !visitorCanSee) {
    return null;
  }

  async function saveShowcaseMd() {
    setMdError(null);
    setMdSaving(true);
    try {
      const res = await fetch(
        `/api/packs/${encodeURIComponent(handle)}/${encodeURIComponent(slug)}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ showcaseMd: mdValue }),
        }
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMdError(typeof data.error === "string" ? data.error : "Save failed");
        return;
      }
      setMdOpen(false);
      router.refresh();
    } finally {
      setMdSaving(false);
    }
  }

  async function onPickImage(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadStatus(null);
    setUploading(true);
    try {
      let toSend = file;
      try {
        toSend = await compressAvatarForUpload(file);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        setUploadStatus(msg);
        return;
      }
      const form = new FormData();
      form.append("image", toSend);
      const res = await fetch(
        `/api/packs/${encodeURIComponent(handle)}/${encodeURIComponent(slug)}/showcase-image`,
        { method: "POST", body: form }
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setUploadStatus(typeof data.error === "string" ? data.error : "Upload failed");
        return;
      }
      if (typeof data.count === "number") setImageCount(data.count);
      setUploadStatus("已添加。");
      router.refresh();
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  }

  async function removeImage(index: number) {
    setUploadStatus(null);
    const res = await fetch(
      `/api/packs/${encodeURIComponent(handle)}/${encodeURIComponent(slug)}/showcase-image`,
      {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ index }),
      }
    );
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setUploadStatus(typeof data.error === "string" ? data.error : "Delete failed");
      return;
    }
    if (typeof data.count === "number") setImageCount(data.count);
    setLightbox((prev) => {
      if (prev === null) return prev;
      if (prev === index) return null;
      if (prev > index) return prev - 1;
      return prev;
    });
    router.refresh();
  }

  async function moveImage(index: number, dir: -1 | 1) {
    const next = index + dir;
    if (next < 0 || next >= imageCount) return;
    const order = orderAfterSwapIndices(imageCount, index, next);
    const res = await fetch(
      `/api/packs/${encodeURIComponent(handle)}/${encodeURIComponent(slug)}/showcase-image`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ order }),
      }
    );
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setUploadStatus(typeof data.error === "string" ? data.error : "Reorder failed");
      return;
    }
    router.refresh();
  }

  return (
    <>
      <Card className="mt-8 border-0 shadow-md ring-1 ring-border/80">
        <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-3 space-y-0">
          <div>
            <CardTitle className="text-base">Showcase</CardTitle>
            <CardDescription>
              展示对话截图与补充说明（Markdown）。未上架时仅本人可见；上架后随详情页公开。
            </CardDescription>
          </div>
          {isAuthor ? (
            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="gap-1"
                onClick={() => {
                  setMdError(null);
                  setMdOpen(true);
                }}
              >
                <Pencil className="size-4" aria-hidden />
                编辑正文
              </Button>
              <div className="relative">
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/gif,image/webp"
                  className="absolute inset-0 cursor-pointer opacity-0 disabled:cursor-not-allowed"
                  disabled={uploading || imageCount >= MAX_SHOWCASE_IMAGES}
                  aria-label="上传展示图"
                  title="上传展示图"
                  onChange={onPickImage}
                />
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  className="pointer-events-none gap-1"
                  disabled={uploading || imageCount >= MAX_SHOWCASE_IMAGES}
                >
                  <ImagePlus className="size-4" aria-hidden />
                  添加图片
                  {imageCount > 0 ? ` (${imageCount}/${MAX_SHOWCASE_IMAGES})` : ""}
                </Button>
              </div>
            </div>
          ) : null}
        </CardHeader>
        <CardContent className="space-y-8">
          {authorSeesEmpty ? (
            <p className="text-sm text-muted-foreground">
              尚无展示内容。编写正文或上传对话截图，让读者了解这个 pack 的细节能力。
            </p>
          ) : null}

          {hasBody || isAuthor ? (
            <div>
              {hasBody ? (
                <div
                  className={cn(
                    "rounded-xl border border-border/60 bg-muted/20 p-4 text-sm leading-relaxed",
                    "[&_a]:text-primary [&_a]:underline [&_a]:underline-offset-4",
                    "[&_code]:rounded-md [&_code]:bg-muted [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-[0.9em]",
                    "[&_pre]:overflow-x-auto [&_pre]:rounded-lg [&_pre]:bg-muted [&_pre]:p-3 [&_pre]:font-mono",
                    "[&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5",
                    "[&_blockquote]:border-l-4 [&_blockquote]:border-primary/40 [&_blockquote]:pl-3 [&_blockquote]:italic",
                    "[&_h1]:text-lg [&_h1]:font-semibold [&_h2]:text-base [&_h2]:font-semibold [&_h3]:text-sm [&_h3]:font-semibold"
                  )}
                >
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{mdTrimmed}</ReactMarkdown>
                </div>
              ) : isAuthor ? (
                <p className="text-sm italic text-muted-foreground">尚未编写展示正文。</p>
              ) : null}
            </div>
          ) : null}

          {hasGallery || isAuthor ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-medium text-muted-foreground">对话截图</p>
                {imageCount > 2 ? (
                  <div className="flex gap-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      className="shrink-0"
                      aria-label="向左滚动"
                      onClick={() => scrollGallery(-1)}
                    >
                      <ChevronLeft className="size-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      className="shrink-0"
                      aria-label="向右滚动"
                      onClick={() => scrollGallery(1)}
                    >
                      <ChevronRight className="size-4" />
                    </Button>
                  </div>
                ) : null}
              </div>

              {hasGallery ? (
                <div className="relative">
                  <div
                    ref={scrollRef}
                    className={cn(
                      "flex snap-x snap-mandatory gap-3 overflow-x-auto scroll-smooth pb-2",
                      "[-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
                    )}
                    style={{
                      maskImage:
                        "linear-gradient(to right, transparent 0, black 16px, black calc(100% - 16px), transparent 100%)",
                    }}
                  >
                    {Array.from({ length: imageCount }, (_, i) => (
                      <figure
                        key={i}
                        className={cn(
                          "group relative snap-start snap-always overflow-hidden rounded-xl bg-muted shadow-inner ring-1 ring-border/50",
                          "w-[min(78vw,20rem)] shrink-0 sm:w-[min(56vw,18rem)]"
                        )}
                      >
                        <button
                          type="button"
                          className="relative block aspect-[4/3] w-full cursor-zoom-in outline-none transition duration-300 hover:ring-2 hover:ring-primary/40 focus-visible:ring-2 focus-visible:ring-primary"
                          onClick={() => setLightbox(i)}
                          aria-label={`查看大图 ${i + 1}`}
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={showcaseImageUrl(handle, slug, i)}
                            alt=""
                            className="size-full object-cover transition duration-500 group-hover:scale-[1.03]"
                            loading={i < 3 ? "eager" : "lazy"}
                          />
                          <span className="pointer-events-none absolute bottom-2 right-2 flex size-8 items-center justify-center rounded-full bg-background/80 text-muted-foreground shadow backdrop-blur-sm">
                            <ZoomIn className="size-4" aria-hidden />
                          </span>
                        </button>
                        {isAuthor ? (
                          <figcaption className="absolute left-2 top-2 flex gap-1 opacity-100 transition sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100">
                            <Button
                              type="button"
                              size="icon-sm"
                              variant="secondary"
                              className="size-8 bg-background/90 shadow"
                              disabled={i === 0}
                              aria-label="前移"
                              onClick={(e) => {
                                e.stopPropagation();
                                moveImage(i, -1);
                              }}
                            >
                              <ChevronLeft className="size-4" />
                            </Button>
                            <Button
                              type="button"
                              size="icon-sm"
                              variant="secondary"
                              className="size-8 bg-background/90 shadow"
                              disabled={i >= imageCount - 1}
                              aria-label="后移"
                              onClick={(e) => {
                                e.stopPropagation();
                                moveImage(i, 1);
                              }}
                            >
                              <ChevronRight className="size-4" />
                            </Button>
                            <Button
                              type="button"
                              size="icon-sm"
                              variant="destructive"
                              className="size-8 shadow"
                              aria-label="删除"
                              onClick={(e) => {
                                e.stopPropagation();
                                removeImage(i);
                              }}
                            >
                              <Trash2 className="size-4" />
                            </Button>
                          </figcaption>
                        ) : null}
                      </figure>
                    ))}
                  </div>
                </div>
              ) : isAuthor ? (
                <p className="text-sm italic text-muted-foreground">尚未上传截图。</p>
              ) : null}

              {uploadStatus ? (
                <p
                  className={`text-sm ${uploadStatus.startsWith("已") ? "text-muted-foreground" : "text-destructive"}`}
                  role="status"
                >
                  {uploadStatus}
                </p>
              ) : null}
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Dialog
        open={mdOpen}
        onOpenChange={(next) => {
          setMdOpen(next);
          if (!next) {
            setMdError(null);
            setMdValue(initialShowcaseMd ?? "");
          }
        }}
      >
        <DialogContent className="max-h-[min(90vh,40rem)] gap-4 overflow-y-auto sm:max-w-2xl" showCloseButton>
          <DialogHeader>
            <DialogTitle>编辑展示正文</DialogTitle>
            <DialogDescription>
              支持 Markdown（含 GFM）。最多 {MAX_SHOWCASE_MD_CHARS} 字。留空则不在详情页展示正文区块。
            </DialogDescription>
          </DialogHeader>
          <Textarea
            value={mdValue}
            onChange={(e) => setMdValue(e.target.value.slice(0, MAX_SHOWCASE_MD_CHARS))}
            placeholder="例如：列出典型对话场景、工具调用亮点…"
            rows={14}
            className="min-h-[12rem] resize-y font-mono text-sm"
            aria-invalid={mdValue.length >= MAX_SHOWCASE_MD_CHARS}
          />
          <p className="text-right text-xs text-muted-foreground">
            {mdValue.length}/{MAX_SHOWCASE_MD_CHARS}
          </p>
          {mdError ? (
            <p className="text-sm text-destructive" role="alert">
              {mdError}
            </p>
          ) : null}
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button type="button" variant="outline" onClick={() => setMdOpen(false)} disabled={mdSaving}>
              取消
            </Button>
            <Button type="button" onClick={() => saveShowcaseMd()} disabled={mdSaving}>
              {mdSaving ? "…" : "保存"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={lightbox !== null} onOpenChange={(o) => !o && setLightbox(null)}>
        <DialogContent
          className="max-h-[95vh] max-w-[min(96vw,56rem)] border-0 bg-transparent p-2 shadow-none"
          showCloseButton
        >
          {lightbox !== null ? (
            <div className="relative flex max-h-[90vh] items-center justify-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={showcaseImageUrl(handle, slug, lightbox)}
                alt=""
                className="max-h-[85vh] max-w-full rounded-lg object-contain shadow-2xl ring-1 ring-white/10"
              />
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  );
}

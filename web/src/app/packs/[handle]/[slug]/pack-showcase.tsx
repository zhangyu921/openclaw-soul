"use client";

import { compressShowcaseForUpload } from "@/lib/compress-showcase-client";
import {
  applyShowcaseBatchSave,
  type DraftToken,
} from "@/lib/showcase-batch-save";
import { MAX_SHOWCASE_IMAGES, MAX_SHOWCASE_MD_CHARS } from "@/lib/upload-limits";
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  closestCenter,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  rectSortingStrategy,
  sortableKeyboardCoordinates,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  ChevronLeft,
  ChevronRight,
  GripVertical,
  ImagePlus,
  Pencil,
  Trash2,
  ZoomIn,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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

/** 展示态横向画廊定高（px）。 */
const GALLERY_H_PX = 176;
const MAX_W_TO_H = 2;

function showcaseImageUrl(
  handle: string,
  slug: string,
  serverIndex: number,
  cacheBust: number
): string {
  const base = `/api/packs/${encodeURIComponent(handle)}/${encodeURIComponent(slug)}/showcase-image?i=${serverIndex}`;
  return cacheBust > 0 ? `${base}&v=${cacheBust}` : base;
}

function boxWidthPx(aspectRatio: number | undefined): number {
  const ar = aspectRatio && aspectRatio > 0 ? aspectRatio : 1;
  return GALLERY_H_PX * Math.min(ar, MAX_W_TO_H);
}

function tokenSortableId(t: DraftToken): string {
  return t.kind === "server" ? `s-${t.initialIdx}` : `p-${t.id}`;
}

type LightboxState =
  | { kind: "server"; index: number }
  | { kind: "pending"; id: string; src: string }
  | null;

type DisplayTileProps = {
  handle: string;
  slug: string;
  serverIndex: number;
  cacheBust: number;
  onOpenLightbox: (serverIndex: number) => void;
  aspectByServerIndex: Record<number, number>;
  onMeasured: (serverIndex: number, width: number, height: number) => void;
};

function DisplayShowcaseTile({
  handle,
  slug,
  serverIndex,
  cacheBust,
  onOpenLightbox,
  aspectByServerIndex,
  onMeasured,
}: DisplayTileProps) {
  const ar = aspectByServerIndex[serverIndex];
  const wPx = boxWidthPx(ar);

  return (
    <figure
      className="group relative shrink-0 snap-start snap-always overflow-hidden rounded-xl bg-muted shadow-inner ring-1 ring-border/50"
      style={{ width: wPx }}
    >
      <div
        className="relative flex flex-col"
        style={{ width: wPx, maxWidth: `${GALLERY_H_PX * MAX_W_TO_H}px` }}
      >
        <div
          className="relative flex items-center justify-center bg-muted/60"
          style={{ height: GALLERY_H_PX, width: wPx }}
        >
          <button
            type="button"
            className="relative flex max-h-full max-w-full cursor-zoom-in items-center justify-center outline-none transition hover:ring-2 hover:ring-primary/40 focus-visible:ring-2 focus-visible:ring-primary"
            onClick={() => onOpenLightbox(serverIndex)}
            aria-label="查看大图"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={showcaseImageUrl(handle, slug, serverIndex, cacheBust)}
              alt=""
              className={cn(
                "max-h-full max-w-full object-contain",
                ar !== undefined && ar > MAX_W_TO_H && "object-cover"
              )}
              style={
                ar !== undefined && ar > MAX_W_TO_H
                  ? { width: GALLERY_H_PX * MAX_W_TO_H, height: GALLERY_H_PX }
                  : undefined
              }
              loading="lazy"
              decoding="async"
              draggable={false}
              onLoad={(e) => {
                const el = e.currentTarget;
                onMeasured(serverIndex, el.naturalWidth, el.naturalHeight);
              }}
            />
            <span className="pointer-events-none absolute bottom-2 right-2 flex size-8 items-center justify-center rounded-full bg-background/80 text-muted-foreground shadow backdrop-blur-sm">
              <ZoomIn className="size-4" aria-hidden />
            </span>
          </button>
        </div>
      </div>
    </figure>
  );
}

function VisitorGallery({
  handle,
  slug,
  imageCount,
  cacheBust,
  onOpenLightbox,
  scrollRef,
}: {
  handle: string;
  slug: string;
  imageCount: number;
  cacheBust: number;
  onOpenLightbox: (serverIndex: number) => void;
  scrollRef: React.RefObject<HTMLDivElement | null>;
}) {
  const [aspectByServerIndex, setAspectByServerIndex] = useState<Record<number, number>>({});
  const measure = useCallback((serverIndex: number, w: number, h: number) => {
    if (h <= 0 || w <= 0) return;
    const r = w / h;
    setAspectByServerIndex((prev) => (prev[serverIndex] === r ? prev : { ...prev, [serverIndex]: r }));
  }, []);

  return (
    <div className="relative ml-0 -mr-4 sm:-mr-6">
      <div
        ref={scrollRef}
        className={cn(
          "flex snap-x snap-mandatory gap-3 overflow-x-auto scroll-smooth pb-2 pl-0 pr-3 sm:pr-4",
          "[-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
          "[mask-image:linear-gradient(to_right,black_0,black_calc(100%-1.25rem),transparent_100%)]"
        )}
      >
        {Array.from({ length: imageCount }, (_, i) => (
          <DisplayShowcaseTile
            key={i}
            handle={handle}
            slug={slug}
            serverIndex={i}
            cacheBust={cacheBust}
            onOpenLightbox={onOpenLightbox}
            aspectByServerIndex={aspectByServerIndex}
            onMeasured={measure}
          />
        ))}
      </div>
    </div>
  );
}

function EditGridTile({
  token,
  handle,
  slug,
  cacheBust,
  previewUrl,
  onRemove,
  onOpenLightbox,
}: {
  token: DraftToken;
  handle: string;
  slug: string;
  cacheBust: number;
  previewUrl: string | null;
  onRemove: () => void;
  onOpenLightbox: () => void;
}) {
  const id = tokenSortableId(token);
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id,
  });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : undefined,
  };

  const src =
    token.kind === "server"
      ? showcaseImageUrl(handle, slug, token.initialIdx, cacheBust)
      : previewUrl ?? "";

  return (
    <figure
      ref={setNodeRef}
      style={style}
      className={cn(
        "group relative aspect-square w-[calc(50%-0.375rem)] max-w-[9rem] shrink-0 overflow-hidden rounded-xl bg-muted shadow-inner ring-1 ring-border/50 sm:w-28",
        isDragging && "opacity-90 shadow-lg ring-2 ring-primary/50"
      )}
    >
      <div className="relative size-full min-h-0">
        <button
          type="button"
          className="relative size-full cursor-zoom-in outline-none"
          onClick={onOpenLightbox}
          aria-label="查看大图"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={src}
            alt=""
            className="size-full object-cover"
            draggable={false}
          />
          <span className="pointer-events-none absolute bottom-1.5 right-1.5 flex size-7 items-center justify-center rounded-full bg-background/85 text-muted-foreground shadow backdrop-blur-sm">
            <ZoomIn className="size-3.5" aria-hidden />
          </span>
        </button>
        <button
          type="button"
          className={cn(
            "touch-none absolute left-1 top-1 flex size-7 cursor-grab items-center justify-center rounded-md border border-border/60 bg-background/90 text-muted-foreground shadow-sm backdrop-blur-sm active:cursor-grabbing",
            "opacity-100 sm:opacity-0 sm:transition-opacity sm:group-hover:opacity-100"
          )}
          aria-label="拖拽排序"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="size-3.5" aria-hidden />
        </button>
        <Button
          type="button"
          size="icon-sm"
          variant="destructive"
          className="absolute right-1 top-1 size-7 shadow"
          aria-label="移除"
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
        >
          <Trash2 className="size-3.5" />
        </Button>
      </div>
    </figure>
  );
}

function EditShowcaseGrid({
  handle,
  slug,
  cacheBust,
  draftTokens,
  onChangeDraft,
  previewByPendingId,
  onRemoveToken,
  onOpenLightbox,
}: {
  handle: string;
  slug: string;
  cacheBust: number;
  draftTokens: DraftToken[];
  onChangeDraft: (next: DraftToken[]) => void;
  previewByPendingId: Record<string, string>;
  onRemoveToken: (t: DraftToken) => void;
  onOpenLightbox: (t: DraftToken) => void;
}) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 220, tolerance: 12 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const sortableIds = useMemo(() => draftTokens.map(tokenSortableId), [draftTokens]);

  function onDragStart(e: DragStartEvent) {
    setActiveId(String(e.active.id));
  }

  function onDragEnd(e: DragEndEvent) {
    setActiveId(null);
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const oldIndex = sortableIds.indexOf(String(active.id));
    const newIndex = sortableIds.indexOf(String(over.id));
    if (oldIndex < 0 || newIndex < 0) return;
    onChangeDraft(arrayMove(draftTokens, oldIndex, newIndex));
  }

  function onDragCancel() {
    setActiveId(null);
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onDragCancel={onDragCancel}
    >
      <SortableContext items={sortableIds} strategy={rectSortingStrategy}>
        <div className="flex flex-wrap gap-3">
          {draftTokens.map((t) => (
            <EditGridTile
              key={tokenSortableId(t)}
              token={t}
              handle={handle}
              slug={slug}
              cacheBust={cacheBust}
              previewUrl={t.kind === "pending" ? (previewByPendingId[t.id] ?? null) : null}
              onRemove={() => onRemoveToken(t)}
              onOpenLightbox={() => onOpenLightbox(t)}
            />
          ))}
        </div>
      </SortableContext>
      <DragOverlay dropAnimation={null}>
        {activeId ? (
          <div className="pointer-events-none aspect-square w-28 overflow-hidden rounded-xl bg-muted ring-2 ring-primary/40">
            <div className="flex h-8 items-center justify-center border-b border-border/60 text-[10px] text-muted-foreground">
              排序中…
            </div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={
                activeId.startsWith("p-")
                  ? previewByPendingId[activeId.slice("p-".length)] ?? ""
                  : (() => {
                      const idx = Number.parseInt(activeId.replace(/^s-/, ""), 10);
                      return showcaseImageUrl(handle, slug, idx, cacheBust);
                    })()
              }
              alt=""
              className="size-full object-cover"
            />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
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
  const [lightbox, setLightbox] = useState<LightboxState>(null);
  const [mdOpen, setMdOpen] = useState(false);
  const [mdValue, setMdValue] = useState(initialShowcaseMd ?? "");
  const [mdError, setMdError] = useState<string | null>(null);
  const [mdSaving, setMdSaving] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [imageCount, setImageCount] = useState(initialImageCount);
  const [cacheBust, setCacheBust] = useState(0);

  const [showcaseEditMode, setShowcaseEditMode] = useState(false);
  const [editSnapshotCount, setEditSnapshotCount] = useState(0);
  const [draftTokens, setDraftTokens] = useState<DraftToken[]>([]);
  const [previewByPendingId, setPreviewByPendingId] = useState<Record<string, string>>({});

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
    const amount = Math.min(el.clientWidth * 0.32, GALLERY_H_PX * MAX_W_TO_H + 12);
    el.scrollBy({ left: dir * amount, behavior: "smooth" });
  }, []);

  function enterShowcaseEditMode() {
    setUploadStatus(null);
    const n = imageCount;
    setEditSnapshotCount(n);
    setDraftTokens(Array.from({ length: n }, (_, i) => ({ kind: "server" as const, initialIdx: i })));
    setShowcaseEditMode(true);
  }

  function cancelShowcaseEditMode() {
    Object.values(previewByPendingId).forEach((u) => URL.revokeObjectURL(u));
    setPreviewByPendingId({});
    setDraftTokens([]);
    setShowcaseEditMode(false);
  }

  async function saveShowcaseEdits() {
    setUploadStatus(null);
    setUploading(true);
    try {
      const result = await applyShowcaseBatchSave(handle, slug, draftTokens, editSnapshotCount);
      if (!result.ok) {
        setUploadStatus(result.error);
        return;
      }
      setCacheBust((c) => c + 1);
      Object.values(previewByPendingId).forEach((u) => URL.revokeObjectURL(u));
      setPreviewByPendingId({});
      setShowcaseEditMode(false);
      setDraftTokens([]);
      router.refresh();
    } finally {
      setUploading(false);
    }
  }

  function removeDraftToken(t: DraftToken) {
    if (t.kind === "pending") {
      const u = previewByPendingId[t.id];
      if (u) URL.revokeObjectURL(u);
      setPreviewByPendingId((prev) => {
        const next = { ...prev };
        delete next[t.id];
        return next;
      });
    }
    setDraftTokens((prev) =>
      prev.filter((x) => {
        if (x.kind !== t.kind) return true;
        if (x.kind === "server" && t.kind === "server") return x.initialIdx !== t.initialIdx;
        if (x.kind === "pending" && t.kind === "pending") return x.id !== t.id;
        return true;
      })
    );
  }

  function openLightboxFromToken(t: DraftToken) {
    if (t.kind === "server") {
      setLightbox({ kind: "server", index: t.initialIdx });
    } else {
      const src = previewByPendingId[t.id];
      if (src) setLightbox({ kind: "pending", id: t.id, src });
    }
  }

  async function onPickShowcaseImages(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files?.length) return;
    setUploadStatus(null);
    setUploading(true);
    try {
      const remaining = MAX_SHOWCASE_IMAGES - draftTokens.length;
      if (remaining <= 0) {
        setUploadStatus(`最多 ${MAX_SHOWCASE_IMAGES} 张`);
        return;
      }
      const toAdd = Array.from(files).slice(0, remaining);
      const nextTokens = [...draftTokens];
      const nextPreview = { ...previewByPendingId };

      for (const file of toAdd) {
        let toSend = file;
        try {
          toSend = await compressShowcaseForUpload(file);
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          setUploadStatus(msg);
          return;
        }
        const id = crypto.randomUUID();
        nextPreview[id] = URL.createObjectURL(toSend);
        nextTokens.push({ kind: "pending", id, file: toSend });
      }
      setPreviewByPendingId(nextPreview);
      setDraftTokens(nextTokens);
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  }

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

  const lightboxSrc =
    lightbox?.kind === "server"
      ? showcaseImageUrl(handle, slug, lightbox.index, cacheBust)
      : lightbox?.kind === "pending"
        ? lightbox.src
        : null;

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
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-2">
                  <p className="shrink-0 text-sm font-medium text-muted-foreground">对话截图</p>
                  {isAuthor && !showcaseEditMode ? (
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      className="shrink-0"
                      onClick={() => enterShowcaseEditMode()}
                    >
                      编辑截图
                    </Button>
                  ) : null}
                  {isAuthor && showcaseEditMode ? (
                    <div className="flex flex-wrap items-center gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={uploading}
                        onClick={() => cancelShowcaseEditMode()}
                      >
                        取消
                      </Button>
                      <Button type="button" size="sm" disabled={uploading} onClick={() => saveShowcaseEdits()}>
                        {uploading ? "…" : "保存截图"}
                      </Button>
                      <div className="relative">
                        <input
                          type="file"
                          multiple
                          accept="image/png,image/jpeg,image/gif,image/webp"
                          className="absolute inset-0 cursor-pointer opacity-0 disabled:cursor-not-allowed"
                          disabled={uploading || draftTokens.length >= MAX_SHOWCASE_IMAGES}
                          aria-label="添加展示图"
                          title="添加展示图"
                          onChange={onPickShowcaseImages}
                        />
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          className="pointer-events-none gap-1"
                          disabled={uploading || draftTokens.length >= MAX_SHOWCASE_IMAGES}
                        >
                          <ImagePlus className="size-4" aria-hidden />
                          添加图片
                          {draftTokens.length > 0 ? ` (${draftTokens.length}/${MAX_SHOWCASE_IMAGES})` : ""}
                        </Button>
                      </div>
                    </div>
                  ) : null}
                </div>
                {!showcaseEditMode && imageCount > 2 ? (
                  <div className="flex shrink-0 gap-1 self-start sm:self-center">
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

              {hasGallery || (isAuthor && showcaseEditMode) ? (
                <div className="relative">
                  {isAuthor && showcaseEditMode ? (
                    draftTokens.length > 0 ? (
                      <EditShowcaseGrid
                        handle={handle}
                        slug={slug}
                        cacheBust={cacheBust}
                        draftTokens={draftTokens}
                        onChangeDraft={setDraftTokens}
                        previewByPendingId={previewByPendingId}
                        onRemoveToken={removeDraftToken}
                        onOpenLightbox={openLightboxFromToken}
                      />
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        在上方「添加图片」上传截图（单张最大约 2 MiB）。
                      </p>
                    )
                  ) : hasGallery ? (
                    <VisitorGallery
                      handle={handle}
                      slug={slug}
                      imageCount={imageCount}
                      cacheBust={cacheBust}
                      onOpenLightbox={(idx) => setLightbox({ kind: "server", index: idx })}
                      scrollRef={scrollRef}
                    />
                  ) : null}
                </div>
              ) : isAuthor && !showcaseEditMode ? (
                <p className="text-sm italic text-muted-foreground">尚未上传截图。点「编辑截图」添加。</p>
              ) : null}

              {uploadStatus ? (
                <p
                  className={`text-sm ${uploadStatus.includes("成功") || uploadStatus.startsWith("已") ? "text-muted-foreground" : "text-destructive"}`}
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
          className={cn(
            "!fixed !inset-0 !left-0 !top-0 !h-[100dvh] !max-h-[100dvh] !w-screen !max-w-none !translate-x-0 !translate-y-0",
            "!rounded-none border-0 bg-black/88 p-0 pt-14 pb-3 shadow-none sm:!max-w-none sm:pt-16 sm:pb-4",
            "flex flex-col items-center justify-center gap-0 text-white",
            "[&_[data-slot=dialog-close]_button]:text-white [&_[data-slot=dialog-close]_button]:hover:bg-white/10"
          )}
          showCloseButton
        >
          {lightboxSrc ? (
            <div className="flex h-[calc(100dvh-3.75rem)] w-full max-w-[100vw] items-center justify-center px-2 sm:h-[calc(100dvh-4.5rem)] sm:px-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={lightboxSrc}
                alt=""
                className="max-h-full max-w-full object-contain shadow-2xl ring-1 ring-white/15"
              />
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  );
}

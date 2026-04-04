"use client";

import { compressAvatarForUpload } from "@/lib/compress-avatar-client";
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
import { restrictToHorizontalAxis } from "@dnd-kit/modifiers";
import {
  SortableContext,
  arrayMove,
  horizontalListSortingStrategy,
  sortableKeyboardCoordinates,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { ChevronLeft, ChevronRight, GripVertical, ImagePlus, Pencil, Trash2, ZoomIn } from "lucide-react";
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

/** 展示图定高（px）；约 1:1 时三张并排 ≈ 3*h + gap，可落入常见首屏宽度。 */
const GALLERY_H_PX = 176;
/** 最大宽高比 width / height（防止过于扁宽） */
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

type SortableTileProps = {
  handle: string;
  slug: string;
  serverIndex: number;
  cacheBust: number;
  isAuthor: boolean;
  onOpenLightbox: (serverIndex: number) => void;
  onRemove: (serverIndex: number) => void;
  sortableId: string;
  aspectByServerIndex: Record<number, number>;
  onMeasured: (serverIndex: number, width: number, height: number) => void;
};

function SortableShowcaseTile({
  handle,
  slug,
  serverIndex,
  cacheBust,
  isAuthor,
  onOpenLightbox,
  onRemove,
  sortableId,
  aspectByServerIndex,
  onMeasured,
}: SortableTileProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: sortableId,
  });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : undefined,
  };

  const ar = aspectByServerIndex[serverIndex];
  const wPx = boxWidthPx(ar);

  return (
    <figure
      ref={setNodeRef}
      style={style}
      className={cn(
        "group relative shrink-0 snap-start snap-always overflow-hidden rounded-xl bg-muted shadow-inner ring-1 ring-border/50",
        isDragging && "opacity-90 shadow-lg ring-2 ring-primary/50"
      )}
    >
      <div
        className="relative flex flex-col"
        style={{ width: wPx, maxWidth: `${GALLERY_H_PX * MAX_W_TO_H}px` }}
      >
        {isAuthor ? (
          <button
            type="button"
            className="touch-none flex h-9 shrink-0 cursor-grab items-center justify-center gap-1 border-b border-border/60 bg-muted/80 text-muted-foreground active:cursor-grabbing"
            aria-label="拖拽排序"
            {...attributes}
            {...listeners}
          >
            <GripVertical className="size-4" aria-hidden />
            <span className="text-[10px] font-medium uppercase tracking-wide">拖拽</span>
          </button>
        ) : null}
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
        {isAuthor ? (
          <div className="flex justify-end border-t border-border/60 bg-muted/40 px-1 py-1">
            <Button
              type="button"
              size="icon-sm"
              variant="destructive"
              className="size-8 shadow"
              aria-label="删除"
              onClick={(e) => {
                e.stopPropagation();
                onRemove(serverIndex);
              }}
            >
              <Trash2 className="size-4" />
            </Button>
          </div>
        ) : null}
      </div>
    </figure>
  );
}

type StaticTileProps = {
  handle: string;
  slug: string;
  serverIndex: number;
  cacheBust: number;
  isAuthor: boolean;
  onOpenLightbox: (serverIndex: number) => void;
  onRemove: (serverIndex: number) => void;
  aspectByServerIndex: Record<number, number>;
  onMeasured: (serverIndex: number, width: number, height: number) => void;
};

function StaticShowcaseTile({
  handle,
  slug,
  serverIndex,
  cacheBust,
  isAuthor,
  onOpenLightbox,
  onRemove,
  aspectByServerIndex,
  onMeasured,
}: StaticTileProps) {
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
        {isAuthor ? (
          <div className="flex justify-end border-t border-border/60 bg-muted/40 px-1 py-1">
            <Button
              type="button"
              size="icon-sm"
              variant="destructive"
              className="size-8 shadow"
              aria-label="删除"
              onClick={(e) => {
                e.stopPropagation();
                onRemove(serverIndex);
              }}
            >
              <Trash2 className="size-4" />
            </Button>
          </div>
        ) : null}
      </div>
    </figure>
  );
}

type GalleryProps = {
  handle: string;
  slug: string;
  imageCount: number;
  cacheBust: number;
  onOpenLightbox: (serverIndex: number) => void;
  onRemove: (serverIndex: number) => void;
  onReorder: (order: number[]) => Promise<boolean>;
  scrollRef: React.RefObject<HTMLDivElement | null>;
};

function AuthorSortableGallery({
  handle,
  slug,
  imageCount,
  cacheBust,
  onOpenLightbox,
  onRemove,
  onReorder,
  scrollRef,
}: GalleryProps) {
  const [orderedIds, setOrderedIds] = useState<number[]>(() =>
    Array.from({ length: imageCount }, (_, i) => i)
  );
  const [aspectByServerIndex, setAspectByServerIndex] = useState<Record<number, number>>({});
  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const measure = useCallback((serverIndex: number, w: number, h: number) => {
    if (h <= 0 || w <= 0) return;
    const r = w / h;
    setAspectByServerIndex((prev) => (prev[serverIndex] === r ? prev : { ...prev, [serverIndex]: r }));
  }, []);

  const sortableIds = useMemo(() => orderedIds.map((sid) => `img-${sid}`), [orderedIds]);

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

    const previous = orderedIds;
    const next = arrayMove(orderedIds, oldIndex, newIndex);
    setOrderedIds(next);
    void (async () => {
      const ok = await onReorder(next);
      if (!ok) setOrderedIds(previous);
    })();
  }

  function onDragCancel() {
    setActiveId(null);
  }

  const activeServerIndex =
    activeId && activeId.startsWith("img-") ? Number.parseInt(activeId.slice(4), 10) : null;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      modifiers={[restrictToHorizontalAxis]}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onDragCancel={onDragCancel}
    >
      <div className="relative -mx-4 sm:-mx-6">
        <div
          ref={scrollRef}
          className={cn(
            "flex snap-x snap-mandatory gap-3 overflow-x-auto scroll-smooth pb-2 pl-6 pr-4 sm:pl-8 sm:pr-6",
            "[-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          )}
        >
          <SortableContext items={sortableIds} strategy={horizontalListSortingStrategy}>
            {orderedIds.map((serverIndex) => (
              <SortableShowcaseTile
                key={`img-${serverIndex}`}
                handle={handle}
                slug={slug}
                serverIndex={serverIndex}
                cacheBust={cacheBust}
                isAuthor
                sortableId={`img-${serverIndex}`}
                onOpenLightbox={onOpenLightbox}
                onRemove={onRemove}
                aspectByServerIndex={aspectByServerIndex}
                onMeasured={measure}
              />
            ))}
          </SortableContext>
        </div>
      </div>
      <DragOverlay dropAnimation={null}>
        {activeServerIndex !== null && !Number.isNaN(activeServerIndex) ? (
          <div
            className="pointer-events-none overflow-hidden rounded-xl bg-muted shadow-2xl ring-2 ring-primary/40"
            style={{ width: boxWidthPx(aspectByServerIndex[activeServerIndex]) }}
          >
            <div className="flex h-9 items-center justify-center border-b border-border/60 bg-muted/80 text-[10px] text-muted-foreground">
              排序中…
            </div>
            <div className="relative bg-muted/60" style={{ height: GALLERY_H_PX }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={showcaseImageUrl(handle, slug, activeServerIndex, cacheBust)}
                alt=""
                className="size-full object-cover"
                draggable={false}
              />
            </div>
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}

function VisitorGallery({
  handle,
  slug,
  imageCount,
  cacheBust,
  onOpenLightbox,
  scrollRef,
}: Pick<
  GalleryProps,
  "handle" | "slug" | "imageCount" | "cacheBust" | "onOpenLightbox" | "scrollRef"
> & { onRemove?: never }) {
  const [aspectByServerIndex, setAspectByServerIndex] = useState<Record<number, number>>({});
  const measure = useCallback((serverIndex: number, w: number, h: number) => {
    if (h <= 0 || w <= 0) return;
    const r = w / h;
    setAspectByServerIndex((prev) => (prev[serverIndex] === r ? prev : { ...prev, [serverIndex]: r }));
  }, []);

  return (
    <div className="relative -mx-4 sm:-mx-6">
      <div
        ref={scrollRef}
        className={cn(
          "flex snap-x snap-mandatory gap-3 overflow-x-auto scroll-smooth pb-2 pl-6 pr-4 sm:pl-8 sm:pr-6",
          "[-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        )}
      >
        {Array.from({ length: imageCount }, (_, i) => (
          <StaticShowcaseTile
            key={i}
            handle={handle}
            slug={slug}
            serverIndex={i}
            cacheBust={cacheBust}
            isAuthor={false}
            onOpenLightbox={onOpenLightbox}
            onRemove={() => {}}
            aspectByServerIndex={aspectByServerIndex}
            onMeasured={measure}
          />
        ))}
      </div>
    </div>
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
  const [lightbox, setLightbox] = useState<number | null>(null);
  const [mdOpen, setMdOpen] = useState(false);
  const [mdValue, setMdValue] = useState(initialShowcaseMd ?? "");
  const [mdError, setMdError] = useState<string | null>(null);
  const [mdSaving, setMdSaving] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [imageCount, setImageCount] = useState(initialImageCount);
  const [cacheBust, setCacheBust] = useState(0);

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

  async function onReorder(order: number[]): Promise<boolean> {
    setUploadStatus(null);
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
      return false;
    }
    setCacheBust((n) => n + 1);
    router.refresh();
    return true;
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
      setCacheBust((n) => n + 1);
      router.refresh();
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  }

  async function removeImage(serverIndex: number) {
    setUploadStatus(null);
    const res = await fetch(
      `/api/packs/${encodeURIComponent(handle)}/${encodeURIComponent(slug)}/showcase-image`,
      {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ index: serverIndex }),
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
      if (prev === serverIndex) return null;
      if (prev > serverIndex) return prev - 1;
      return prev;
    });
    setCacheBust((n) => n + 1);
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
              {isAuthor ? " 图片可拖拽排序。" : null}
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
                  {isAuthor ? (
                    <AuthorSortableGallery
                      key={imageCount}
                      handle={handle}
                      slug={slug}
                      imageCount={imageCount}
                      cacheBust={cacheBust}
                      onOpenLightbox={(idx) => setLightbox(idx)}
                      onRemove={removeImage}
                      onReorder={onReorder}
                      scrollRef={scrollRef}
                    />
                  ) : (
                    <VisitorGallery
                      handle={handle}
                      slug={slug}
                      imageCount={imageCount}
                      cacheBust={cacheBust}
                      onOpenLightbox={(idx) => setLightbox(idx)}
                      scrollRef={scrollRef}
                    />
                  )}
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
                src={showcaseImageUrl(handle, slug, lightbox, cacheBust)}
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

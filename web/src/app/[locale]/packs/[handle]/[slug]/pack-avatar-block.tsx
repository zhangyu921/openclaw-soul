"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

import { cn } from "@/lib/utils";

import AvatarUpload from "./avatar-upload";

export default function PackAvatarBlock({
  handle,
  slug,
  hasAvatar,
  isAuthor,
}: {
  handle: string;
  slug: string;
  hasAvatar: boolean;
  isAuthor: boolean;
}) {
  const t = useTranslations("packDetail");
  const [cacheBust, setCacheBust] = useState(0);
  const encH = encodeURIComponent(handle);
  const encS = encodeURIComponent(slug);
  const base = `/api/packs/${encH}/${encS}/avatar`;
  const src = cacheBust ? `${base}?v=${cacheBust}` : base;

  return (
    <div className="group relative mx-auto shrink-0 sm:mx-0">
      <div className="size-28 shrink-0 overflow-hidden rounded-2xl bg-muted shadow-inner ring-1 ring-border/60 sm:size-32">
        {hasAvatar ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={cacheBust}
            src={src}
            alt=""
            className="size-full object-cover"
          />
        ) : (
          <div className="flex size-full items-center justify-center bg-gradient-to-br from-accent/50 to-secondary text-xs text-muted-foreground">
            {t("noAvatar")}
          </div>
        )}
      </div>
      {isAuthor ? (
        <div
          className={cn(
            "absolute -right-2 -top-2 z-10 transition-opacity duration-200",
            hasAvatar
              ? "opacity-100 sm:pointer-events-none sm:opacity-0 sm:group-hover:pointer-events-auto sm:group-hover:opacity-100 sm:focus-within:pointer-events-auto sm:focus-within:opacity-100"
              : "opacity-100"
          )}
        >
          <AvatarUpload
            handle={handle}
            slug={slug}
            onUploaded={() => setCacheBust(Date.now())}
          />
        </div>
      ) : null}
    </div>
  );
}

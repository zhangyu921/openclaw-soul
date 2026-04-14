"use client";

import { useMemo, useState } from "react";

import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type HomePack = {
  id: string;
  slug: string;
  title: string;
  summary: string | null;
  avatarRelPath: string | null;
  packFilePaths: string[];
  author: { handle: string | null };
};

type HomePackGalleryCopy = {
  searchPlaceholder: string;
  tagsLabel: string;
  allTags: string;
  clearFilters: string;
  noResultsTitle: string;
  noResultsDescription: string;
  noAvatar: string;
  noSummary: string;
};

const TAG_RULES: Array<{ id: string; label: string; test: RegExp }> = [
  { id: "soul", label: "SOUL", test: /(^|\/)SOUL\.md$/i },
  { id: "identity", label: "IDENTITY", test: /(^|\/)IDENTITY\.md$/i },
  { id: "agents", label: "AGENTS", test: /(^|\/)AGENTS\.md$/i },
  { id: "memory", label: "MEMORY", test: /(^|\/)MEMORY\.md$/i },
];

function deriveTags(paths: string[]): string[] {
  return TAG_RULES.filter((rule) => paths.some((p) => rule.test.test(p))).map((rule) => rule.id);
}

function packMatchesKeyword(pack: HomePack, query: string): boolean {
  if (!query) return true;
  const q = query.toLowerCase();
  const haystack = `${pack.title}\n${pack.summary ?? ""}\n${pack.slug}\n${pack.author.handle ?? ""}`.toLowerCase();
  return haystack.includes(q);
}

export function HomePackGallery({ packs, copy }: { packs: HomePack[]; copy: HomePackGalleryCopy }) {
  const [keyword, setKeyword] = useState("");
  const [tag, setTag] = useState<string>("all");

  const packsWithTags = useMemo(
    () =>
      packs.map((p) => ({
        ...p,
        tags: deriveTags(p.packFilePaths),
      })),
    [packs]
  );

  const tagCounts = useMemo(() => {
    const map = new Map<string, number>();
    for (const p of packsWithTags) {
      for (const t of p.tags) {
        map.set(t, (map.get(t) ?? 0) + 1);
      }
    }
    return map;
  }, [packsWithTags]);

  const visibleTagRules = TAG_RULES.filter((rule) => (tagCounts.get(rule.id) ?? 0) > 0);

  const filtered = useMemo(() => {
    const q = keyword.trim();
    return packsWithTags.filter((p) => {
      const keywordOk = packMatchesKeyword(p, q);
      const tagOk = tag === "all" || p.tags.includes(tag);
      return keywordOk && tagOk;
    });
  }, [keyword, packsWithTags, tag]);

  const hasActiveFilters = keyword.trim().length > 0 || tag !== "all";

  return (
    <section className="space-y-4">
      <div className="rounded-xl border border-border/60 bg-muted/20 p-3 sm:p-4">
        <div className="flex flex-col gap-3">
          <Input
            value={keyword}
            onChange={(e) => setKeyword(e.currentTarget.value)}
            placeholder={copy.searchPlaceholder}
            aria-label={copy.searchPlaceholder}
            className="h-9"
          />
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-medium text-muted-foreground">{copy.tagsLabel}</span>
            <Button
              size="sm"
              variant={tag === "all" ? "secondary" : "outline"}
              onClick={() => setTag("all")}
              className="h-7"
            >
              {copy.allTags}
            </Button>
            {visibleTagRules.map((rule) => (
              <Button
                key={rule.id}
                size="sm"
                variant={tag === rule.id ? "secondary" : "outline"}
                onClick={() => setTag(rule.id)}
                className="h-7"
              >
                {rule.label} ({tagCounts.get(rule.id) ?? 0})
              </Button>
            ))}
            {hasActiveFilters ? (
              <Button size="sm" variant="ghost" onClick={() => { setKeyword(""); setTag("all"); }} className="h-7">
                {copy.clearFilters}
              </Button>
            ) : null}
          </div>
        </div>
      </div>

      {filtered.length === 0 ? (
        <Card className="mx-auto max-w-md border-dashed text-center shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">{copy.noResultsTitle}</CardTitle>
            <CardDescription>{copy.noResultsDescription}</CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <div className="columns-1 gap-(--pin-gap) sm:columns-2 lg:columns-3 *:mb-(--pin-gap)">
          {filtered.map((p) => {
            const h = p.author.handle!;
            const encH = encodeURIComponent(h);
            const encS = encodeURIComponent(p.slug);
            return (
              <Link key={p.id} href={`/packs/${h}/${p.slug}`} className="block break-inside-avoid">
                <Card className="card-pinterest gap-0 overflow-hidden border-0 pt-0 ring-1 ring-border/80 hover:ring-primary/25">
                  <div className="relative aspect-4/3 w-full overflow-hidden bg-muted">
                    {p.avatarRelPath ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={`/api/packs/${encH}/${encS}/avatar`}
                        alt=""
                        className="size-full object-cover transition-transform duration-500 hover:scale-105"
                      />
                    ) : (
                      <div className="flex size-full items-center justify-center bg-linear-to-br from-accent/40 to-secondary text-sm text-muted-foreground">
                        {copy.noAvatar}
                      </div>
                    )}
                  </div>
                  <CardHeader className="border-0 px-4 pb-2 pt-3">
                    <CardTitle className="line-clamp-2 text-base leading-snug">{p.title}</CardTitle>
                    <CardDescription className="font-mono text-xs">
                      {h}/{p.slug}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <p
                      className={cn(
                        "text-sm",
                        p.summary?.trim()
                          ? "line-clamp-3 text-muted-foreground"
                          : "line-clamp-2 italic text-muted-foreground/80"
                      )}
                    >
                      {p.summary?.trim() ? p.summary.trim() : copy.noSummary}
                    </p>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </section>
  );
}

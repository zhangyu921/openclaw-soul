import { Link } from "@/i18n/navigation";

/**
 * GitHub-style fork lineage for Souls forked from another listing (author-visible).
 */
export default function PackForkFromTip({
  intro,
  forkedFromHandle,
  forkedFromSlug,
  sourceLinkable,
}: {
  intro: string;
  forkedFromHandle: string;
  forkedFromSlug: string;
  sourceLinkable: boolean;
}) {
  const refText = `${forkedFromHandle}/${forkedFromSlug}`;
  return (
    <div className="mb-5 rounded-lg border border-border/60 bg-muted/25 px-3 py-2 text-sm text-muted-foreground">
      <span>{intro} </span>
      {sourceLinkable ? (
        <Link
          className="font-mono text-foreground underline-offset-4 hover:text-primary hover:underline"
          href={`/packs/${encodeURIComponent(forkedFromHandle)}/${encodeURIComponent(forkedFromSlug)}`}
        >
          {refText}
        </Link>
      ) : (
        <span className="font-mono text-foreground/90">{refText}</span>
      )}
    </div>
  );
}

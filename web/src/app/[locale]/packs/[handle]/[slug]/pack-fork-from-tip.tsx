import { Link } from "@/i18n/navigation";

/**
 * Subtle fork lineage (author-visible), pairs with top nav row.
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
    <p className="text-right text-xs leading-snug text-muted-foreground/75">
      <span className="whitespace-nowrap">{intro} </span>
      {sourceLinkable ? (
        <Link
          className="break-all font-mono text-[0.8125rem] text-muted-foreground/90 underline-offset-2 hover:text-foreground/80 hover:underline"
          href={`/packs/${encodeURIComponent(forkedFromHandle)}/${encodeURIComponent(forkedFromSlug)}`}
        >
          {refText}
        </Link>
      ) : (
        <span className="break-all font-mono text-[0.8125rem] text-muted-foreground/85">
          {refText}
        </span>
      )}
    </p>
  );
}

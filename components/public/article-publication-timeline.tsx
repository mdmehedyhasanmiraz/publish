import { formatPublicationDate } from "@/lib/articles/submission-type-label";

export function ArticlePublicationTimeline(props: {
  submittedAt: string | null | undefined;
  revisedAt: string | null | undefined;
  acceptedAt: string | null | undefined;
  publishedAt: string | null | undefined;
}) {
  const rows: { label: string; value: string | null }[] = [
    { label: "Submitted", value: formatPublicationDate(props.submittedAt) },
    { label: "Revised", value: formatPublicationDate(props.revisedAt) },
    { label: "Accepted", value: formatPublicationDate(props.acceptedAt) },
    { label: "Published", value: formatPublicationDate(props.publishedAt) },
  ];

  const any = rows.some((r) => r.value);
  if (!any) return null;

  return (
    <div className="mt-4 border-t border-border pt-3">
      <p className="text-[0.65rem] font-semibold uppercase tracking-wide text-muted-foreground">Article history</p>
      <dl className="mt-2 grid gap-1.5 text-xs sm:grid-cols-2">
        {rows.map(({ label, value }) =>
          value ? (
            <div key={label} className="flex flex-wrap gap-x-2 gap-y-0.5">
              <dt className="font-medium text-foreground">{label}</dt>
              <dd className="text-muted-foreground">{value}</dd>
            </div>
          ) : null,
        )}
      </dl>
    </div>
  );
}

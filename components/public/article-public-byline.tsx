import {
  buildPublicArticleAuthorByline,
  type PublicArticleAuthorRow,
} from "@/lib/articles/public-article-authors";

function OrcidIconSmall() {
  return (
    <span className="inline-flex align-middle" aria-hidden>
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" className="h-3 w-3 shrink-0" role="img">
        <title>ORCID</title>
        <path
          fill="#A6CE39"
          d="M128 0C57.3 0 0 57.3 0 128s57.3 128 128 128 128-57.3 128-128S198.7 0 128 0zM78.4 182.7V73.3h19.5v109.4H78.4zm9.8-120.4c-6.3 0-11.4-5.1-11.4-11.4s5.1-11.4 11.4-11.4 11.4 5.1 11.4 11.4-5.1 11.4-11.4 11.4zm91.4 120.4h-19.5v-53.4c0-12.8-.2-29.2-17.8-29.2-17.8 0-20.5 13.9-20.5 28.2v54.4h-19.5V73.3h18.7v14.9h.3c2.6-5 8.9-12.4 21.8-12.4 23.4 0 27.7 15.4 27.7 35.5v71.4z"
        />
      </svg>
    </span>
  );
}

function CorrespondingMark() {
  return (
    <sup className="ml-0.5 align-super text-[0.7em] text-muted-foreground" title="Corresponding author">
      <span aria-hidden className="inline-block translate-y-px">
        ✉
      </span>
      <span className="sr-only"> (corresponding author)</span>
    </sup>
  );
}

export function ArticlePublicByline(props: { authors: PublicArticleAuthorRow[] }) {
  const { segments, footnotes } = buildPublicArticleAuthorByline(props.authors);
  if (segments.length === 0) return null;

  return (
    <div className="space-y-3 text-sm leading-relaxed text-foreground">
      <p className="text-[0.95rem] leading-snug">
        {segments.map((seg, i) => (
          <span key={`${seg.displayName}-${i}`}>
            {i > 0 ? <span className="text-muted-foreground">, </span> : null}
            <span className="font-medium">{seg.displayName}</span>
            {seg.affiliationSuperscripts.length > 0 ? (
              <sup className="ml-px align-super text-[0.7em] font-normal text-muted-foreground">
                {seg.affiliationSuperscripts.join(",")}
              </sup>
            ) : null}
            {seg.isCorresponding ? <CorrespondingMark /> : null}
            {seg.orcidHref ? (
              <a
                href={seg.orcidHref}
                target="_blank"
                rel="noopener noreferrer"
                className="ml-1 inline-flex align-middle opacity-90 transition-opacity hover:opacity-100"
                title="ORCID profile"
              >
                <OrcidIconSmall />
                <span className="sr-only"> ORCID profile</span>
              </a>
            ) : null}
          </span>
        ))}
      </p>
      {footnotes.length > 0 ? (
        <ol className="list-none space-y-1.5 pl-0 text-xs text-muted-foreground">
          {footnotes.map((fn) => (
            <li key={fn.n} className="flex gap-2">
              <span className="inline-block min-w-[1.25rem] shrink-0 font-medium tabular-nums text-foreground">{fn.n}.</span>
              <span>{fn.text}</span>
            </li>
          ))}
        </ol>
      ) : null}
    </div>
  );
}

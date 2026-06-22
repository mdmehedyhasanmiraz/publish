"use client";

import { useState, useRef, useEffect } from "react";
import {
  buildPublicArticleAuthorByline,
  type PublicArticleAuthorRow,
  formatAffiliationFootnoteText,
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
      <span aria-hidden className="inline-block translate-y-px text-teal-600">
        ✉
      </span>
      <span className="sr-only"> (corresponding author)</span>
    </sup>
  );
}

export function ArticlePublicByline(props: { authors: PublicArticleAuthorRow[] }) {
  const { segments, footnotes } = buildPublicArticleAuthorByline(props.authors);
  const [activeAuthorIndex, setActiveAuthorIndex] = useState<number | null>(null);
  const popoverRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        setActiveAuthorIndex(null);
      }
    }

    if (activeAuthorIndex !== null) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [activeAuthorIndex]);

  if (segments.length === 0) return null;

  return (
    <div className="space-y-3 text-sm leading-relaxed text-foreground">
      <div className="flex flex-wrap items-center gap-x-2 gap-y-3 text-[0.95rem] leading-snug">
        {segments.map((seg, i) => {
          const cleanOrcidId = seg.author.orcid_id
            ?.replace(/^https?:\/\/(www\.)?orcid\.org\//i, "")
            ?.replace(/^\/+/, "")
            ?.trim();

          return (
            <div key={`${seg.displayName}-${i}`} className="relative inline-flex items-center">
              {i > 0 ? <span className="mr-2 text-muted-foreground">,</span> : null}
              
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveAuthorIndex(activeAuthorIndex === i ? null : i);
                }}
                className="font-semibold text-slate-800 hover:text-teal-600 transition-colors cursor-pointer border-b border-dotted border-slate-300 hover:border-teal-500 pb-0.5"
                title="Click to view affiliations and details"
              >
                {seg.displayName}
              </button>

              {seg.affiliationSuperscripts.length > 0 ? (
                <sup className="ml-0.5 align-super text-[0.68em] font-medium text-slate-500">
                  {seg.affiliationSuperscripts.join(",")}
                </sup>
              ) : null}

              {seg.isCorresponding ? <CorrespondingMark /> : null}

              {seg.orcidHref && cleanOrcidId ? (
                <a
                  href={seg.orcidHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="ml-1 inline-flex align-middle hover:opacity-85 transition-opacity"
                  title="View ORCID Profile"
                >
                  <img
                    src="/logos/logo-orcid.png"
                    alt="ORCID iD"
                    className="h-3.5 w-3.5 shrink-0 align-middle inline-block"
                  />
                  <span className="sr-only"> ORCID profile</span>
                </a>
              ) : null}

              {/* Popover Card */}
              {activeAuthorIndex === i && (
                <div
                  ref={popoverRef}
                  className="absolute left-0 top-full z-[100] mt-2 w-80 rounded-xl border border-slate-200 bg-white p-4 shadow-xl text-left text-xs font-normal text-slate-600 animate-in fade-in slide-in-from-top-2 duration-200"
                >
                  <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-2.5">
                    <div className="space-y-1">
                      <h4 className="font-bold text-slate-900 text-sm leading-tight">
                        {seg.displayName}
                      </h4>
                      {seg.author.email && (
                        <a
                          href={`mailto:${seg.author.email}`}
                          className="text-teal-600 hover:underline break-all block"
                        >
                          {seg.author.email}
                        </a>
                      )}
                    </div>
                    {seg.isCorresponding && (
                      <span className="shrink-0 rounded-md bg-teal-50 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-teal-700 border border-teal-100">
                        Corresponding
                      </span>
                    )}
                  </div>

                  <div className="space-y-2.5 pt-3">
                    <div>
                      <p className="font-semibold text-slate-800 mb-1">Affiliation(s):</p>
                      {seg.author.affiliations && seg.author.affiliations.length > 0 ? (
                        <ul className="list-disc pl-4 space-y-1">
                          {seg.author.affiliations.map((af, idx) => (
                            <li key={idx} className="leading-relaxed text-slate-600">
                              {formatAffiliationFootnoteText(af, seg.author)}
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-slate-400 italic">No affiliations listed</p>
                      )}
                    </div>

                    {seg.author.credit_roles && seg.author.credit_roles.length > 0 && (
                      <div className="border-t border-slate-100 pt-2.5">
                        <p className="font-semibold text-slate-800 mb-1">CReDiT Roles:</p>
                        <p className="text-slate-500 leading-relaxed">
                          {seg.author.credit_roles.join(", ")}
                        </p>
                      </div>
                    )}

                    {seg.orcidHref && (
                      <div className="border-t border-slate-100 pt-2.5">
                        <p className="font-semibold text-slate-800 mb-1">ORCID ID:</p>
                        <a
                          href={seg.orcidHref}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 text-teal-600 hover:underline font-mono text-[10px]"
                        >
                          <img
                            src="/logos/logo-orcid.png"
                            alt="ORCID iD"
                            className="h-3.5 w-3.5 shrink-0"
                          />
                          {cleanOrcidId}
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {footnotes.length > 0 && (
        <ol className="list-none space-y-1 pl-0 text-xs text-muted-foreground border-t border-slate-100 pt-2">
          {footnotes.map((fn) => (
            <li key={fn.n} className="flex gap-2">
              <span className="inline-block min-w-[1rem] shrink-0 font-medium tabular-nums text-slate-500">
                {fn.n}.
              </span>
              <span>{fn.text}</span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

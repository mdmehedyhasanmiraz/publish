"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useRouter } from "next/navigation";

type Journal = {
  id: string;
  name: string;
  slug: string;
  submission_areas: string[] | null;
  submission_types: string[] | null;
};
type InitialProfile = Record<string, string | null> | null;
type InitialAffiliation = {
  institution_name: string | null;
  department: string | null;
  position_title: string | null;
  city: string | null;
  country_code: string | null;
  start_date: string | null;
  end_date: string | null;
  is_primary: boolean | null;
};
type AuthorAffiliation = {
  institution_name: string;
  department: string;
  position_title: string;
  city: string;
  country_code: string;
  start_date: string;
  end_date: string;
  is_primary: boolean;
};
type AuthorRow = {
  salutation: string;
  first_name: string;
  middle_name: string;
  last_name: string;
  suffix: string;
  display_name: string;
  email: string;
  alternate_email: string;
  phone: string;
  whatsapp: string;
  orcid_id: string;
  scopus_author_id: string;
  wos_researcher_id: string;
  google_scholar_url: string;
  loop_profile_url: string;
  publons_url: string;
  address_line1: string;
  address_line2: string;
  city: string;
  state_region: string;
  postal_code: string;
  country_code: string;
  affiliations: AuthorAffiliation[];
  account_status: "linked" | "pending_signup";
  is_corresponding_author: boolean;
};
type UploadedRow = { id: string; kind: string; description: string; path: string; mime: string | null };

const fileKinds = [
  { value: "manuscript", label: "Manuscript" },
  { value: "blinded_manuscript", label: "Blinded manuscript" },
  { value: "cover_letter", label: "Cover letter" },
  { value: "figure", label: "Figure" },
  { value: "table", label: "Table" },
  { value: "supplementary_data", label: "Supplementary data" },
];
const steps = ["Journal, area and type", "Files upload", "Author affiliations", "Other details", "Review & submit"];

const MAX_CORRESPONDING_AUTHORS = 3;

const emptyAffiliation = (): AuthorAffiliation => ({
  institution_name: "",
  department: "",
  position_title: "",
  city: "",
  country_code: "",
  start_date: "",
  end_date: "",
  is_primary: false,
});
const emptyAuthor = (): AuthorRow => ({
  salutation: "",
  first_name: "",
  middle_name: "",
  last_name: "",
  suffix: "",
  display_name: "",
  email: "",
  alternate_email: "",
  phone: "",
  whatsapp: "",
  orcid_id: "",
  scopus_author_id: "",
  wos_researcher_id: "",
  google_scholar_url: "",
  loop_profile_url: "",
  publons_url: "",
  address_line1: "",
  address_line2: "",
  city: "",
  state_region: "",
  postal_code: "",
  country_code: "",
  affiliations: [emptyAffiliation()],
  account_status: "pending_signup",
  is_corresponding_author: false,
});

function normalizeAuthorsFromStorage(rows: AuthorRow[]): AuthorRow[] {
  const withFlags = rows.map((a) => ({
    ...emptyAuthor(),
    ...a,
    affiliations: Array.isArray(a.affiliations) && a.affiliations.length ? a.affiliations : [emptyAffiliation()],
    is_corresponding_author: Boolean(a.is_corresponding_author),
  }));
  if (withFlags.length && !withFlags.some((a) => a.is_corresponding_author)) {
    return withFlags.map((a, i) => (i === 0 ? { ...a, is_corresponding_author: true } : a));
  }
  return withFlags;
}

export function SubmissionWizardForm({
  journals,
  initialProfile,
  initialAffiliations,
  initialSubmission,
  initialFiles,
  workflowStatus,
  revisionVersionNumber,
  reviewerFeedbackToAuthor,
}: {
  journals: Journal[];
  initialProfile: InitialProfile;
  initialAffiliations: InitialAffiliation[];
  initialSubmission?: {
    id: string;
    journal_id: string;
    area: string | null;
    submission_type: string | null;
    title: string | null;
    abstract: string | null;
    supplementary_data_link: string | null;
    submission_notes: string | null;
    author_affiliations: unknown;
    current_version_id: string | null;
  } | null;
  initialFiles?: UploadedRow[];
  workflowStatus?: string | null;
  revisionVersionNumber?: number | null;
  reviewerFeedbackToAuthor?: string | null;
}) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const isRevisionRequested = workflowStatus === "revision_requested";
  const [pending, startTransition] = useTransition();
  const [filePending, startFileTransition] = useTransition();
  const [message, setMessage] = useState("");
  const [step, setStep] = useState(1);
  const [journalId, setJournalId] = useState(initialSubmission?.journal_id ?? journals[0]?.id ?? "");
  const [area, setArea] = useState(initialSubmission?.area ?? "");
  const [submissionType, setSubmissionType] = useState(initialSubmission?.submission_type ?? "");
  const [submissionId, setSubmissionId] = useState(initialSubmission?.id ?? "");
  const [submissionVersionId, setSubmissionVersionId] = useState(initialSubmission?.current_version_id ?? "");
  const [fileKind, setFileKind] = useState("manuscript");
  const [fileDescription, setFileDescription] = useState("");
  const [pickedFile, setPickedFile] = useState<File | null>(null);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedRow[]>(initialFiles ?? []);
  const [title, setTitle] = useState(initialSubmission?.title ?? "");
  const [abstractText, setAbstractText] = useState(initialSubmission?.abstract ?? "");
  const [supplementaryDataLink, setSupplementaryDataLink] = useState(initialSubmission?.supplementary_data_link ?? "");
  const [submissionNotes, setSubmissionNotes] = useState(initialSubmission?.submission_notes ?? "");
  const [manuscriptExtractionStatus, setManuscriptExtractionStatus] = useState<
    "idle" | "loading" | "done" | "error"
  >("idle");
  const [manuscriptExtractionNote, setManuscriptExtractionNote] = useState<string | null>(null);
  const [authors, setAuthors] = useState<AuthorRow[]>(() => {
    if (
      Array.isArray(initialSubmission?.author_affiliations) &&
      (initialSubmission?.author_affiliations as AuthorRow[]).length
    ) {
      return normalizeAuthorsFromStorage(initialSubmission?.author_affiliations as AuthorRow[]);
    }
    return [
      {
        ...emptyAuthor(),
        salutation: initialProfile?.salutation ?? "",
        first_name: initialProfile?.first_name ?? "",
        middle_name: initialProfile?.middle_name ?? "",
        last_name: initialProfile?.last_name ?? "",
        suffix: initialProfile?.suffix ?? "",
        display_name: initialProfile?.display_name ?? "",
        email: initialProfile?.email ?? "",
        alternate_email: initialProfile?.alternate_email ?? "",
        phone: initialProfile?.phone ?? "",
        whatsapp: initialProfile?.whatsapp ?? "",
        orcid_id: initialProfile?.orcid_id ?? "",
        scopus_author_id: initialProfile?.scopus_author_id ?? "",
        wos_researcher_id: initialProfile?.wos_researcher_id ?? "",
        google_scholar_url: initialProfile?.google_scholar_url ?? "",
        loop_profile_url: initialProfile?.loop_profile_url ?? "",
        publons_url: initialProfile?.publons_url ?? "",
        address_line1: initialProfile?.address_line1 ?? "",
        address_line2: initialProfile?.address_line2 ?? "",
        city: initialProfile?.city ?? "",
        state_region: initialProfile?.state_region ?? "",
        postal_code: initialProfile?.postal_code ?? "",
        country_code: initialProfile?.country_code ?? "",
        affiliations: initialAffiliations.length
          ? initialAffiliations.map((a) => ({
              institution_name: a.institution_name ?? "",
              department: a.department ?? "",
              position_title: a.position_title ?? "",
              city: a.city ?? "",
              country_code: a.country_code ?? "",
              start_date: a.start_date ?? "",
              end_date: a.end_date ?? "",
              is_primary: Boolean(a.is_primary),
            }))
          : [emptyAffiliation()],
        account_status: initialProfile?.email ? "linked" : "pending_signup",
        is_corresponding_author: true,
      },
    ];
  });
  const [editingAuthorIdx, setEditingAuthorIdx] = useState(0);

  const selectedJournal = journals.find((j) => j.id === journalId);
  const areaOptions = selectedJournal?.submission_areas?.length ? selectedJournal.submission_areas : ["General"];
  const typeOptions = selectedJournal?.submission_types?.length
    ? selectedJournal.submission_types
    : ["original_research", "review"];

  async function saveStep1AndContinue() {
    let res: { ok?: boolean; message?: string; submissionId?: string; created?: boolean };
    try {
      const fetchRes = await fetch("/api/author/submissions/wizard/step1", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          submissionId: submissionId || null,
          journalId,
          area,
          submissionType,
          title: title || "Untitled submission",
          abstract: abstractText,
        }),
      });
      try {
        res = (await fetchRes.json()) as typeof res;
      } catch {
        return setMessage("Invalid response from server.");
      }
    } catch {
      return setMessage("Network error while saving.");
    }
    if (!res.ok || !res.submissionId) return setMessage(res.message ?? "Could not save.");
    const sid = res.submissionId;
    if (res.created || !submissionVersionId) {
      const { data: versions } = await supabase
        .from("submission_versions")
        .select("id, version_number")
        .eq("submission_id", sid)
        .order("version_number", { ascending: false })
        .limit(1);
      setSubmissionVersionId(versions?.[0]?.id ?? "");
    }
    setSubmissionId(sid);
    setStep(2);
    setMessage(res.message ?? "Step 1 saved.");
    router.refresh();
  }

  async function saveStep2AndContinue() {
    let res: { ok: boolean; message?: string };
    try {
      const fetchRes = await fetch("/api/author/submissions/wizard/step2", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ submissionId }),
      });
      try {
        res = (await fetchRes.json()) as typeof res;
      } catch {
        setMessage("Invalid response from server.");
        return;
      }
    } catch {
      setMessage("Network error while saving.");
      return;
    }
    if (!res.ok) {
      setMessage(res.message ?? "Could not save.");
      return;
    }
    setMessage(res.message ?? "Step 2 saved.");
    setStep(3);
    router.refresh();
  }

  async function uploadCurrentFile() {
    if (!submissionId || !submissionVersionId) return setMessage("Create a draft first.");
    if (!pickedFile) return setMessage("Pick a file first.");
    const safeName = pickedFile.name.replaceAll(/[^a-zA-Z0-9._-]+/g, "-");
    const objectPath = `submissions/${submissionId}/${submissionVersionId}/${crypto.randomUUID()}-${safeName}`;
    const { error: upErr } = await supabase.storage.from("data").upload(objectPath, pickedFile, {
      cacheControl: "3600",
      upsert: false,
      contentType: pickedFile.type || undefined,
    });
    if (upErr) return setMessage(upErr.message);
    let res: { ok: boolean; message?: string; fileId?: string };
    try {
      const fetchRes = await fetch("/api/author/submissions/files/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          submissionId,
          submissionVersionId,
          fileKind,
          description: fileDescription,
          storagePath: objectPath,
          mimeType: pickedFile.type || null,
        }),
      });
      try {
        res = (await fetchRes.json()) as typeof res;
      } catch {
        return setMessage("Invalid response from server.");
      }
    } catch {
      return setMessage("Network error while registering file.");
    }
    if (!res.ok) return setMessage(res.message ?? "Could not register uploaded file.");
    setUploadedFiles((prev) => [
      { id: res.fileId ?? crypto.randomUUID(), kind: fileKind, description: fileDescription, path: objectPath, mime: pickedFile.type || null },
      ...prev,
    ]);
    setPickedFile(null);
    setFileDescription("");
    setMessage("File uploaded.");
  }

  async function removeUploadedFileRow(f: { id: string; path: string }) {
    let res: { ok: boolean; message?: string };
    try {
      const fetchRes = await fetch("/api/author/submissions/files/remove", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileId: f.id, storagePath: f.path }),
      });
      try {
        res = (await fetchRes.json()) as typeof res;
      } catch {
        setMessage("Invalid response from server.");
        return;
      }
    } catch {
      setMessage("Network error while removing file.");
      return;
    }
    if (res.ok) setUploadedFiles((prev) => prev.filter((row) => row.id !== f.id));
    setMessage(res.message ?? (res.ok ? "File removed." : "Could not remove file."));
  }

  async function saveAuthorsStep3() {
    let res: { ok: boolean; message?: string };
    try {
      const fetchRes = await fetch("/api/author/submissions/wizard/step-3", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ submissionId, authors }),
      });
      try {
        res = (await fetchRes.json()) as typeof res;
      } catch {
        setMessage("Invalid response from server.");
        return;
      }
    } catch {
      setMessage("Network error while saving authors.");
      return;
    }
    setMessage(res.message ?? (res.ok ? "Step 3 saved." : "Could not save."));
    if (res.ok) {
      setStep(4);
      router.refresh();
    }
  }

  async function saveDetailsStep4() {
    let res: { ok: boolean; message?: string };
    try {
      const fetchRes = await fetch("/api/author/submissions/wizard/step4", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          submissionId,
          title,
          abstract: abstractText,
          supplementaryDataLink,
          submissionNotes,
        }),
      });
      try {
        res = (await fetchRes.json()) as typeof res;
      } catch {
        setMessage("Invalid response from server.");
        return;
      }
    } catch {
      setMessage("Network error while saving details.");
      return;
    }
    setMessage(res.message ?? (res.ok ? "Saved." : "Could not save."));
    if (res.ok) setStep(5);
  }

  async function submitWizard() {
    let res: { ok?: boolean; message?: string };
    try {
      const fetchRes = await fetch("/api/author/submissions/wizard/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ submissionId }),
      });
      try {
        res = (await fetchRes.json()) as typeof res;
      } catch {
        setMessage("Invalid response from server.");
        return;
      }
    } catch {
      setMessage("Network error while submitting.");
      return;
    }
    setMessage(res.message ?? (res.ok ? "Submitted." : "Could not submit."));
    if (res.ok) {
      router.push(isRevisionRequested ? "/author/revision-required" : "/author/submissions");
      router.refresh();
    }
  }

  async function autofillAuthorFromEmail(index: number) {
    const email = authors[index]?.email?.trim();
    if (!email) return;
    let res: {
      ok: boolean;
      message?: string;
      exists?: boolean;
      profile?: Record<string, string | null>;
      affiliations?: Array<Record<string, string | boolean | null>>;
    };
    try {
      const fetchRes = await fetch("/api/author/submissions/wizard/lookup-author", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      try {
        res = (await fetchRes.json()) as typeof res;
      } catch {
        return setMessage("Invalid response from server.");
      }
    } catch {
      return setMessage("Network error while looking up author.");
    }
    if (!res.ok) return setMessage(res.message ?? "Could not load author profile.");
    if (!res.exists) {
      setAuthors((prev) => prev.map((a, i) => (i === index ? { ...a, account_status: "pending_signup" } : a)));
      return setMessage(res.message ?? "No account found yet.");
    }
    const p = res.profile as Record<string, string | null>;
    const afs = (res.affiliations ?? []) as Array<Record<string, string | boolean | null>>;
    setAuthors((prev) =>
      prev.map((a, i) =>
        i === index
          ? {
              ...a,
              salutation: p.salutation ?? "",
              first_name: p.first_name ?? a.first_name,
              middle_name: p.middle_name ?? "",
              last_name: p.last_name ?? a.last_name,
              suffix: p.suffix ?? "",
              display_name: p.display_name ?? "",
              email: p.email ?? a.email,
              alternate_email: p.alternate_email ?? "",
              phone: p.phone ?? "",
              whatsapp: p.whatsapp ?? "",
              orcid_id: p.orcid_id ?? "",
              scopus_author_id: p.scopus_author_id ?? "",
              wos_researcher_id: p.wos_researcher_id ?? "",
              google_scholar_url: p.google_scholar_url ?? "",
              loop_profile_url: p.loop_profile_url ?? "",
              publons_url: p.publons_url ?? "",
              address_line1: p.address_line1 ?? "",
              address_line2: p.address_line2 ?? "",
              city: p.city ?? "",
              state_region: p.state_region ?? "",
              postal_code: p.postal_code ?? "",
              country_code: p.country_code ?? "",
              affiliations: afs.length
                ? afs.map((af) => ({
                    institution_name: String(af.institution_name ?? ""),
                    department: String(af.department ?? ""),
                    position_title: String(af.position_title ?? ""),
                    city: String(af.city ?? ""),
                    country_code: String(af.country_code ?? ""),
                    start_date: String(af.start_date ?? ""),
                    end_date: String(af.end_date ?? ""),
                    is_primary: Boolean(af.is_primary),
                  }))
                : [emptyAffiliation()],
              account_status: "linked",
              is_corresponding_author: a.is_corresponding_author,
            }
          : a,
      ),
    );
    setMessage(res.message ?? "Author profile loaded.");
  }

  function toggleCorrespondingAuthor(index: number, checked: boolean) {
    setAuthors((prev) => {
      if (checked) {
        const count = prev.filter((a) => a.is_corresponding_author).length;
        if (count >= MAX_CORRESPONDING_AUTHORS) {
          setMessage(`At most ${MAX_CORRESPONDING_AUTHORS} corresponding authors are allowed.`);
          return prev;
        }
      }
      setMessage("");
      return prev.map((a, i) => (i === index ? { ...a, is_corresponding_author: checked } : a));
    });
  }

  const lastExtractedManuscriptKeyRef = useRef<string | null>(null);

  useEffect(() => {
    lastExtractedManuscriptKeyRef.current = null;
  }, [submissionId]);

  useEffect(() => {
    if (step !== 4 || !submissionId) return;

    const manuscriptRow = uploadedFiles.find((f) => f.kind === "manuscript" || f.kind === "blinded_manuscript");
    const key = manuscriptRow ? `${submissionId}:${manuscriptRow.path}` : `${submissionId}:no-manuscript`;

    if (lastExtractedManuscriptKeyRef.current === key) return;
    lastExtractedManuscriptKeyRef.current = key;

    let cancelled = false;
    setManuscriptExtractionStatus("loading");
    setManuscriptExtractionNote(null);

    void (async () => {
      let res: {
        ok: boolean;
        skipped?: boolean;
        title?: string;
        abstract?: string;
        message?: string;
      };
      try {
        const fetchRes = await fetch("/api/author/submissions/wizard/extract-metadata", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ submissionId }),
        });
        try {
          res = (await fetchRes.json()) as typeof res;
        } catch {
          if (!cancelled) {
            setManuscriptExtractionStatus("error");
            setManuscriptExtractionNote("Invalid response from server.");
          }
          return;
        }
      } catch {
        if (!cancelled) {
          setManuscriptExtractionStatus("error");
          setManuscriptExtractionNote("Network error while reading manuscript.");
        }
        return;
      }
      if (cancelled) return;
      if (res.ok) {
        if (res.skipped) {
          setManuscriptExtractionStatus("idle");
          setManuscriptExtractionNote(res.message ?? null);
        } else {
          if (res.title?.trim()) setTitle(res.title.trim());
          if (res.abstract?.trim()) setAbstractText(res.abstract.trim());
          setManuscriptExtractionStatus("done");
          setManuscriptExtractionNote(
            "Title and abstract were filled from your manuscript. You can edit them before saving.",
          );
        }
      } else {
        setManuscriptExtractionStatus("error");
        setManuscriptExtractionNote(res.message ?? "Could not read the manuscript.");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [step, submissionId, uploadedFiles]);

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">
          <Link href="/author/submissions" className="text-primary hover:underline">
            ← Back to submissions
          </Link>
        </p>
        {submissionId && !isRevisionRequested ? (
          <Button
            type="button"
            variant="outline"
            className="border-red-200 text-red-700 hover:bg-red-50 hover:text-red-800"
            disabled={pending}
            onClick={() => {
              if (!confirm("Delete this draft submission permanently? This cannot be undone.")) return;
              startTransition(async () => {
                try {
                  const res = await fetch("/api/author/submissions/delete", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ submissionId }),
                  });
                  let json: { ok?: boolean; message?: string };
                  try {
                    json = (await res.json()) as { ok?: boolean; message?: string };
                  } catch {
                    setMessage("Invalid response from server.");
                    return;
                  }
                  if (!json.ok) {
                    setMessage(json.message ?? "Could not delete submission.");
                    return;
                  }
                  router.push("/author/submissions");
                  router.refresh();
                } catch {
                  setMessage("Network error while deleting.");
                }
              });
            }}
          >
            Delete submission
          </Button>
        ) : null}
      </div>
      <div className="rounded-lg border bg-white p-5">
        <h1 className="text-2xl font-semibold">
          {isRevisionRequested ? "Revise your submission" : "New submission"}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {isRevisionRequested ? (
            <>
              Complete the steps and submit your revision
              {revisionVersionNumber != null ? (
                <>
                  {" "}
                  (manuscript version <span className="font-medium text-foreground">{revisionVersionNumber}</span>)
                </>
              ) : null}
              . Upload replaces files for this version only.
            </>
          ) : (
            "Complete all 5 steps and submit your manuscript."
          )}
        </p>
        <div className="mt-5 h-2 w-full overflow-hidden rounded-full bg-muted">
          <div className="h-full rounded-full bg-primary transition-all duration-300" style={{ width: `${((step - 1) / (steps.length - 1)) * 100}%` }} />
        </div>
        <ol className="mt-4 grid grid-cols-1 gap-2 md:grid-cols-5">
          {steps.map((s, idx) => {
            const n = idx + 1;
            const active = step === n;
            const done = step > n;
            return (
              <li key={s} className="min-w-0">
                <div className={`flex items-start gap-3 rounded-md border px-3 py-2 ${active ? "border-primary bg-primary/5" : done ? "border-primary/30 bg-primary/[0.03]" : "border-border bg-background"}`}>
                  <span className={`inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-xs font-semibold ${done ? "border-primary bg-primary text-primary-foreground" : active ? "border-primary bg-primary/10 text-primary" : "border-border bg-background text-muted-foreground"}`}>{done ? "✓" : n}</span>
                  <span className="min-w-0">
                    <span className={`block text-xs font-semibold ${active || done ? "text-foreground" : "text-muted-foreground"}`}>Step {n}</span>
                    <span className={`mt-1 block text-xs ${active ? "text-primary" : done ? "text-foreground/80" : "text-muted-foreground"}`}>{s}</span>
                  </span>
                </div>
              </li>
            );
          })}
        </ol>
      </div>

      {step === 1 && (
        <section className="rounded-lg border bg-white p-5">
          <h2 className="text-lg font-semibold">Step 1: Choose area/field and submission type</h2>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <div className="grid gap-2">
              <Label>Journal</Label>
              <select
                value={journalId}
                onChange={(e) => {
                  setJournalId(e.target.value);
                  setArea("");
                  setSubmissionType("");
                }}
                className="flex h-10 w-full rounded-md border border-input bg-white px-3 py-2 text-sm"
              >
                {journals.map((j) => (
                  <option key={j.id} value={j.id}>
                    {j.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid gap-2">
              <Label>Area / Field</Label>
              <select
                value={area}
                onChange={(e) => setArea(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-white px-3 py-2 text-sm"
              >
                <option value="">Select area</option>
                {areaOptions.map((v) => (
                  <option key={v} value={v}>
                    {v}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid gap-2">
              <Label>Submission type</Label>
              <select
                value={submissionType}
                onChange={(e) => setSubmissionType(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-white px-3 py-2 text-sm"
              >
                <option value="">Select type</option>
                {typeOptions.map((v) => (
                  <option key={v} value={v}>
                    {v}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid gap-2">
              <Label>Working title</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} />
            </div>
            <div className="grid gap-2 md:col-span-2">
              <Label>Abstract (optional)</Label>
              <Textarea rows={4} value={abstractText} onChange={(e) => setAbstractText(e.target.value)} />
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button
              disabled={pending || !journalId || !area || !submissionType}
              onClick={() => startTransition(saveStep1AndContinue)}
            >
              {pending ? "Saving..." : "Save and continue"}
            </Button>
          </div>
        </section>
      )}
      {step === 2 && (
        <section className="rounded-lg border bg-white p-5">
          <h2 className="text-lg font-semibold">Step 2: Upload files</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Upload each file with the button below. Your progress is saved when you continue.
          </p>
          <div
            className="mt-4 rounded-md border-2 border-dashed p-6 text-center"
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              const f = e.dataTransfer.files?.[0];
              if (f) setPickedFile(f);
            }}
          >
            <p className="text-sm text-muted-foreground">Drag and drop a file here, or choose manually.</p>
            <Input className="mt-3" type="file" onChange={(e) => setPickedFile(e.target.files?.[0] ?? null)} />
          </div>
          <div className="mt-4 grid gap-4 md:grid-cols-3">
            <div className="grid gap-2">
              <Label>File type</Label>
              <select
                value={fileKind}
                onChange={(e) => setFileKind(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-white px-3 py-2 text-sm"
              >
                {fileKinds.map((k) => (
                  <option key={k.value} value={k.value}>
                    {k.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid gap-2 md:col-span-2">
              <Label>Description</Label>
              <Input value={fileDescription} onChange={(e) => setFileDescription(e.target.value)} />
            </div>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button disabled={filePending || !pickedFile} onClick={() => startFileTransition(uploadCurrentFile)}>
              {filePending ? "Uploading..." : "Upload file"}
            </Button>
            <Button disabled={pending || !submissionId} onClick={() => startTransition(saveStep2AndContinue)}>
              {pending ? "Saving..." : "Save and continue"}
            </Button>
            <Button variant="outline" onClick={() => setStep(1)}>
              Back
            </Button>
          </div>
          <div className="mt-4 overflow-x-auto rounded border">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-left">
                <tr>
                  <th className="px-3 py-2">Type</th>
                  <th className="px-3 py-2">Description</th>
                  <th className="px-3 py-2">Path</th>
                  <th className="px-3 py-2">Action</th>
                </tr>
              </thead>
              <tbody>
                {uploadedFiles.length ? (
                  uploadedFiles.map((f) => (
                    <tr key={f.id} className="border-t">
                      <td className="px-3 py-2">{f.kind}</td>
                      <td className="px-3 py-2">{f.description || "—"}</td>
                      <td className="px-3 py-2 text-xs text-muted-foreground">{f.path}</td>
                      <td className="px-3 py-2">
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={filePending || pending}
                          onClick={() => startFileTransition(async () => {
                            await removeUploadedFileRow(f);
                          })}
                        >
                          Remove
                        </Button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td className="px-3 py-3 text-muted-foreground" colSpan={4}>
                      No uploaded files yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {step === 3 && (
        <section className="rounded-lg border bg-white p-5">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-lg font-semibold">Step 3: Authors and affiliations</h2>
            <Button variant="outline" onClick={() => { setAuthors((prev) => [...prev, emptyAuthor()]); setEditingAuthorIdx(authors.length); }}>Add author</Button>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            If an author has an account, data will auto-fill from profiles and profile_affiliations. Mark up to{" "}
            {MAX_CORRESPONDING_AUTHORS} corresponding authors (journal contact points).
          </p>
          <div className="mt-4 grid gap-3">
            {authors.map((a, idx) => (
              <div key={`${a.email}-${idx}`} className="rounded-md border p-3">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-medium">
                      {a.first_name || a.last_name
                        ? `${a.first_name} ${a.last_name}`.trim()
                        : `Author ${idx + 1}`}
                    </p>
                    <p className="text-sm text-muted-foreground">{a.email || "No email yet"}</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <label className="flex cursor-pointer items-center gap-2 text-sm">
                      <Checkbox
                        checked={a.is_corresponding_author}
                        onCheckedChange={(v) => toggleCorrespondingAuthor(idx, v === true)}
                      />
                      <span>Corresponding author</span>
                    </label>
                    <span
                      className={`rounded px-2 py-1 text-xs ${
                        a.account_status === "linked" ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"
                      }`}
                    >
                      {a.account_status === "linked" ? "Account linked" : "Pending signup confirmation"}
                    </span>
                    <Button size="sm" variant="outline" onClick={() => setEditingAuthorIdx(idx)}>
                      Edit
                    </Button>
                    {authors.length > 1 ? (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setAuthors((prev) => prev.filter((_, i) => i !== idx));
                          setEditingAuthorIdx((prev) => (prev >= idx ? Math.max(0, prev - 1) : prev));
                        }}
                      >
                        Remove
                      </Button>
                    ) : null}
                  </div>
                </div>
              </div>
            ))}
          </div>
          {authors[editingAuthorIdx] ? <div className="mt-5 rounded-md border bg-muted/20 p-4"><h3 className="text-sm font-semibold">Edit author details</h3>
          <div className="mt-3 flex items-center gap-2">
            <Checkbox
              id={`author-corresponding-${editingAuthorIdx}`}
              checked={authors[editingAuthorIdx].is_corresponding_author}
              onCheckedChange={(v) => toggleCorrespondingAuthor(editingAuthorIdx, v === true)}
            />
            <Label htmlFor={`author-corresponding-${editingAuthorIdx}`} className="cursor-pointer text-sm font-normal">
              Corresponding author (max {MAX_CORRESPONDING_AUTHORS})
            </Label>
          </div>
          <div className="mt-3 grid gap-3 md:grid-cols-4"><Input placeholder="Salutation" value={authors[editingAuthorIdx].salutation} onChange={(e) => setAuthors((prev) => prev.map((a, i) => i === editingAuthorIdx ? { ...a, salutation: e.target.value } : a))} /><Input placeholder="First name" value={authors[editingAuthorIdx].first_name} onChange={(e) => setAuthors((prev) => prev.map((a, i) => i === editingAuthorIdx ? { ...a, first_name: e.target.value } : a))} /><Input placeholder="Middle name" value={authors[editingAuthorIdx].middle_name} onChange={(e) => setAuthors((prev) => prev.map((a, i) => i === editingAuthorIdx ? { ...a, middle_name: e.target.value } : a))} /><Input placeholder="Last name" value={authors[editingAuthorIdx].last_name} onChange={(e) => setAuthors((prev) => prev.map((a, i) => i === editingAuthorIdx ? { ...a, last_name: e.target.value } : a))} /><Input placeholder="Email" value={authors[editingAuthorIdx].email} onBlur={() => startTransition(async () => autofillAuthorFromEmail(editingAuthorIdx))} onChange={(e) => setAuthors((prev) => prev.map((a, i) => i === editingAuthorIdx ? { ...a, email: e.target.value } : a))} /><Input placeholder="Alternate email" value={authors[editingAuthorIdx].alternate_email} onChange={(e) => setAuthors((prev) => prev.map((a, i) => i === editingAuthorIdx ? { ...a, alternate_email: e.target.value } : a))} /><Input placeholder="Phone" value={authors[editingAuthorIdx].phone} onChange={(e) => setAuthors((prev) => prev.map((a, i) => i === editingAuthorIdx ? { ...a, phone: e.target.value } : a))} /><Input placeholder="ORCID ID" value={authors[editingAuthorIdx].orcid_id} onChange={(e) => setAuthors((prev) => prev.map((a, i) => i === editingAuthorIdx ? { ...a, orcid_id: e.target.value } : a))} /></div><div className="mt-3 grid gap-3 md:grid-cols-3"><Input placeholder="Address line 1" value={authors[editingAuthorIdx].address_line1} onChange={(e) => setAuthors((prev) => prev.map((a, i) => i === editingAuthorIdx ? { ...a, address_line1: e.target.value } : a))} /><Input placeholder="City" value={authors[editingAuthorIdx].city} onChange={(e) => setAuthors((prev) => prev.map((a, i) => i === editingAuthorIdx ? { ...a, city: e.target.value } : a))} /><Input placeholder="Country code" value={authors[editingAuthorIdx].country_code} onChange={(e) => setAuthors((prev) => prev.map((a, i) => i === editingAuthorIdx ? { ...a, country_code: e.target.value } : a))} /></div><div className="mt-4 rounded border bg-white p-3"><div className="flex items-center justify-between"><h4 className="text-sm font-semibold">Affiliations</h4><Button size="sm" variant="outline" onClick={() => setAuthors((prev) => prev.map((a, i) => i === editingAuthorIdx ? { ...a, affiliations: [...a.affiliations, emptyAffiliation()] } : a))}>Add affiliation</Button></div><div className="mt-3 grid gap-3">{authors[editingAuthorIdx].affiliations.map((af, affIdx) => <div key={`${editingAuthorIdx}-${affIdx}`} className="rounded border p-3"><div className="grid gap-2 md:grid-cols-3"><Input placeholder="Institution / Org" value={af.institution_name} onChange={(e) => setAuthors((prev) => prev.map((a, i) => i === editingAuthorIdx ? { ...a, affiliations: a.affiliations.map((x, j) => j === affIdx ? { ...x, institution_name: e.target.value } : x) } : a))} /><Input placeholder="Department" value={af.department} onChange={(e) => setAuthors((prev) => prev.map((a, i) => i === editingAuthorIdx ? { ...a, affiliations: a.affiliations.map((x, j) => j === affIdx ? { ...x, department: e.target.value } : x) } : a))} /><Input placeholder="Position title" value={af.position_title} onChange={(e) => setAuthors((prev) => prev.map((a, i) => i === editingAuthorIdx ? { ...a, affiliations: a.affiliations.map((x, j) => j === affIdx ? { ...x, position_title: e.target.value } : x) } : a))} /></div>{authors[editingAuthorIdx].affiliations.length > 1 ? <div className="mt-2 flex justify-end"><Button size="sm" variant="outline" onClick={() => setAuthors((prev) => prev.map((a, i) => i === editingAuthorIdx ? { ...a, affiliations: a.affiliations.filter((_, j) => j !== affIdx) } : a))}>Remove affiliation</Button></div> : null}</div>)}</div></div></div> : null}
          <div className="mt-3 flex gap-2">
            <Button disabled={pending || !submissionId} onClick={() => startTransition(saveAuthorsStep3)}>
              {pending ? "Saving..." : "Save and continue"}
            </Button>
            <Button variant="outline" onClick={() => setStep(2)}>
              Back
            </Button>
          </div>
        </section>
      )}

      {step === 4 && (
        <section className="rounded-lg border bg-white p-5">
          <h2 className="text-lg font-semibold">Step 4: Other details</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Title and abstract are filled automatically from your latest DOCX manuscript when you open this step
            (best-effort). Legacy .doc files must be entered manually or converted to .docx.
          </p>
          {manuscriptExtractionStatus === "loading" ? (
            <p className="mt-2 text-sm text-primary">Reading title and abstract from your manuscript…</p>
          ) : null}
          {manuscriptExtractionNote ? (
            <p
              className={`mt-2 text-sm ${manuscriptExtractionStatus === "error" ? "text-red-600" : "text-muted-foreground"}`}
            >
              {manuscriptExtractionNote}
            </p>
          ) : null}
          <div className="mt-4 grid gap-4">
            <div className="grid gap-2">
              <Label>Title</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label>Abstract</Label>
              <Textarea rows={6} value={abstractText} onChange={(e) => setAbstractText(e.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label>Supplementary data link</Label>
              <Input
                placeholder="https://..."
                value={supplementaryDataLink}
                onChange={(e) => setSupplementaryDataLink(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label>Notes to editor</Label>
              <Textarea rows={4} value={submissionNotes} onChange={(e) => setSubmissionNotes(e.target.value)} />
            </div>
          </div>
          <div className="mt-3 flex gap-2">
            <Button disabled={pending || !submissionId} onClick={() => startTransition(saveDetailsStep4)}>
              {pending ? "Saving..." : "Save and continue"}
            </Button>
            <Button variant="outline" onClick={() => setStep(3)}>
              Back
            </Button>
          </div>
        </section>
      )}
      {step === 5 && (
        <section className="rounded-lg border bg-white p-5">
          <h2 className="text-lg font-semibold">Step 5: Review and submit</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Check your files, metadata, authors and then submit to editorial workflow.
          </p>
          <div className="mt-4 rounded-md border bg-muted/30 p-4 text-sm">
            <p className="font-medium">Corresponding authors (max {MAX_CORRESPONDING_AUTHORS})</p>
            <ul className="mt-2 list-inside list-disc text-muted-foreground">
              {authors.some((x) => x.is_corresponding_author) ? (
                authors
                  .map((x, i) => ({ x, i }))
                  .filter(({ x }) => x.is_corresponding_author)
                  .map(({ x, i }) => (
                    <li key={`corr-${i}`}>
                      {[x.salutation, x.first_name, x.last_name].filter(Boolean).join(" ").trim() ||
                        x.email ||
                        `Author ${i + 1}`}
                    </li>
                  ))
              ) : (
                <li className="list-none text-amber-800">None selected — go back to step 3.</li>
              )}
            </ul>
          </div>
          <div className="mt-4 flex gap-2">
            <Button disabled={pending || !submissionId} onClick={() => startTransition(submitWizard)}>
              {pending ? "Submitting..." : isRevisionRequested ? "Submit revision to the journal" : "Submit to the journal"}
            </Button>
            <Button variant="outline" onClick={() => setStep(4)}>
              Back
            </Button>
          </div>
        </section>
      )}
      {message ? <p className="text-sm text-muted-foreground">{message}</p> : null}
    </div>
  );
}


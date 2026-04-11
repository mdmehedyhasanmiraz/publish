"use client";

import { useEffect, useMemo, useState } from "react";
import { flushSync } from "react-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { handlingEditorRoleBadgeClass, handlingEditorRoleLabel } from "@/lib/editor-roles";
import { cn } from "@/lib/utils";
import { ChevronDown, Loader2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  assignHandlingEditorAction,
  createPeerReviewInvitationsAction,
  loadEmailTemplatePresetAction,
  sendAuthorDecisionEmailAction,
  sendPeerReviewInvitationsAction,
} from "@/lib/actions/peer-review";
import { quickAcceptRejectSubmissionAction } from "@/lib/actions/submission-quick-decision";
import {
  defaultReviewerInviteBody,
  defaultReviewerInviteSubject,
  type AuthorDecisionMailKind,
  presetAuthorDecisionSummary,
  presetAuthorMailBody,
  presetAuthorMailSubject,
} from "@/lib/peer-review/email-defaults";

export type EditorCandidateRow = {
  user_id: string;
  email: string;
  display_name: string;
  /** Highest-precedence editorial role for display (matches RPC). */
  primary_editor_role: string;
};

export type InvitationRow = {
  id: string;
  reviewer_email: string | null;
  status: string;
  reviewer_number: number | null;
  deadline_at: string | null;
  sent_at: string | null;
};

export type PeerReviewReportForWorkflow = {
  reviewerNumber: number | null;
  reviewerEmail: string | null;
  commentsToAuthor: string;
  narrative: string;
};

type Props = {
  submissionId: string;
  canAssignEditor: boolean;
  canManagePeerReview: boolean;
  /** Platform admin or assigned handling editor only. */
  canQuickDecision: boolean;
  /**
   * On `/admin/submissions/...`, always show Accept/Reject (disabled when not allowed or status is final).
   * Default: panel only appears when `canQuickDecision` is true.
   */
  decisionPanelVariant?: "default" | "admin";
  /** Article draft linked to this submission, if any. */
  linkedArticleId: string | null;
  /** `/admin/articles` or `/editor/articles` for links after accept. */
  articlesBasePath: string;
  submission: {
    title: string;
    status: string;
    journal_id: string;
    assigned_editor_user_id: string | null;
    journals: { name: string } | null | { name: string }[];
  };
  editorCandidates: EditorCandidateRow[];
  assignedEditorLabel: string | null;
  invitations: InvitationRow[];
  peerReviewReports: PeerReviewReportForWorkflow[];
};

export function SubmissionWorkflowClient(props: Props) {
  const router = useRouter();
  const journalId = props.submission.journal_id;

  const [editorId, setEditorId] = useState(props.submission.assigned_editor_user_id ?? "");
  const [assignMsg, setAssignMsg] = useState<string | null>(null);

  useEffect(() => {
    if (props.submission.assigned_editor_user_id) {
      setEditorId(props.submission.assigned_editor_user_id);
    }
  }, [props.submission.assigned_editor_user_id]);

  const selectedCandidate = useMemo(
    () => props.editorCandidates.find((c) => c.user_id === editorId),
    [props.editorCandidates, editorId],
  );

  const [emailsRaw, setEmailsRaw] = useState("");
  const [reviewDays, setReviewDays] = useState("7");
  const [invSubject, setInvSubject] = useState(defaultReviewerInviteSubject());
  const [invBody, setInvBody] = useState(defaultReviewerInviteBody());
  const [invSaveDefault, setInvSaveDefault] = useState(false);
  const [inviteMsg, setInviteMsg] = useState<string | null>(null);
  const [templatesLoaded, setTemplatesLoaded] = useState(false);
  const [creatingInvites, setCreatingInvites] = useState(false);

  const [selectedPending, setSelectedPending] = useState<Record<string, boolean>>({});
  const [sendMsg, setSendMsg] = useState<string | null>(null);
  const [sendingInvites, setSendingInvites] = useState(false);

  const [mailKind, setMailKind] = useState<AuthorDecisionMailKind>("revision");
  const [authSubj, setAuthSubj] = useState(() => presetAuthorMailSubject("revision"));
  const [authBody, setAuthBody] = useState(() => presetAuthorMailBody("revision"));
  const [decisionSummary, setDecisionSummary] = useState(() => presetAuthorDecisionSummary("revision"));
  const [includeReviewerFeedback, setIncludeReviewerFeedback] = useState(true);
  const [authSaveDefault, setAuthSaveDefault] = useState(false);
  const [authMsg, setAuthMsg] = useState<string | null>(null);
  const [authTemplatesLoaded, setAuthTemplatesLoaded] = useState(false);
  const [sendingAuthorDecision, setSendingAuthorDecision] = useState(false);
  const [quickDecisionBusy, setQuickDecisionBusy] = useState<"accept" | "reject" | null>(null);
  const [quickDecisionMsg, setQuickDecisionMsg] = useState<string | null>(null);
  const [linkedArticleIdOverride, setLinkedArticleIdOverride] = useState<string | null>(null);

  const effectiveLinkedArticleId = linkedArticleIdOverride ?? props.linkedArticleId;

  const decisionPanelVariant = props.decisionPanelVariant ?? "default";
  const showQuickDecisionSection =
    props.canQuickDecision || decisionPanelVariant === "admin";

  const quickDecisionEligible = useMemo(() => {
    const s = props.submission.status;
    return !["accepted", "rejected", "withdrawn", "draft", "published", "production", "scheduled"].includes(s);
  }, [props.submission.status]);

  const canUseQuickDecision = props.canQuickDecision && quickDecisionEligible;

  function applyMailKindPreset(kind: AuthorDecisionMailKind) {
    setMailKind(kind);
    setAuthSubj(presetAuthorMailSubject(kind));
    setAuthBody(presetAuthorMailBody(kind));
    setDecisionSummary(presetAuthorDecisionSummary(kind));
  }

  const pendingInvites = useMemo(
    () => props.invitations.filter((i) => i.status === "pending_send"),
    [props.invitations],
  );

  async function loadReviewerTemplates() {
    const r = await loadEmailTemplatePresetAction({ templateKey: "reviewer_invite", journalId });
    if (r.ok) {
      setInvSubject(r.subject);
      setInvBody(r.body);
    }
    setTemplatesLoaded(true);
  }

  async function loadAuthorTemplates() {
    const r = await loadEmailTemplatePresetAction({ templateKey: "author_decision", journalId });
    if (r.ok) {
      setAuthSubj(r.subject);
      setAuthBody(r.body);
    }
    setAuthTemplatesLoaded(true);
  }

  return (
    <div className="mt-8 grid gap-8">
      {showQuickDecisionSection ? (
        <section className="rounded-lg border bg-white p-4">
          <h3 className="text-sm font-semibold">Decision (no email)</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Accept or reject without notifying the author by email. Accepting creates (or opens) an article draft under
            Articles so production can prepare publication. Only you (assigned editor) and platform administrators see
            this.
          </p>
          {effectiveLinkedArticleId ? (
            <p className="mt-2 text-sm">
              <Link
                href={`${props.articlesBasePath}/${effectiveLinkedArticleId}`}
                className="font-medium text-primary hover:underline"
              >
                Open article preparation →
              </Link>
            </p>
          ) : null}
          <div className="mt-3 flex flex-wrap gap-2">
            <Button
              type="button"
              variant="default"
              className="bg-emerald-700 hover:bg-emerald-800 disabled:opacity-60"
              disabled={!!quickDecisionBusy || !canUseQuickDecision}
              aria-busy={quickDecisionBusy === "accept"}
              onClick={() => {
                if (!canUseQuickDecision) return;
                if (!confirm("Accept this manuscript without sending an author email? An article draft will be created if needed.")) {
                  return;
                }
                flushSync(() => {
                  setQuickDecisionMsg(null);
                  setQuickDecisionBusy("accept");
                });
                void (async () => {
                  try {
                    const r = await quickAcceptRejectSubmissionAction({
                      submissionId: props.submissionId,
                      decision: "accept",
                    });
                    setQuickDecisionMsg(r.ok ? r.message ?? "Accepted." : r.message);
                    if (r.ok && r.articleId) {
                      setLinkedArticleIdOverride(r.articleId);
                    }
                    router.refresh();
                  } catch (e) {
                    setQuickDecisionMsg(e instanceof Error ? e.message : "Request failed.");
                  } finally {
                    setQuickDecisionBusy(null);
                  }
                })();
              }}
            >
              {quickDecisionBusy === "accept" ? (
                <>
                  <Loader2 className="mr-2 size-4 shrink-0 animate-spin" aria-hidden />
                  Accepting…
                </>
              ) : (
                "Accept manuscript"
              )}
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={!!quickDecisionBusy || !canUseQuickDecision}
              className="disabled:opacity-60"
              aria-busy={quickDecisionBusy === "reject"}
              onClick={() => {
                if (!canUseQuickDecision) return;
                if (!confirm("Reject this manuscript without sending an author email?")) {
                  return;
                }
                flushSync(() => {
                  setQuickDecisionMsg(null);
                  setQuickDecisionBusy("reject");
                });
                void (async () => {
                  try {
                    const r = await quickAcceptRejectSubmissionAction({
                      submissionId: props.submissionId,
                      decision: "reject",
                    });
                    setQuickDecisionMsg(r.ok ? r.message ?? "Rejected." : r.message);
                    router.refresh();
                  } catch (e) {
                    setQuickDecisionMsg(e instanceof Error ? e.message : "Request failed.");
                  } finally {
                    setQuickDecisionBusy(null);
                  }
                })();
              }}
            >
              {quickDecisionBusy === "reject" ? (
                <>
                  <Loader2 className="mr-2 size-4 shrink-0 animate-spin" aria-hidden />
                  Rejecting…
                </>
              ) : (
                "Reject manuscript"
              )}
            </Button>
          </div>
          {!quickDecisionEligible ? (
            <p className="mt-2 text-sm text-muted-foreground">
              Accept and reject are disabled because this submission is no longer in a state that allows this decision
              (for example, already accepted or rejected).
            </p>
          ) : null}
          {quickDecisionEligible && !props.canQuickDecision && decisionPanelVariant === "admin" ? (
            <p className="mt-2 text-sm text-muted-foreground">
              Only the assigned handling editor or a platform administrator can accept or reject here.
            </p>
          ) : null}
          {quickDecisionMsg ? <p className="mt-2 text-sm text-muted-foreground">{quickDecisionMsg}</p> : null}
        </section>
      ) : null}

      <section className="rounded-lg border bg-white p-4">
        <h3 className="text-sm font-semibold">Handling editor</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          One editor per manuscript. Choose from Editor in Chief, Managing Editor, Associate Editor, and
          Production Editor profiles (Editor in Chief, Managing Editor, or platform admin can assign).
        </p>
        <p className="mt-2 text-sm">
          Current:{" "}
          <span className="font-medium">
            {props.assignedEditorLabel ?? "— not assigned —"}
          </span>
        </p>
        {props.canAssignEditor ? (
          <form
            className="mt-3 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end"
            onSubmit={(e) => {
              e.preventDefault();
              setAssignMsg(null);
              if (!editorId) {
                setAssignMsg("Select an editor.");
                return;
              }
              void (async () => {
                try {
                  const r = await assignHandlingEditorAction(props.submissionId, editorId);
                  setAssignMsg(r.ok ? "Saved." : r.error);
                } catch (err) {
                  setAssignMsg(
                    err instanceof Error
                      ? err.message
                      : "Could not save assignment. Try again or refresh.",
                  );
                }
              })();
            }}
          >
            <div className="grid min-w-0 w-full flex-1 gap-1 sm:min-w-[min(100%,42rem)] sm:max-w-4xl">
              <Label className="text-xs">Assign to</Label>
              {props.editorCandidates.length === 0 ? (
                <div className="space-y-2">
                  <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950">
                    No editorial profiles found. Users need an{" "}
                    <strong>Editor in Chief</strong>, <strong>Managing Editor</strong>,{" "}
                    <strong>Associate Editor</strong>, or <strong>Production Editor</strong> role in their
                    profile (Admin → Users), and click <strong>Save</strong> there. Ensure profile email is filled
                    in.
                  </p>
                  <p className="text-xs text-muted-foreground">
                    If staff already have those roles saved but the list is still empty: the database must allow
                    assigners to read other users&apos; profiles. Apply pending Supabase migrations (including{" "}
                    <code className="rounded bg-muted px-1">20_profiles_select_for_handling_editor_picker.sql</code>
                    ), or sign in as a platform admin to load the list.
                  </p>
                </div>
              ) : (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      className="h-10 w-full min-w-0 justify-between gap-2 px-3 text-left font-normal"
                    >
                      <span className="flex min-w-0 flex-1 items-center gap-2 overflow-hidden">
                        {selectedCandidate ? (
                          <>
                            <span className="min-w-0 flex-1 truncate text-sm">
                              <span className="font-medium text-foreground">
                                {selectedCandidate.display_name}
                              </span>
                              <span className="text-muted-foreground">
                                {" "}
                                ({selectedCandidate.email || "no email"})
                              </span>
                            </span>
                            <Badge
                              className={cn(
                                "shrink-0 whitespace-nowrap rounded-md px-2 py-0.5 text-xs font-semibold",
                                handlingEditorRoleBadgeClass(
                                  selectedCandidate.primary_editor_role ?? "associate_editor",
                                ),
                              )}
                            >
                              {handlingEditorRoleLabel(
                                selectedCandidate.primary_editor_role ?? "associate_editor",
                              )}
                            </Badge>
                          </>
                        ) : (
                          <span className="truncate text-muted-foreground">Choose an editor…</span>
                        )}
                      </span>
                      <ChevronDown className="size-4 shrink-0 opacity-50" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent
                    className="z-50 w-[var(--radix-dropdown-menu-trigger-width)] min-w-[min(100vw-2rem,42rem)] max-w-[min(100vw-1rem,48rem)]"
                    align="start"
                  >
                    {props.editorCandidates.map((c) => {
                      const role = c.primary_editor_role ?? "associate_editor";
                      return (
                        <DropdownMenuItem
                          key={c.user_id}
                          className="flex cursor-pointer flex-row items-center gap-2 py-2 pr-2"
                          onSelect={() => setEditorId(c.user_id)}
                        >
                          <span className="min-w-0 flex-1 truncate text-sm">
                            <span className="font-medium text-foreground">{c.display_name}</span>
                            <span className="text-muted-foreground">
                              {" "}
                              ({c.email || "no email"})
                            </span>
                          </span>
                          <Badge
                            className={cn(
                              "shrink-0 whitespace-nowrap rounded-md px-2 py-0.5 text-xs font-semibold",
                              handlingEditorRoleBadgeClass(role),
                            )}
                          >
                            {handlingEditorRoleLabel(role)}
                          </Badge>
                        </DropdownMenuItem>
                      );
                    })}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
            <Button type="submit" size="sm">
              Save assignment
            </Button>
            {assignMsg ? <p className="w-full text-sm text-muted-foreground">{assignMsg}</p> : null}
          </form>
        ) : (
          <p className="mt-2 text-xs text-muted-foreground">You do not have permission to change the handling editor.</p>
        )}
      </section>

      {props.canManagePeerReview ? (
        <>
          <section className="rounded-lg border bg-white p-4">
            <h3 className="text-sm font-semibold">Invite reviewers (up to 10)</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Add one email per line. Invitations stay pending until you send them; each reviewer receives a
              separate message and link. No account is required before the invite is sent.
            </p>
            <div className="mt-3 grid gap-3">
              <div className="grid gap-1">
                <Label>Reviewer emails</Label>
                <Textarea
                  rows={4}
                  value={emailsRaw}
                  onChange={(e) => setEmailsRaw(e.target.value)}
                  placeholder={"reviewer1@university.edu\nreviewer2@institute.org"}
                />
              </div>
              <div className="grid max-w-xs gap-1">
                <Label>Default review period (days after accept)</Label>
                <Input value={reviewDays} onChange={(e) => setReviewDays(e.target.value)} type="number" min={1} max={90} />
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    void loadReviewerTemplates();
                  }}
                >
                  {templatesLoaded ? "Reload saved template" : "Load saved default template"}
                </Button>
              </div>
              <div className="grid gap-1">
                <Label>Email subject</Label>
                <Input value={invSubject} onChange={(e) => setInvSubject(e.target.value)} />
              </div>
              <div className="grid gap-1">
                <Label>Email body (placeholders: {"{{journal_name}}, {{submission_title}}, {{invite_link}}, etc."})</Label>
                <Textarea rows={10} value={invBody} onChange={(e) => setInvBody(e.target.value)} />
              </div>
              <label className="flex items-center gap-2 text-sm">
                <Checkbox checked={invSaveDefault} onCheckedChange={(v) => setInvSaveDefault(!!v)} />
                Save subject &amp; body as my default for reviewer invites
              </label>
              <Button
                type="button"
                disabled={creatingInvites}
                aria-busy={creatingInvites}
                onClick={() => {
                  flushSync(() => {
                    setInviteMsg(null);
                    setCreatingInvites(true);
                  });
                  void (async () => {
                    try {
                      const emails = emailsRaw
                        .split(/[\n,;]+/)
                        .map((s) => s.trim())
                        .filter(Boolean);
                      const r = await createPeerReviewInvitationsAction({
                        submissionId: props.submissionId,
                        emails,
                        reviewDurationDays: Number(reviewDays) || 7,
                        subject: invSubject,
                        body: invBody,
                        saveAsDefault: invSaveDefault,
                        journalId,
                      });
                      setInviteMsg(r.ok ? "Invitations created (pending send)." : r.error);
                      if (r.ok) setEmailsRaw("");
                    } catch (e) {
                      setInviteMsg(
                        e instanceof Error
                          ? e.message
                          : "Could not reach the server. Try again or refresh the page.",
                      );
                    } finally {
                      setCreatingInvites(false);
                    }
                  })();
                }}
              >
                {creatingInvites ? (
                  <>
                    <Loader2 className="size-4 shrink-0 animate-spin" aria-hidden />
                    Creating…
                  </>
                ) : (
                  "Create pending invitations"
                )}
              </Button>
              {inviteMsg ? <p className="text-sm text-muted-foreground">{inviteMsg}</p> : null}
            </div>
          </section>

          <section className="rounded-lg border bg-white p-4">
            <h3 className="text-sm font-semibold">Send pending invitations</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Sends real email to each reviewer via SMTP (configure{" "}
              <code className="rounded bg-muted px-1">SMTP_HOST</code>,{" "}
              <code className="rounded bg-muted px-1">MAIL_FROM</code>, etc. in{" "}
              <code className="rounded bg-muted px-1">.env.local</code>). The manuscript moves to peer review when
              invitations are sent successfully.
            </p>
            {pendingInvites.length ? (
              <ul className="mt-3 space-y-2">
                {pendingInvites.map((p) => (
                  <li key={p.id} className="flex items-center gap-2 text-sm">
                    <Checkbox
                      checked={!!selectedPending[p.id]}
                      onCheckedChange={(v) =>
                        setSelectedPending((prev) => ({ ...prev, [p.id]: !!v }))
                      }
                    />
                    <span>{p.reviewer_email}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-sm text-muted-foreground">No pending invitations.</p>
            )}
            <div className="mt-3 grid gap-2">
              <label className="flex items-center gap-2 text-sm">
                <Checkbox checked={invSaveDefault} onCheckedChange={(v) => setInvSaveDefault(!!v)} />
                Also save current subject/body as default when sending
              </label>
              <Button
                type="button"
                variant="secondary"
                disabled={!pendingInvites.length || sendingInvites}
                onClick={() => {
                  void (async () => {
                    setSendMsg(null);
                    setSendingInvites(true);
                    try {
                      const ids = Object.entries(selectedPending)
                        .filter(([, v]) => v)
                        .map(([k]) => k);
                      const useIds = ids.length ? ids : pendingInvites.map((p) => p.id);
                      const r = await sendPeerReviewInvitationsAction({
                        submissionId: props.submissionId,
                        invitationIds: useIds,
                        subject: invSubject,
                        body: invBody,
                        saveAsDefault: invSaveDefault,
                        journalId,
                      });
                      setSendMsg(r.ok ? "Marked as sent and emails logged." : r.error);
                      if (r.ok) setSelectedPending({});
                    } catch (e) {
                      const msg =
                        e instanceof Error ? e.message : "Request failed. Try again or refresh the page.";
                      setSendMsg(msg);
                    } finally {
                      setSendingInvites(false);
                    }
                  })();
                }}
              >
                {sendingInvites ? (
                  <>
                    <Loader2 className="mr-2 size-4 shrink-0 animate-spin" aria-hidden />
                    Sending…
                  </>
                ) : (
                  "Send selected (or all pending if none selected)"
                )}
              </Button>
              {sendMsg ? <p className="text-sm text-muted-foreground">{sendMsg}</p> : null}
            </div>
          </section>

          <section className="rounded-lg border bg-white p-4">
            <h3 className="text-sm font-semibold">Reviewer reports</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Comments to the author and confidential notes to the editor (when a report exists).
            </p>
            {props.peerReviewReports.length ? (
              <ul className="mt-3 space-y-4">
                {props.peerReviewReports.map((rep, idx) => (
                  <li key={idx} className="rounded-md border bg-muted/20 p-3 text-sm">
                    <p className="font-medium text-foreground">
                      Reviewer {rep.reviewerNumber ?? "—"}{" "}
                      <span className="font-normal text-muted-foreground">
                        ({rep.reviewerEmail ?? "—"})
                      </span>
                    </p>
                    <p className="mt-2 text-xs font-semibold uppercase text-muted-foreground">To author</p>
                    <p className="mt-1 whitespace-pre-wrap">{rep.commentsToAuthor || "—"}</p>
                    <p className="mt-3 text-xs font-semibold uppercase text-muted-foreground">To editor (confidential)</p>
                    <p className="mt-1 whitespace-pre-wrap text-muted-foreground">{rep.narrative || "—"}</p>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-sm text-muted-foreground">No completed reviewer reports yet.</p>
            )}
          </section>

          <section className="rounded-lg border bg-white p-4">
            <h3 className="text-sm font-semibold">Email author (after reviews)</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Sends to the author&apos;s profile email over SMTP (same{" "}
              <code className="rounded bg-muted px-1">SMTP_*</code> / <code className="rounded bg-muted px-1">MAIL_FROM</code>{" "}
              settings as reviewer invites). Choose the message type, edit the text, then send. The submission status is
              updated to match the decision (accept / revision required / rejected). Revision requests add a new
              manuscript version row for the author to upload into.
            </p>
            <div className="mt-3 grid gap-3">
              <div className="grid gap-1 max-w-md">
                <Label>Email type</Label>
                <select
                  className="flex h-10 w-full rounded-md border border-input bg-white px-3 py-2 text-sm"
                  value={mailKind}
                  onChange={(e) => applyMailKindPreset(e.target.value as AuthorDecisionMailKind)}
                >
                  <option value="accept">Acceptance</option>
                  <option value="revision">Revision required</option>
                  <option value="reject">Rejected</option>
                </select>
              </div>
              <Button type="button" variant="outline" size="sm" onClick={() => void loadAuthorTemplates()}>
                {authTemplatesLoaded ? "Reload saved author template" : "Load saved author template"}
              </Button>
              <div className="grid gap-1">
                <Label>Subject</Label>
                <Input value={authSubj} onChange={(e) => setAuthSubj(e.target.value)} />
              </div>
              <div className="grid gap-1">
                <Label>
                  Body (placeholders: {"{{journal_name}}, {{submission_title}}, {{decision_summary}}, {{reviewer_feedback}}"}
                  )
                </Label>
                <Textarea rows={10} value={authBody} onChange={(e) => setAuthBody(e.target.value)} />
              </div>
              <div className="grid gap-1">
                <Label>Decision summary paragraph (fills {"{{decision_summary}}"})</Label>
                <Textarea rows={4} value={decisionSummary} onChange={(e) => setDecisionSummary(e.target.value)} />
              </div>
              <label className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={includeReviewerFeedback}
                  onCheckedChange={(v) => setIncludeReviewerFeedback(!!v)}
                />
                Include reviewers&apos; comments to the author in {"{{reviewer_feedback}}"}
              </label>
              <label className="flex items-center gap-2 text-sm">
                <Checkbox checked={authSaveDefault} onCheckedChange={(v) => setAuthSaveDefault(!!v)} />
                Save as my default author message
              </label>
              <Button
                type="button"
                disabled={sendingAuthorDecision}
                aria-busy={sendingAuthorDecision}
                onClick={() => {
                  flushSync(() => {
                    setAuthMsg(null);
                    setSendingAuthorDecision(true);
                  });
                  void (async () => {
                    try {
                      const r = await sendAuthorDecisionEmailAction({
                        submissionId: props.submissionId,
                        subject: authSubj,
                        body: authBody,
                        decisionSummary,
                        saveAsDefault: authSaveDefault,
                        journalId,
                        decisionKind: mailKind,
                        includeReviewerFeedback,
                      });
                      setAuthMsg(
                        r.ok ? "Email sent to the author, status updated, and an editorial note was recorded." : r.error,
                      );
                    } catch (e) {
                      setAuthMsg(e instanceof Error ? e.message : "Request failed.");
                    } finally {
                      setSendingAuthorDecision(false);
                    }
                  })();
                }}
              >
                {sendingAuthorDecision ? (
                  <>
                    <Loader2 className="size-4 shrink-0 animate-spin" aria-hidden />
                    Sending…
                  </>
                ) : (
                  "Send author email & apply decision"
                )}
              </Button>
              {authMsg ? <p className="text-sm text-muted-foreground">{authMsg}</p> : null}
            </div>
          </section>
        </>
      ) : (
        <p className="text-sm text-muted-foreground">
          Peer-review tools are available to the assigned handling editor or platform administrators.
        </p>
      )}

      <section className="rounded-lg border bg-muted/30 p-4">
        <h3 className="text-sm font-semibold">Reviewer invitations</h3>
        <div className="mt-2 overflow-x-auto text-sm">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-b text-xs text-muted-foreground">
                <th className="py-2 pr-2">Email</th>
                <th className="py-2 pr-2">Status</th>
                <th className="py-2 pr-2">#</th>
                <th className="py-2 pr-2">Deadline</th>
              </tr>
            </thead>
            <tbody>
              {props.invitations.length ? (
                props.invitations.map((i) => (
                  <tr key={i.id} className="border-b border-border/60">
                    <td className="py-2 pr-2">{i.reviewer_email ?? "—"}</td>
                    <td className="py-2 pr-2">{i.status}</td>
                    <td className="py-2 pr-2">{i.reviewer_number ?? "—"}</td>
                    <td className="py-2 pr-2">
                      {i.deadline_at ? new Date(i.deadline_at).toLocaleString() : "—"}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="py-3 text-muted-foreground">
                    No invitations yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

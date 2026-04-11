export const REVIEWER_INVITE_PLACEHOLDERS = [
  "{{journal_name}}",
  "{{submission_title}}",
  "{{invite_link}}",
  "{{review_deadline_days}}",
  "{{reviewer_email}}",
] as const;

export const AUTHOR_DECISION_PLACEHOLDERS = [
  "{{journal_name}}",
  "{{submission_title}}",
  "{{author_email}}",
  "{{decision_summary}}",
  "{{reviewer_feedback}}",
] as const;

export type AuthorDecisionMailKind = "accept" | "revision" | "reject";

export function defaultReviewerInviteSubject() {
  return "Invitation to review for {{journal_name}}";
}

export function defaultReviewerInviteBody() {
  return `Dear colleague,

You have been invited to review a manuscript for {{journal_name}}.

Title: {{submission_title}}

Please follow this secure link to view the invitation and respond:
{{invite_link}}

If you do not yet have an account, you can create one using the same email address this message was sent to ({{reviewer_email}}). The default review period is {{review_deadline_days}} days from the date you accept.

Thank you for considering this request.

Editorial office
{{journal_name}}`;
}

export function defaultAuthorDecisionSubject() {
  return "Update on your submission to {{journal_name}}";
}

export function defaultAuthorDecisionBody() {
  return `Dear author,

We are writing regarding your submission to {{journal_name}}:

Title: {{submission_title}}

{{decision_summary}}

If you have questions, please reply to this thread or contact the journal office.

Sincerely,
Editorial office
{{journal_name}}`;
}

export function presetAuthorMailSubject(kind: AuthorDecisionMailKind) {
  switch (kind) {
    case "accept":
      return "Decision: accepted — {{submission_title}} ({{journal_name}})";
    case "revision":
      return "Revision requested — {{submission_title}} ({{journal_name}})";
    case "reject":
      return "Decision on your submission — {{submission_title}} ({{journal_name}})";
    default: {
      const _x: never = kind;
      return _x;
    }
  }
}

export function presetAuthorMailBody(kind: AuthorDecisionMailKind) {
  switch (kind) {
    case "accept":
      return `Dear author,

We are pleased to inform you that your manuscript submitted to {{journal_name}} has been accepted.

Title: {{submission_title}}

{{decision_summary}}

{{reviewer_feedback}}

Sincerely,
Editorial office
{{journal_name}}`;
    case "revision":
      return `Dear author,

Following peer review, we invite you to submit a revised version of your manuscript for {{journal_name}}.

Title: {{submission_title}}

{{decision_summary}}

Comments for your attention:
{{reviewer_feedback}}

Please upload your revised files through your author dashboard (Revision required). If you have questions, contact the journal office.

Sincerely,
Editorial office
{{journal_name}}`;
    case "reject":
      return `Dear author,

Thank you for submitting your manuscript to {{journal_name}}. After careful consideration, we are unable to accept it for publication.

Title: {{submission_title}}

{{decision_summary}}

{{reviewer_feedback}}

We appreciate your interest in the journal.

Sincerely,
Editorial office
{{journal_name}}`;
    default: {
      const _x: never = kind;
      return _x;
    }
  }
}

export function presetAuthorDecisionSummary(kind: AuthorDecisionMailKind) {
  switch (kind) {
    case "accept":
      return "The editorial team has completed peer review and recommends acceptance, subject to any minor checks from production.";
    case "revision":
      return "Please address the reviewers' comments and upload a revised manuscript and any updated supplementary files.";
    case "reject":
      return "The manuscript does not meet the journal's criteria at this time.";
    default: {
      const _x: never = kind;
      return _x;
    }
  }
}

export function applyReviewerInviteTemplate(
  subject: string,
  body: string,
  vars: {
    journalName: string;
    submissionTitle: string;
    inviteLink: string;
    reviewDeadlineDays: number;
    reviewerEmail: string;
  },
) {
  const sub = subject
    .replaceAll("{{journal_name}}", vars.journalName)
    .replaceAll("{{submission_title}}", vars.submissionTitle)
    .replaceAll("{{invite_link}}", vars.inviteLink)
    .replaceAll("{{review_deadline_days}}", String(vars.reviewDeadlineDays))
    .replaceAll("{{reviewer_email}}", vars.reviewerEmail);
  const bod = body
    .replaceAll("{{journal_name}}", vars.journalName)
    .replaceAll("{{submission_title}}", vars.submissionTitle)
    .replaceAll("{{invite_link}}", vars.inviteLink)
    .replaceAll("{{review_deadline_days}}", String(vars.reviewDeadlineDays))
    .replaceAll("{{reviewer_email}}", vars.reviewerEmail);
  return { subject: sub, body: bod };
}

export function applyAuthorDecisionTemplate(
  subject: string,
  body: string,
  vars: {
    journalName: string;
    submissionTitle: string;
    authorEmail: string;
    decisionSummary: string;
    reviewerFeedback: string;
  },
) {
  const rf = vars.reviewerFeedback.trim() || "(No reviewer comments to author were recorded.)";
  const sub = subject
    .replaceAll("{{journal_name}}", vars.journalName)
    .replaceAll("{{submission_title}}", vars.submissionTitle)
    .replaceAll("{{author_email}}", vars.authorEmail)
    .replaceAll("{{decision_summary}}", vars.decisionSummary)
    .replaceAll("{{reviewer_feedback}}", rf);
  const bod = body
    .replaceAll("{{journal_name}}", vars.journalName)
    .replaceAll("{{submission_title}}", vars.submissionTitle)
    .replaceAll("{{author_email}}", vars.authorEmail)
    .replaceAll("{{decision_summary}}", vars.decisionSummary)
    .replaceAll("{{reviewer_feedback}}", rf);
  return { subject: sub, body: bod };
}

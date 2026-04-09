export type SubmissionStatus =
  | "draft"
  | "submitted"
  | "admin_check"
  | "editor_assigned"
  | "under_review"
  | "revision_requested"
  | "revised_submission"
  | "accepted"
  | "rejected"
  | "withdrawn"
  | "production"
  | "scheduled"
  | "published";

export type Submission = {
  id: string;
  publisherId: string;
  journalId: string;
  ownerUserId: string;
  title: string;
  status: SubmissionStatus;
  currentVersion: number;
};

export type QueueJob = {
  id: string;
  type: string;
  status: "queued" | "processing" | "done" | "failed";
  data: Record<string, unknown>;
  retries: number;
  createdAt: string;
};

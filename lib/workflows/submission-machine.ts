import type { SubmissionStatus } from "@/lib/types/domain";

const transitions: Record<SubmissionStatus, SubmissionStatus[]> = {
  draft: ["submitted", "withdrawn"],
  submitted: ["admin_check", "withdrawn"],
  admin_check: ["editor_assigned", "rejected", "revision_requested"],
  editor_assigned: ["under_review", "rejected"],
  under_review: ["revision_requested", "accepted", "rejected"],
  revision_requested: ["revised_submission", "withdrawn"],
  revised_submission: ["under_review", "accepted", "rejected"],
  accepted: ["production"],
  rejected: [],
  withdrawn: [],
  production: ["scheduled", "published"],
  scheduled: ["published"],
  published: [],
};

export function assertTransition(current: SubmissionStatus, next: SubmissionStatus) {
  if (!transitions[current].includes(next)) {
    throw new Error(`Invalid transition from ${current} to ${next}`);
  }
}

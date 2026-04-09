import { randomUUID } from "crypto";
import { addQueueJob, getSubmission, insertSubmission, updateSubmission } from "@/lib/db/mock";
import { assertTransition } from "@/lib/workflows/submission-machine";
import type { QueueJob, Submission, SubmissionStatus } from "@/lib/types/domain";

async function transitionSubmission(
  submissionId: string,
  next: SubmissionStatus,
) {
  const current = await getSubmission(submissionId);
  if (!current) throw new Error("Submission not found");
  assertTransition(current.status, next);
  return updateSubmission(submissionId, { status: next });
}

export async function createSubmissionDraft(input: {
  publisherId: string;
  journalId: string;
  userId: string;
  title: string;
}): Promise<Submission> {
  return insertSubmission({
    id: randomUUID(),
    publisherId: input.publisherId,
    journalId: input.journalId,
    ownerUserId: input.userId,
    title: input.title,
    status: "draft",
    currentVersion: 1,
  });
}

export async function submitSubmission(input: { submissionId: string }) {
  const updated = await transitionSubmission(input.submissionId, "submitted");
  await enqueueJob({ type: "submission_checks", data: { submissionId: input.submissionId } });
  return updated;
}

export async function assignEditor(input: { submissionId: string }) {
  return transitionSubmission(input.submissionId, "editor_assigned");
}

export async function requestRevision(input: { submissionId: string }) {
  return transitionSubmission(input.submissionId, "revision_requested");
}

export async function publishArticle(input: { submissionId: string }) {
  await transitionSubmission(input.submissionId, "production");
  return transitionSubmission(input.submissionId, "published");
}

export async function enqueueJob(input: {
  type: string;
  data: Record<string, unknown>;
}): Promise<QueueJob> {
  return addQueueJob({
    id: randomUUID(),
    type: input.type,
    status: "queued",
    data: input.data,
    retries: 0,
    createdAt: new Date().toISOString(),
  });
}

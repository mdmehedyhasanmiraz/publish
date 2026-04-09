import type { QueueJob, Submission } from "@/lib/types/domain";

const submissions: Submission[] = [];
const jobs: QueueJob[] = [];

export async function insertSubmission(submission: Submission) {
  submissions.push(submission);
  return submission;
}

export async function updateSubmission(id: string, patch: Partial<Submission>) {
  const current = submissions.find((item) => item.id === id);
  if (!current) throw new Error("Submission not found");
  Object.assign(current, patch);
  return current;
}

export async function getSubmission(id: string) {
  return submissions.find((item) => item.id === id);
}

export async function addQueueJob(job: QueueJob) {
  jobs.push(job);
  return job;
}

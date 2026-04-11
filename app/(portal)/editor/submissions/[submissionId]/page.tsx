import { SubmissionWorkflowClient } from "@/components/submission-workflow-client";
import { loadSubmissionWorkflowPage } from "@/lib/peer-review/load-submission-workflow";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function EditorSubmissionWorkflowPage({
  params,
}: {
  params: Promise<{ submissionId: string }>;
}) {
  const { submissionId } = await params;
  const data = await loadSubmissionWorkflowPage(submissionId);

  return (
    <div>
      <Link href="/editor/queue" className="text-sm font-medium text-primary hover:underline">
        ← Editorial queue
      </Link>
      <h2 className="mt-3 text-xl font-semibold">{data.submission.title}</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Status: <span className="font-medium text-foreground">{data.submission.status}</span>
      </p>
      <SubmissionWorkflowClient
        submissionId={data.submissionId}
        canAssignEditor={data.canAssignEditor}
        canManagePeerReview={data.canManagePeerReview}
        canQuickDecision={data.canQuickDecision}
        linkedArticleId={data.linkedArticleId}
        articlesBasePath="/editor/articles"
        submission={data.submission}
        editorCandidates={data.editorCandidates}
        assignedEditorLabel={data.assignedEditorLabel}
        invitations={data.invitations}
        peerReviewReports={data.peerReviewReports}
      />
    </div>
  );
}

import type { SupabaseClient } from "@supabase/supabase-js";
import type { SubmissionFileRow } from "@/components/articles/submission-files-panel";

export async function loadSubmissionFilesForEditor(
  supabase: SupabaseClient,
  submissionId: string,
): Promise<SubmissionFileRow[]> {
  const { data: sf, error } = await supabase
    .from("submission_files")
    .select("id, file_kind, description, storage_path, submission_version_id")
    .eq("submission_id", submissionId);
  if (error || !sf?.length) return [];

  const verIds = [...new Set(sf.map((r) => r.submission_version_id as string).filter(Boolean))];
  let verMap = new Map<string, number>();
  if (verIds.length) {
    const { data: svm } = await supabase
      .from("submission_versions")
      .select("id, version_number")
      .in("id", verIds);
    verMap = new Map((svm ?? []).map((v) => [v.id as string, v.version_number as number]));
  }

  return sf.map((row) => ({
    id: row.id as string,
    file_kind: row.file_kind as string,
    description: (row.description as string | null) ?? null,
    storage_path: row.storage_path as string,
    version_number: verMap.get(row.submission_version_id as string) ?? null,
  }));
}

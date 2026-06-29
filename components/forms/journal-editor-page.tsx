import { CreateJournalForm } from "@/components/forms/create-journal-form";
import { JournalCoverUpload } from "@/components/journal-cover-upload";
import Link from "next/link";
import { Button } from "@/components/ui/button";

type JournalEditorPageProps = {
  mode: "create" | "edit";
  journal?: {
    id: string;
    name: string;
    slug: string;
    submission_areas: string[] | null;
    submission_types: string[] | null;
    cover_image_path: string | null;
    issn_print: string | null;
    issn_online: string | null;
    status: string | null;
    is_open_access: boolean;
  };
};

export function JournalEditorPage({ mode, journal }: JournalEditorPageProps) {
  const isEdit = mode === "edit";

  return (
    <div>
      <p className="text-sm text-slate-500">
        <Link href="/admin/journals" className="text-teal-600 hover:underline">
          ← Journals
        </Link>
      </p>
      <h2 className="mt-2 text-xl font-semibold">{isEdit ? "Edit journal" : "Create journal"}</h2>
      <p className="mt-2 text-sm text-slate-500">
        {isEdit ? "Update journal details." : "Add a new journal."} The slug is used in public URLs:{" "}
        <code className="rounded bg-gray-100 px-1">{"{slug}"}</code>
      </p>
      <div className="mt-6">
        <CreateJournalForm journal={journal} />
      </div>
      {isEdit && journal ? (
        <div className="mt-10 space-y-6">
          <div className="rounded-lg border border-slate-200 bg-slate-50/50 p-4 space-y-3">
            <h3 className="text-sm font-semibold">Editorial Board</h3>
            <p className="text-xs text-slate-500">
              Manage the editorial board members for this journal, including Editor-in-Chief, Deputy Editors, and Associate Editors.
            </p>
            <Button asChild className="bg-teal-600 hover:bg-teal-700 text-white">
              <Link href={`/admin/journals/${journal.id}/editorial-board`}>
                Manage Editorial Board
              </Link>
            </Button>
          </div>
          <JournalCoverUpload journalId={journal.id} coverImagePath={journal.cover_image_path} />
        </div>
      ) : null}
    </div>
  );
}

import { CreateIssueForm } from "@/components/forms/create-issue-form";
import { getJournalsForPublisher } from "@/lib/db/publisher-context";
import Link from "next/link";

export default async function NewIssuePage() {
  const journals = await getJournalsForPublisher();

  return (
    <div>
      <p className="text-sm text-slate-500">
        <Link href="/dashboard/admin/issues" className="text-teal-600 hover:underline">
          ← Issues
        </Link>
      </p>
      <h2 className="mt-2 text-xl font-semibold">Create issue</h2>
      <p className="mt-2 text-sm text-slate-500">
        Each issue belongs to a volume. Create the volume first if it does not exist.
      </p>
      <div className="mt-6">
        <CreateIssueForm journals={journals} />
      </div>
    </div>
  );
}

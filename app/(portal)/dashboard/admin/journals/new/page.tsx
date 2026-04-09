import { CreateJournalForm } from "@/components/forms/create-journal-form";
import Link from "next/link";

export default function NewJournalPage() {
  return (
    <div>
      <p className="text-sm text-slate-500">
        <Link href="/dashboard/admin/journals" className="text-teal-600 hover:underline">
          ← Journals
        </Link>
      </p>
      <h2 className="mt-2 text-xl font-semibold">Create journal</h2>
      <p className="mt-2 text-sm text-slate-500">
        Add a new journal. The slug is used in public URLs:{" "}
        <code className="rounded bg-gray-100 px-1">/j/&#123;slug&#125;</code>
      </p>
      <div className="mt-6">
        <CreateJournalForm />
      </div>
    </div>
  );
}

import { CreateVolumeForm } from "@/components/forms/create-volume-form";
import { getJournals } from "@/lib/db/journals";
import Link from "next/link";

export default async function NewVolumePage() {
  const journals = await getJournals();

  return (
    <div>
      <p className="text-sm text-slate-500">
        <Link href="/admin/volumes" className="text-teal-600 hover:underline">
          ← Volumes
        </Link>
      </p>
      <h2 className="mt-2 text-xl font-semibold">Create volume</h2>
      <p className="mt-2 text-sm text-slate-500">
        Volumes belong to a single journal. Issues are created under a volume.
      </p>
      <div className="mt-6">
        <CreateVolumeForm journals={journals} />
      </div>
    </div>
  );
}

import Link from "next/link";

type Props = { params: Promise<{ journalSlug: string }> };

export default async function JournalHomePage({ params }: Props) {
  const { journalSlug } = await params;
  return (
    <main className="mx-auto max-w-5xl p-8">
      <h1 className="text-3xl font-bold">Journal: {journalSlug}</h1>
      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        <Link className="rounded border p-4" href={`/j/${journalSlug}/archive`}>
          Archive
        </Link>
        <Link className="rounded border p-4" href={`/j/${journalSlug}/article/sample-article`}>
          Sample article
        </Link>
      </div>
    </main>
  );
}

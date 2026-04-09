type Props = { params: Promise<{ journalSlug: string }> };

export default async function ArchivePage({ params }: Props) {
  const { journalSlug } = await params;
  return (
    <main className="mx-auto max-w-5xl p-8">
      <h1 className="text-2xl font-semibold">{journalSlug} archive</h1>
    </main>
  );
}

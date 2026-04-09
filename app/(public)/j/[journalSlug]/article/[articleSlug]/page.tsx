import type { Metadata } from "next";

type Props = { params: Promise<{ journalSlug: string; articleSlug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { articleSlug } = await params;
  return { title: `${articleSlug} | PublisherOS` };
}

export default async function ArticlePage({ params }: Props) {
  const { journalSlug, articleSlug } = await params;
  return (
    <main className="mx-auto max-w-5xl p-8">
      <h1 className="text-3xl font-bold">{articleSlug.replace(/-/g, " ")}</h1>
      <p className="mt-2 text-muted-foreground">Journal: {journalSlug}</p>
      <p className="mt-4">
        <strong>DOI:</strong> 10.0000/example-doi
      </p>
    </main>
  );
}

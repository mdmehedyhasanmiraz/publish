import Link from "next/link";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const query = (q ?? "").trim();

  return (
    <>
      <SiteHeader />
      <main className="mx-auto min-h-[40vh] max-w-7xl px-6 py-10">
        <h1 className="text-2xl font-semibold">Search</h1>
        {query ? (
          <p className="mt-4 text-muted-foreground">
            Results for &quot;{query}&quot; are not available yet. Try browsing{" "}
            <Link href="/journals" className="text-primary underline underline-offset-4">
              journals
            </Link>
            .
          </p>
        ) : (
          <p className="mt-4 text-muted-foreground">Use the search box in the header to find content.</p>
        )}
      </main>
      <SiteFooter />
    </>
  );
}

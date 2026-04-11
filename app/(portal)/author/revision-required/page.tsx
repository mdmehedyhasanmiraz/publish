import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function AuthorRevisionRequiredPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login");

  const { data: rows } = await supabase
    .from("submissions")
    .select("id, title, status, journals(name)")
    .eq("owner_user_id", user.id)
    .eq("status", "revision_requested")
    .order("id", { ascending: false });

  const list = rows ?? [];

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="text-2xl font-semibold">Revision required</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        These manuscripts need an updated file set from you. Open a submission, upload your revised manuscript and
        files, then submit the revision on the last step.
      </p>

      {list.length === 0 ? (
        <p className="mt-8 rounded-lg border bg-muted/30 px-4 py-6 text-sm text-muted-foreground">
          Nothing is waiting for a revision right now.
        </p>
      ) : (
        <ul className="mt-6 space-y-3">
          {list.map((s) => {
            const j = Array.isArray(s.journals) ? s.journals[0] : s.journals;
            const jname = (j as { name?: string } | null)?.name ?? "Journal";
            return (
              <li key={s.id as string}>
                <Link
                  href={`/author/submissions/${s.id}`}
                  className="block rounded-lg border bg-white px-4 py-3 transition hover:bg-muted/40"
                >
                  <span className="font-medium text-foreground">{String(s.title)}</span>
                  <span className="mt-1 block text-sm text-muted-foreground">{jname}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

import { createClient } from "@/lib/supabase/server";
import type { AdminUserProfileRow } from "@/components/admin-user-role-card";
import { AdminUsersTable } from "@/components/admin-users-table";

const PAGE_SIZE = 15;

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const supabase = await createClient();
  const sp = await searchParams;

  const { count: totalCount } = await supabase.from("profiles").select("*", { count: "exact", head: true });

  const count = totalCount ?? 0;
  const totalPages = Math.max(1, Math.ceil(count / PAGE_SIZE));

  let page = Number.parseInt(sp.page ?? "1", 10);
  if (!Number.isFinite(page) || page < 1) page = 1;
  if (page > totalPages) page = totalPages;

  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  const { data: profiles } = await supabase
    .from("profiles")
    .select("user_id, role, roles, active_role, first_name, last_name, display_name, email, updated_at")
    .order("updated_at", { ascending: false })
    .range(from, to);

  return (
    <div>
      <h2 className="text-xl font-semibold">Users & Roles</h2>
      <p className="mt-2 text-sm text-muted-foreground">
        Manage staff roles via the profiles table. Author and Reviewer are always available for every account. Click a row
        to edit roles and active workspace.
      </p>

      <AdminUsersTable profiles={(profiles ?? []) as AdminUserProfileRow[]} page={page} pageSize={PAGE_SIZE} totalCount={count} />
    </div>
  );
}

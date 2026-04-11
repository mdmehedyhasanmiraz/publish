import type { SupabaseClient } from "@supabase/supabase-js";

export type LookupAuthorResult =
  | {
      ok: true;
      exists: false;
      message?: string;
    }
  | {
      ok: true;
      exists: true;
      profile: Record<string, unknown>;
      affiliations: Array<Record<string, unknown>>;
      message?: string;
    }
  | { ok: false; message: string };

export async function lookupAuthorByEmail(supabase: SupabaseClient, emailRaw: string): Promise<LookupAuthorResult> {
  const email = emailRaw.trim().toLowerCase();
  if (!email) return { ok: false, message: "Email is required." };

  const { data: profile } = await supabase
    .from("profiles")
    .select(
      "user_id, salutation, first_name, middle_name, last_name, suffix, display_name, email, alternate_email, phone, whatsapp, orcid_id, scopus_author_id, wos_researcher_id, google_scholar_url, loop_profile_url, publons_url, address_line1, address_line2, city, state_region, postal_code, country_code",
    )
    .eq("email", email)
    .maybeSingle();

  if (!profile) {
    return {
      ok: true,
      exists: false,
      message:
        "No account found for this email yet. This author will be notified to confirm affiliations after they register with this email.",
    };
  }

  const { data: affiliations } = await supabase
    .from("profile_affiliations")
    .select("institution_name, department, position_title, city, country_code, start_date, end_date, is_primary")
    .eq("user_id", profile.user_id)
    .order("is_primary", { ascending: false })
    .order("created_at", { ascending: false });

  return {
    ok: true,
    exists: true,
    profile: profile as Record<string, unknown>,
    affiliations: (affiliations ?? []) as Array<Record<string, unknown>>,
    message: "Author profile found. Fields and affiliations were prefilled.",
  };
}

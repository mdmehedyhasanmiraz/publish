import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { ProfileForm } from "@/components/profile-form";

export default async function ProfilePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select(
      "user_id, role, created_at, updated_at, email, first_name, middle_name, last_name, display_name, salutation, suffix, roles, active_role, alternate_email, phone, whatsapp, orcid_id, scopus_author_id, wos_researcher_id, google_scholar_url, loop_profile_url, publons_url, address_line1, address_line2, city, state_region, postal_code, country_code, timezone, biography, degrees, expertise_keywords, research_areas, reviewer_interests, methods, publication_interests, languages, accepts_review_invites, available_for_review, max_reviews_per_month, preferred_review_model, review_turnaround_days, conflict_of_interest_statement, email_opt_in, marketing_opt_in, data_processing_consent_at, ethics_training_completed_at, metadata, editorial_preferences",
    )
    .eq("user_id", user.id)
    .maybeSingle();

  const { data: affiliations } = await supabase
    .from("profile_affiliations")
    .select("id, institution_name, department, position_title, city, country_code, start_date, end_date, is_primary")
    .eq("user_id", user.id)
    .order("is_primary", { ascending: false })
    .order("created_at", { ascending: false });

  if (!profile) {
    return <p className="text-sm text-muted-foreground">Profile row missing. Please sign out and sign in again.</p>;
  }

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-8 md:px-6 md:py-10">
      <ProfileForm profile={profile as never} affiliations={(affiliations ?? []) as never} />
    </div>
  );
}


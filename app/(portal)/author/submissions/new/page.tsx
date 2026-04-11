import { SubmissionWizardForm } from "@/components/forms/submission-wizard-form";
import { getJournals } from "@/lib/db/journals";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function NewSubmissionPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  const journals = await getJournals();
  const { data: profile } = await supabase
    .from("profiles")
    .select(
      "salutation, first_name, middle_name, last_name, suffix, display_name, email, alternate_email, phone, whatsapp, orcid_id, scopus_author_id, wos_researcher_id, google_scholar_url, loop_profile_url, publons_url, address_line1, address_line2, city, state_region, postal_code, country_code",
    )
    .eq("user_id", user.id)
    .maybeSingle();
  const { data: profileAffiliations } = await supabase
    .from("profile_affiliations")
    .select("institution_name, department, position_title, city, country_code, start_date, end_date, is_primary")
    .eq("user_id", user.id)
    .order("is_primary", { ascending: false })
    .order("created_at", { ascending: false });

  return (
    <div className="mx-auto max-w-6xl">
      <SubmissionWizardForm journals={journals} initialProfile={profile} initialAffiliations={profileAffiliations ?? []} />
    </div>
  );
}

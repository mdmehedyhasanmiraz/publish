"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

function cleanText(value: string) {
  const v = value.trim();
  return v ? v : null;
}

function cleanArrayCsv(value: string) {
  return value
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean);
}

function cleanInteger(value: string) {
  const v = value.trim();
  if (!v) return null;
  const n = Number(v);
  return Number.isFinite(n) ? Math.trunc(n) : null;
}

function cleanTimestamp(value: string) {
  const v = value.trim();
  if (!v) return null;
  const d = new Date(v);
  if (Number.isNaN(d.valueOf())) return null;
  return d.toISOString();
}

function isEmailLike(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export async function updatePrimaryEmailAction(input: { email: string }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, message: "Not signed in." };

  const nextEmail = input.email.trim().toLowerCase();
  if (!nextEmail) return { ok: false as const, message: "Primary email is required." };
  if (!isEmailLike(nextEmail)) return { ok: false as const, message: "Enter a valid email address." };
  if ((user.email ?? "").toLowerCase() === nextEmail) {
    return { ok: true as const, message: "Primary email unchanged." };
  }

  const { error } = await supabase.auth.updateUser({ email: nextEmail });
  if (error) return { ok: false as const, message: error.message };

  revalidatePath("/profile");
  revalidatePath("/", "layout");
  return { ok: true as const, message: "Confirmation sent. Check your inbox to confirm the new primary email." };
}

export async function updateProfileAction(input: {
  first_name: string;
  middle_name: string;
  last_name: string;
  display_name: string;
  salutation: string;
  suffix: string;
  alternate_email: string;
  phone: string;
  whatsapp: string;
  orcid_id: string;
  scopus_author_id: string;
  wos_researcher_id: string;
  google_scholar_url: string;
  loop_profile_url: string;
  publons_url: string;
  address_line1: string;
  address_line2: string;
  city: string;
  state_region: string;
  postal_code: string;
  country_code: string;
  timezone: string;
  biography: string;
  degrees_csv: string;
  expertise_keywords_csv: string;
  research_areas_csv: string;
  reviewer_interests_csv: string;
  methods_csv: string;
  publication_interests_csv: string;
  languages_csv: string;
  accepts_review_invites: boolean;
  available_for_review: boolean;
  max_reviews_per_month: string;
  preferred_review_model: string;
  review_turnaround_days: string;
  conflict_of_interest_statement: string;
  email_opt_in: boolean;
  marketing_opt_in: boolean;
  data_processing_consent_at: string;
  ethics_training_completed_at: string;
  metadata_json: string;
  editorial_preferences_json: string;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, message: "Not signed in." };

  let metadata: Record<string, unknown> = {};
  let editorialPreferences: Record<string, unknown> = {};
  try {
    metadata = input.metadata_json.trim() ? (JSON.parse(input.metadata_json) as Record<string, unknown>) : {};
    editorialPreferences = input.editorial_preferences_json.trim()
      ? (JSON.parse(input.editorial_preferences_json) as Record<string, unknown>)
      : {};
  } catch {
    return { ok: false as const, message: "Metadata JSON fields must contain valid JSON." };
  }

  const { error } = await supabase
    .from("profiles")
    .update({
      first_name: input.first_name.trim(),
      middle_name: cleanText(input.middle_name),
      last_name: input.last_name.trim(),
      display_name: cleanText(input.display_name),
      salutation: cleanText(input.salutation),
      suffix: cleanText(input.suffix),
      alternate_email: cleanText(input.alternate_email),
      phone: cleanText(input.phone),
      whatsapp: cleanText(input.whatsapp),
      orcid_id: cleanText(input.orcid_id),
      scopus_author_id: cleanText(input.scopus_author_id),
      wos_researcher_id: cleanText(input.wos_researcher_id),
      google_scholar_url: cleanText(input.google_scholar_url),
      loop_profile_url: cleanText(input.loop_profile_url),
      publons_url: cleanText(input.publons_url),
      address_line1: cleanText(input.address_line1),
      address_line2: cleanText(input.address_line2),
      city: cleanText(input.city),
      state_region: cleanText(input.state_region),
      postal_code: cleanText(input.postal_code),
      country_code: cleanText(input.country_code)?.toUpperCase() ?? null,
      timezone: cleanText(input.timezone),
      biography: cleanText(input.biography),
      degrees: input.degrees_csv.trim() ? cleanArrayCsv(input.degrees_csv) : null,
      expertise_keywords: cleanArrayCsv(input.expertise_keywords_csv),
      research_areas: cleanArrayCsv(input.research_areas_csv),
      reviewer_interests: cleanArrayCsv(input.reviewer_interests_csv),
      methods: cleanArrayCsv(input.methods_csv),
      publication_interests: cleanArrayCsv(input.publication_interests_csv),
      languages: cleanArrayCsv(input.languages_csv),
      accepts_review_invites: input.accepts_review_invites,
      available_for_review: input.available_for_review,
      max_reviews_per_month: cleanInteger(input.max_reviews_per_month),
      preferred_review_model: cleanText(input.preferred_review_model),
      review_turnaround_days: cleanInteger(input.review_turnaround_days),
      conflict_of_interest_statement: cleanText(input.conflict_of_interest_statement),
      email_opt_in: input.email_opt_in,
      marketing_opt_in: input.marketing_opt_in,
      data_processing_consent_at: cleanTimestamp(input.data_processing_consent_at),
      ethics_training_completed_at: cleanTimestamp(input.ethics_training_completed_at),
      metadata,
      editorial_preferences: editorialPreferences,
    })
    .eq("user_id", user.id);

  if (error) return { ok: false as const, message: error.message };

  revalidatePath("/profile");
  revalidatePath("/", "layout");
  return { ok: true as const };
}

export async function addProfileAffiliationAction(input: {
  institution_name: string;
  department: string;
  position_title: string;
  city: string;
  country_code: string;
  start_date: string;
  end_date: string;
  is_primary: boolean;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, message: "Not signed in." };

  const institutionName = input.institution_name.trim();
  if (!institutionName) return { ok: false as const, message: "Institution name is required." };

  if (input.is_primary) {
    await supabase.from("profile_affiliations").update({ is_primary: false }).eq("user_id", user.id);
  }

  const { error } = await supabase.from("profile_affiliations").insert({
    user_id: user.id,
    institution_name: institutionName,
    department: cleanText(input.department),
    position_title: cleanText(input.position_title),
    city: cleanText(input.city),
    country_code: cleanText(input.country_code)?.toUpperCase() ?? null,
    start_date: cleanText(input.start_date),
    end_date: cleanText(input.end_date),
    is_primary: input.is_primary,
  });

  if (error) return { ok: false as const, message: error.message };
  revalidatePath("/profile");
  return { ok: true as const };
}

export async function removeProfileAffiliationAction(input: { id: string }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, message: "Not signed in." };

  const { error } = await supabase.from("profile_affiliations").delete().eq("id", input.id).eq("user_id", user.id);
  if (error) return { ok: false as const, message: error.message };
  revalidatePath("/profile");
  return { ok: true as const };
}

export async function updateProfileAffiliationAction(input: {
  id: string;
  institution_name: string;
  department: string;
  position_title: string;
  city: string;
  country_code: string;
  start_date: string;
  end_date: string;
  is_primary: boolean;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, message: "Not signed in." };

  const institutionName = input.institution_name.trim();
  if (!institutionName) return { ok: false as const, message: "Institution name is required." };

  if (input.is_primary) {
    await supabase.from("profile_affiliations").update({ is_primary: false }).eq("user_id", user.id);
  }

  const { error } = await supabase
    .from("profile_affiliations")
    .update({
      institution_name: institutionName,
      department: cleanText(input.department),
      position_title: cleanText(input.position_title),
      city: cleanText(input.city),
      country_code: cleanText(input.country_code)?.toUpperCase() ?? null,
      start_date: cleanText(input.start_date),
      end_date: cleanText(input.end_date),
      is_primary: input.is_primary,
    })
    .eq("id", input.id)
    .eq("user_id", user.id);

  if (error) return { ok: false as const, message: error.message };
  revalidatePath("/profile");
  return { ok: true as const };
}


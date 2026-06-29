"use server";

import { randomUUID } from "node:crypto";
import { mergeWorkspaceRoles } from "@/lib/auth/app-roles";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED_MIMES = new Set(["image/jpeg", "image/png", "image/webp"]);

function extFromMime(mime: string): string {
  if (mime === "image/jpeg") return "jpg";
  if (mime === "image/png") return "png";
  if (mime === "image/webp") return "webp";
  return "img";
}

async function requirePlatformAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, message: "Not signed in." };
  const { data: profile } = await supabase.from("profiles").select("role, roles").eq("user_id", user.id).maybeSingle();
  const roles = mergeWorkspaceRoles(profile?.roles, profile?.role);
  if (!roles.includes("admin")) {
    return { ok: false as const, message: "Platform admin access required." };
  }
  return { ok: true as const, supabase, userId: user.id };
}

export type EditorialBoardActionState = { ok: boolean; message?: string; id?: string };

export async function saveEditorialBoardMemberAction(
  _prev: EditorialBoardActionState | undefined,
  formData: FormData,
): Promise<EditorialBoardActionState> {
  const auth = await requirePlatformAdmin();
  if (!auth.ok) return auth;

  const id = String(formData.get("id") ?? "").trim();
  const journalId = String(formData.get("journal_id") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const affiliation = String(formData.get("affiliation") ?? "").trim();
  const position = String(formData.get("position") ?? "").trim();
  const orcid = String(formData.get("orcid") ?? "").trim();
  const profileUrl = String(formData.get("profile_url") ?? "").trim();
  const photoPath = String(formData.get("photo_path") ?? "").trim();
  const sortOrderVal = String(formData.get("sort_order") ?? "").trim();
  const googleScholarUrl = String(formData.get("google_scholar_url") ?? "").trim();
  const researchgateUrl = String(formData.get("researchgate_url") ?? "").trim();
  const scopusUrl = String(formData.get("scopus_url") ?? "").trim();
  const loopUrl = String(formData.get("loop_url") ?? "").trim();

  if (!journalId) return { ok: false, message: "Journal is required." };
  if (!name) return { ok: false, message: "Name is required." };
  if (!affiliation) return { ok: false, message: "Affiliation is required." };
  if (!position) return { ok: false, message: "Position is required." };

  const sort_order = sortOrderVal ? parseInt(sortOrderVal, 10) : 0;

  const dbData = {
    journal_id: journalId,
    name,
    email: email || null,
    affiliation,
    position,
    orcid: orcid || null,
    profile_url: profileUrl || null,
    photo_path: photoPath || null,
    sort_order: isNaN(sort_order) ? 0 : sort_order,
    google_scholar_url: googleScholarUrl || null,
    researchgate_url: researchgateUrl || null,
    scopus_url: scopusUrl || null,
    loop_url: loopUrl || null,
    updated_at: new Date().toISOString(),
  };

  let res;
  if (id) {
    res = await auth.supabase.from("editorial_board_members").update(dbData).eq("id", id).select("id").maybeSingle();
  } else {
    res = await auth.supabase.from("editorial_board_members").insert(dbData).select("id").maybeSingle();
  }

  if (res.error) {
    return { ok: false, message: res.error.message };
  }

  // Fetch journal slug for revalidation
  const { data: journal } = await auth.supabase.from("journals").select("slug").eq("id", journalId).maybeSingle();
  revalidatePath(`/admin/journals/${journalId}/editorial-board`);
  if (journal?.slug) {
    revalidatePath(`/${journal.slug}/editorial-board`);
  }

  return { ok: true, message: id ? "Member updated." : "Member added.", id: res.data?.id };
}

export async function deleteEditorialBoardMemberAction(id: string, journalId: string): Promise<EditorialBoardActionState> {
  const auth = await requirePlatformAdmin();
  if (!auth.ok) return auth;

  // Optionally delete photo from storage if one exists
  const { data: member } = await auth.supabase.from("editorial_board_members").select("photo_path").eq("id", id).maybeSingle();
  if (member?.photo_path) {
    await auth.supabase.storage.from("covers").remove([member.photo_path]);
  }

  const { error } = await auth.supabase.from("editorial_board_members").delete().eq("id", id);
  if (error) {
    return { ok: false, message: error.message };
  }

  const { data: journal } = await auth.supabase.from("journals").select("slug").eq("id", journalId).maybeSingle();
  revalidatePath(`/admin/journals/${journalId}/editorial-board`);
  if (journal?.slug) {
    revalidatePath(`/${journal.slug}/editorial-board`);
  }

  return { ok: true, message: "Member removed." };
}

export async function uploadMemberPhotoAction(formData: FormData): Promise<{ ok: boolean; path?: string; message?: string }> {
  const auth = await requirePlatformAdmin();
  if (!auth.ok) return auth;

  const journalId = String(formData.get("journal_id") ?? "").trim();
  const file = formData.get("file");

  if (!journalId) return { ok: false, message: "Journal is required." };
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, message: "Choose a photo file." };
  }
  if (file.size > MAX_BYTES) return { ok: false, message: "Photo must be 5MB or smaller." };
  if (!ALLOWED_MIMES.has(file.type)) {
    return { ok: false, message: "Use JPEG, PNG, or WebP." };
  }

  const path = `journals/${journalId}/editorial-board/${randomUUID()}.${extFromMime(file.type)}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  const { error: upErr } = await auth.supabase.storage.from("covers").upload(path, buffer, {
    contentType: file.type,
    upsert: false,
  });

  if (upErr) return { ok: false, message: upErr.message };

  return { ok: true, path };
}

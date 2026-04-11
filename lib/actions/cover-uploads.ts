"use server";

import { randomUUID } from "node:crypto";
import { mergeWorkspaceRoles } from "@/lib/auth/app-roles";
import { listJournalCoverFiles } from "@/lib/covers/journal-cover-storage";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp"]);

function journalSlugFromEmbed(journals: unknown): string | undefined {
  if (journals == null) return undefined;
  if (Array.isArray(journals)) {
    const j = journals[0];
    return j && typeof j === "object" && "slug" in j ? String((j as { slug: string }).slug) : undefined;
  }
  if (typeof journals === "object" && "slug" in journals) {
    return String((journals as { slug: string }).slug);
  }
  return undefined;
}

function extFromMime(mime: string): string {
  if (mime === "image/jpeg") return "jpg";
  if (mime === "image/png") return "png";
  if (mime === "image/webp") return "webp";
  return "img";
}

export type CoverUploadState = { ok: boolean; message?: string };

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

export type JournalCoverLibraryItem = { path: string; name: string };

/** Called when the admin opens “Choose from uploaded covers” — lists storage only; no image bytes. */
export async function fetchJournalCoverLibraryAction(
  journalId: string,
): Promise<{ ok: true; items: JournalCoverLibraryItem[] } | { ok: false; message: string }> {
  const id = journalId.trim();
  if (!id) return { ok: false, message: "Journal is required." };
  const auth = await requirePlatformAdmin();
  if (!auth.ok) return { ok: false, message: auth.message ?? "Access denied." };
  const items = await listJournalCoverFiles(auth.supabase, id);
  return { ok: true, items };
}

export async function uploadJournalCoverAction(_prev: CoverUploadState | undefined, formData: FormData): Promise<CoverUploadState> {
  const auth = await requirePlatformAdmin();
  if (!auth.ok) return auth;

  const journalId = String(formData.get("journal_id") ?? "").trim();
  const file = formData.get("image");
  if (!journalId) return { ok: false, message: "Journal is required." };
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, message: "Choose an image file." };
  }
  if (file.size > MAX_BYTES) return { ok: false, message: "Image must be 5MB or smaller." };
  if (!ALLOWED.has(file.type)) {
    return { ok: false, message: "Use JPEG, PNG, or WebP." };
  }

  const path = `journals/${journalId}/${randomUUID()}.${extFromMime(file.type)}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  const { error: upErr } = await auth.supabase.storage.from("covers").upload(path, buffer, {
    contentType: file.type,
    upsert: false,
  });
  if (upErr) return { ok: false, message: upErr.message };

  const { error: dbErr } = await auth.supabase.from("journals").update({ cover_image_path: path }).eq("id", journalId);
  if (dbErr) return { ok: false, message: dbErr.message };

  const { data: row } = await auth.supabase.from("journals").select("slug").eq("id", journalId).maybeSingle();
  const slug = row?.slug as string | undefined;
  revalidatePath("/admin/journals");
  revalidatePath(`/admin/journals/${journalId}`);
  revalidatePath("/journals");
  if (slug) {
    revalidatePath(`/j/${slug}`);
    revalidatePath(`/j/${slug}/archive`);
  }
  return { ok: true, message: "Cover updated." };
}

export async function removeJournalCoverAction(journalId: string): Promise<CoverUploadState> {
  const auth = await requirePlatformAdmin();
  if (!auth.ok) return auth;
  const id = journalId.trim();
  if (!id) return { ok: false, message: "Journal is required." };

  const { data: journal } = await auth.supabase.from("journals").select("slug, cover_image_path").eq("id", id).maybeSingle();
  const oldPath = journal?.cover_image_path as string | null | undefined;
  if (oldPath) {
    await auth.supabase.storage.from("covers").remove([oldPath]);
  }
  const { error } = await auth.supabase.from("journals").update({ cover_image_path: null }).eq("id", id);
  if (error) return { ok: false, message: error.message };

  const slug = journal?.slug as string | undefined;
  revalidatePath("/admin/journals");
  revalidatePath(`/admin/journals/${id}`);
  revalidatePath("/journals");
  if (slug) {
    revalidatePath(`/j/${slug}`);
    revalidatePath(`/j/${slug}/archive`);
  }
  return { ok: true, message: "Cover removed." };
}

export async function selectJournalCoverAction(_prev: CoverUploadState | undefined, formData: FormData): Promise<CoverUploadState> {
  const auth = await requirePlatformAdmin();
  if (!auth.ok) return auth;

  const journalId = String(formData.get("journal_id") ?? "").trim();
  const path = String(formData.get("storage_path") ?? "").trim();
  if (!journalId || !path) {
    return { ok: false, message: "Journal and image are required." };
  }
  const prefix = `journals/${journalId}/`;
  if (!path.startsWith(prefix)) {
    return { ok: false, message: "Invalid image selection." };
  }

  const { error: dbErr } = await auth.supabase.from("journals").update({ cover_image_path: path }).eq("id", journalId);
  if (dbErr) return { ok: false, message: dbErr.message };

  const { data: row } = await auth.supabase.from("journals").select("slug").eq("id", journalId).maybeSingle();
  const slug = row?.slug as string | undefined;
  revalidatePath("/admin/journals");
  revalidatePath(`/admin/journals/${journalId}`);
  revalidatePath("/journals");
  if (slug) {
    revalidatePath(`/j/${slug}`);
    revalidatePath(`/j/${slug}/archive`);
  }
  return { ok: true, message: "Cover updated." };
}

export async function uploadIssueCoverAction(_prev: CoverUploadState | undefined, formData: FormData): Promise<CoverUploadState> {
  const auth = await requirePlatformAdmin();
  if (!auth.ok) return auth;

  const issueId = String(formData.get("issue_id") ?? "").trim();
  const file = formData.get("image");
  if (!issueId) return { ok: false, message: "Issue is required." };
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, message: "Choose an image file." };
  }
  if (file.size > MAX_BYTES) return { ok: false, message: "Image must be 5MB or smaller." };
  if (!ALLOWED.has(file.type)) {
    return { ok: false, message: "Use JPEG, PNG, or WebP." };
  }

  const path = `issues/${issueId}/${randomUUID()}.${extFromMime(file.type)}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  const { error: upErr } = await auth.supabase.storage.from("covers").upload(path, buffer, {
    contentType: file.type,
    upsert: false,
  });
  if (upErr) return { ok: false, message: upErr.message };

  const { error: dbErr } = await auth.supabase.from("issues").update({ cover_image_path: path }).eq("id", issueId);
  if (dbErr) return { ok: false, message: dbErr.message };

  const { data: issue } = await auth.supabase
    .from("issues")
    .select("journal_id, journals(slug)")
    .eq("id", issueId)
    .maybeSingle();
  const journalSlug = journalSlugFromEmbed(issue?.journals);

  revalidatePath("/admin/issues");
  revalidatePath(`/admin/issues/${issueId}`);
  if (journalSlug) {
    revalidatePath(`/j/${journalSlug}`);
    revalidatePath(`/j/${journalSlug}/archive`);
  }
  return { ok: true, message: "Issue cover updated." };
}

export async function removeIssueCoverAction(issueId: string): Promise<CoverUploadState> {
  const auth = await requirePlatformAdmin();
  if (!auth.ok) return auth;
  const id = issueId.trim();
  if (!id) return { ok: false, message: "Issue is required." };

  const { data: issue } = await auth.supabase
    .from("issues")
    .select("cover_image_path, journals(slug)")
    .eq("id", id)
    .maybeSingle();
  const oldPath = issue?.cover_image_path as string | null | undefined;
  if (oldPath) {
    await auth.supabase.storage.from("covers").remove([oldPath]);
  }
  const { error } = await auth.supabase.from("issues").update({ cover_image_path: null }).eq("id", id);
  if (error) return { ok: false, message: error.message };

  const journalSlug = journalSlugFromEmbed(issue?.journals);

  revalidatePath("/admin/issues");
  revalidatePath(`/admin/issues/${id}`);
  if (journalSlug) {
    revalidatePath(`/j/${journalSlug}`);
    revalidatePath(`/j/${journalSlug}/archive`);
  }
  return { ok: true, message: "Issue cover removed." };
}

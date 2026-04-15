import mammoth from "mammoth";
import type { SupabaseClient } from "@supabase/supabase-js";

export type ExtractedAuthorDetailsRow = {
  display_name: string;
  first_name: string;
  last_name: string;
  email: string;
  affiliations: string[];
};

export type ExtractSubmissionAuthorDetailsResult =
  | {
      ok: true;
      authors: ExtractedAuthorDetailsRow[];
      skipped?: boolean;
      reason?: "no_file" | "unsupported_format" | "empty" | "invalid_table";
      message?: string;
    }
  | { ok: false; message: string };

function decodeHtmlEntities(value: string): string {
  return value
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

function stripHtml(value: string): string {
  return decodeHtmlEntities(value).replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function normalizeHeader(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function splitDisplayName(fullName: string): { first_name: string; last_name: string } {
  const clean = fullName.replace(/\s+/g, " ").trim();
  if (!clean) return { first_name: "", last_name: "" };
  const parts = clean.split(" ");
  if (parts.length === 1) return { first_name: parts[0], last_name: "" };
  return {
    first_name: parts.slice(0, -1).join(" "),
    last_name: parts[parts.length - 1] ?? "",
  };
}

function parseRowsFromDocxHtml(html: string): string[][] {
  const rows: string[][] = [];
  const trRe = /<tr\b[^>]*>([\s\S]*?)<\/tr>/gi;
  let trMatch: RegExpExecArray | null;
  while ((trMatch = trRe.exec(html)) !== null) {
    const trHtml = trMatch[1] ?? "";
    const cells: string[] = [];
    const cellRe = /<t[dh]\b[^>]*>([\s\S]*?)<\/t[dh]>/gi;
    let cellMatch: RegExpExecArray | null;
    while ((cellMatch = cellRe.exec(trHtml)) !== null) {
      cells.push(stripHtml(cellMatch[1] ?? ""));
    }
    if (cells.length) rows.push(cells);
  }
  return rows;
}

export async function extractSubmissionAuthorDetails(
  supabase: SupabaseClient,
  userId: string,
  submissionId: string,
): Promise<ExtractSubmissionAuthorDetailsResult> {
  const { data: submission, error: subErr } = await supabase
    .from("submissions")
    .select("id, owner_user_id")
    .eq("id", submissionId)
    .single();
  if (subErr || !submission || submission.owner_user_id !== userId) {
    return { ok: false, message: "Not allowed." };
  }

  const { data: files } = await supabase
    .from("submission_files")
    .select("storage_path, file_kind, mime_type")
    .eq("submission_id", submissionId)
    .eq("file_kind", "author_details")
    .order("id", { ascending: false })
    .limit(1);

  const file = files?.[0];
  if (!file?.storage_path) {
    return {
      ok: true,
      authors: [],
      skipped: true,
      reason: "no_file",
      message: "Upload an author details DOCX file to continue.",
    };
  }

  const path = String(file.storage_path);
  const lower = path.toLowerCase();
  const mime = String(file.mime_type ?? "").toLowerCase();
  const isDocx =
    lower.endsWith(".docx") || mime.includes("wordprocessingml") || mime.includes("officedocument.wordprocessingml");

  if (!isDocx) {
    return {
      ok: true,
      authors: [],
      skipped: true,
      reason: "unsupported_format",
      message: "Author details parsing currently supports DOCX only. Please upload the template as .docx.",
    };
  }

  const { data: blob, error: dlErr } = await supabase.storage.from("data").download(path);
  if (dlErr || !blob) {
    return { ok: false, message: dlErr?.message ?? "Could not download author details file." };
  }

  const buffer = await blob.arrayBuffer();
  let html = "";
  try {
    const converted = await mammoth.convertToHtml({ buffer: Buffer.from(buffer) });
    html = converted.value ?? "";
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : "Could not read author details file." };
  }

  const rows = parseRowsFromDocxHtml(html);
  if (!rows.length) {
    return {
      ok: true,
      authors: [],
      skipped: true,
      reason: "empty",
      message: "No table rows found in the uploaded author details file.",
    };
  }

  const header = rows[0] ?? [];
  const normalized = header.map(normalizeHeader);
  const nameIdx = normalized.findIndex((v) => v === "name" || v.includes("author name"));
  const affIdx = normalized.findIndex((v) => v.startsWith("affiliation"));
  const emailIdx = normalized.findIndex((v) => v === "email" || v.includes("email"));

  if (nameIdx < 0 || affIdx < 0 || emailIdx < 0) {
    return {
      ok: true,
      authors: [],
      skipped: true,
      reason: "invalid_table",
      message:
        "Invalid author details table. Use exactly these columns in the header: Name, Affiliations, Email.",
    };
  }

  const authors: ExtractedAuthorDetailsRow[] = [];
  for (const row of rows.slice(1)) {
    const display_name = String(row[nameIdx] ?? "").trim();
    const email = String(row[emailIdx] ?? "").trim().toLowerCase();
    const rawAffiliations = String(row[affIdx] ?? "").trim();
    if (!display_name && !email && !rawAffiliations) continue;
    const { first_name, last_name } = splitDisplayName(display_name);
    authors.push({
      display_name,
      first_name,
      last_name,
      email,
      affiliations: rawAffiliations
        .split(";")
        .map((v) => v.trim())
        .filter(Boolean),
    });
  }

  if (!authors.length) {
    return {
      ok: true,
      authors: [],
      skipped: true,
      reason: "empty",
      message: "No author rows found in the author details table.",
    };
  }

  return { ok: true, authors };
}

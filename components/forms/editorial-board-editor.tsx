"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState, useTransition } from "react";
import {
  saveEditorialBoardMemberAction,
  uploadMemberPhotoAction,
} from "@/lib/actions/editorial-board";
import { publicCoverUrl } from "@/lib/storage/covers";
import Image from "next/image";

type EditorialBoardMember = {
  id?: string;
  journal_id: string;
  name: string;
  email: string | null;
  affiliation: string;
  position: string;
  photo_path: string | null;
  orcid: string | null;
  profile_url: string | null;
  sort_order: number;
  google_scholar_url: string | null;
  researchgate_url: string | null;
  scopus_url: string | null;
  loop_url: string | null;
};

type EditorialBoardEditorProps = {
  journalId: string;
  member?: EditorialBoardMember;
  onSaveSuccess: () => void;
  onCancel: () => void;
};

const DEFAULT_POSITIONS = [
  "Editor-in-Chief",
  "Deputy Editor-in-Chief",
  "Associate Editor",
  "Academic Editor",
  "Managing Editor",
  "Section Editor",
  "Editorial Board Member",
  "Advisory Board Member",
];

export function EditorialBoardEditor({ journalId, member, onSaveSuccess, onCancel }: EditorialBoardEditorProps) {
  const [isPending, startTransition] = useTransition();
  const [uploadPending, setUploadPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form states
  const [name, setName] = useState(member?.name ?? "");
  const [email, setEmail] = useState(member?.email ?? "");
  const [affiliation, setAffiliation] = useState(member?.affiliation ?? "");
  const [position, setPosition] = useState(member?.position ?? DEFAULT_POSITIONS[0]);
  const [customPosition, setCustomPosition] = useState(
    member && !DEFAULT_POSITIONS.includes(member.position) ? member.position : ""
  );
  const [orcid, setOrcid] = useState(member?.orcid ?? "");
  const [profileUrl, setProfileUrl] = useState(member?.profile_url ?? "");
  const [photoPath, setPhotoPath] = useState(member?.photo_path ?? "");
  const [sortOrder, setSortOrder] = useState(member?.sort_order ?? 0);
  const [googleScholarUrl, setGoogleScholarUrl] = useState(member?.google_scholar_url ?? "");
  const [researchgateUrl, setResearchgateUrl] = useState(member?.researchgate_url ?? "");
  const [scopusUrl, setScopusUrl] = useState(member?.scopus_url ?? "");
  const [loopUrl, setLoopUrl] = useState(member?.loop_url ?? "");

  const [useCustomPosition, setUseCustomPosition] = useState(
    member ? !DEFAULT_POSITIONS.includes(member.position) : false
  );

  async function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploadPending(true);
    setError(null);

    const formData = new FormData();
    formData.append("journal_id", journalId);
    formData.append("file", files[0]);

    try {
      const res = await uploadMemberPhotoAction(formData);
      if (res.ok && res.path) {
        setPhotoPath(res.path);
      } else {
        setError(res.message ?? "Failed to upload photo.");
      }
    } catch {
      setError("An error occurred during photo upload.");
    } finally {
      setUploadPending(false);
    }
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    const finalPosition = useCustomPosition ? customPosition.trim() : position;
    if (!finalPosition) {
      setError("Please specify a position.");
      return;
    }

    startTransition(async () => {
      const formData = new FormData();
      if (member?.id) {
        formData.append("id", member.id);
      }
      formData.append("journal_id", journalId);
      formData.append("name", name.trim());
      formData.append("email", email.trim());
      formData.append("affiliation", affiliation.trim());
      formData.append("position", finalPosition);
      formData.append("orcid", orcid.trim());
      formData.append("profile_url", profileUrl.trim());
      formData.append("photo_path", photoPath);
      formData.append("sort_order", String(sortOrder));
      formData.append("google_scholar_url", googleScholarUrl.trim());
      formData.append("researchgate_url", researchgateUrl.trim());
      formData.append("scopus_url", scopusUrl.trim());
      formData.append("loop_url", loopUrl.trim());

      const res = await saveEditorialBoardMemberAction(undefined, formData);
      if (res.ok) {
        onSaveSuccess();
      } else {
        setError(res.message ?? "Something went wrong.");
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="rounded-md bg-red-50 p-3 text-sm text-red-600 border border-red-200">
          {error}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor="memberName">Name *</Label>
          <Input
            id="memberName"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Dr. Jane Doe"
          />
        </div>

        <div className="grid gap-2">
          <Label htmlFor="memberEmail">Email (optional)</Label>
          <Input
            id="memberEmail"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="jane.doe@university.edu"
          />
        </div>
      </div>

      <div className="grid gap-2">
        <Label htmlFor="memberAffiliation">Affiliation *</Label>
        <Input
          id="memberAffiliation"
          required
          value={affiliation}
          onChange={(e) => setAffiliation(e.target.value)}
          placeholder="Department of Computer Science, University of Oxford, UK"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor="memberPosition">Position *</Label>
          {useCustomPosition ? (
            <div className="flex gap-2">
              <Input
                id="customPosition"
                required
                value={customPosition}
                onChange={(e) => setCustomPosition(e.target.value)}
                placeholder="e.g. Guest Editor, Senior Adviser"
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => setUseCustomPosition(false)}
              >
                Preset
              </Button>
            </div>
          ) : (
            <div className="flex gap-2">
              <select
                id="memberPosition"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                value={position}
                onChange={(e) => setPosition(e.target.value)}
              >
                {DEFAULT_POSITIONS.map((pos) => (
                  <option key={pos} value={pos}>
                    {pos}
                  </option>
                ))}
              </select>
              <Button
                type="button"
                variant="outline"
                onClick={() => setUseCustomPosition(true)}
              >
                Custom
              </Button>
            </div>
          )}
        </div>

        <div className="grid gap-2">
          <Label htmlFor="memberSortOrder">Sort Order (lower numbers show first)</Label>
          <Input
            id="memberSortOrder"
            type="number"
            value={sortOrder}
            onChange={(e) => setSortOrder(parseInt(e.target.value, 10) || 0)}
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor="memberOrcid">ORCID (optional, e.g. 0000-0002-1825-0097)</Label>
          <Input
            id="memberOrcid"
            value={orcid}
            onChange={(e) => setOrcid(e.target.value)}
            placeholder="0000-XXXX-XXXX-XXXX"
          />
        </div>

        <div className="grid gap-2">
          <Label htmlFor="memberProfileUrl">Profile URL (optional)</Label>
          <Input
            id="memberProfileUrl"
            type="url"
            value={profileUrl}
            onChange={(e) => setProfileUrl(e.target.value)}
            placeholder="https://example.com/profile"
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor="googleScholarUrl">Google Scholar URL (optional)</Label>
          <Input
            id="googleScholarUrl"
            type="url"
            value={googleScholarUrl}
            onChange={(e) => setGoogleScholarUrl(e.target.value)}
            placeholder="https://scholar.google.com/citations?user=..."
          />
        </div>

        <div className="grid gap-2">
          <Label htmlFor="researchgateUrl">ResearchGate URL (optional)</Label>
          <Input
            id="researchgateUrl"
            type="url"
            value={researchgateUrl}
            onChange={(e) => setResearchgateUrl(e.target.value)}
            placeholder="https://www.researchgate.net/profile/..."
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor="scopusUrl">Scopus Profile URL (optional)</Label>
          <Input
            id="scopusUrl"
            type="url"
            value={scopusUrl}
            onChange={(e) => setScopusUrl(e.target.value)}
            placeholder="https://www.scopus.com/authid/detail.uri?authorId=..."
          />
        </div>

        <div className="grid gap-2">
          <Label htmlFor="loopUrl">Loop Profile URL (optional)</Label>
          <Input
            id="loopUrl"
            type="url"
            value={loopUrl}
            onChange={(e) => setLoopUrl(e.target.value)}
            placeholder="https://loop.frontiersin.org/people/..."
          />
        </div>
      </div>

      <div className="grid gap-2 rounded-lg border border-dashed border-slate-200 p-4 bg-slate-50/50">
        <Label>Profile Photo</Label>
        <div className="flex items-center gap-4 mt-2">
          {photoPath ? (
            <div className="relative h-16 w-16 overflow-hidden rounded-full border border-slate-200 bg-white">
              <Image
                src={publicCoverUrl(photoPath) || ""}
                alt="Preview"
                fill
                className="object-cover"
              />
            </div>
          ) : (
            <div className="flex h-16 w-16 items-center justify-center rounded-full border border-slate-200 bg-white text-xs text-slate-400">
              No photo
            </div>
          )}
          <div className="flex-1 space-y-1">
            <Input
              id="photoFile"
              type="file"
              accept="image/*"
              onChange={handlePhotoUpload}
              disabled={uploadPending}
            />
            <p className="text-xs text-slate-500">JPEG, PNG, or WebP, up to 5MB.</p>
          </div>
        </div>
        {photoPath && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="text-red-500 self-start hover:text-red-700 hover:bg-transparent h-auto p-0"
            onClick={() => setPhotoPath("")}
          >
            Remove photo
          </Button>
        )}
      </div>

      <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={isPending || uploadPending}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          className="bg-teal-600 hover:bg-teal-700 text-white"
          disabled={isPending || uploadPending}
        >
          {isPending ? "Saving..." : member ? "Update Member" : "Add Member"}
        </Button>
      </div>
    </form>
  );
}

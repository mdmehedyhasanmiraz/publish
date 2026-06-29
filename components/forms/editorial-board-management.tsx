"use client";

import { Button } from "@/components/ui/button";
import { EditorialBoardEditor } from "@/components/forms/editorial-board-editor";
import { deleteEditorialBoardMemberAction } from "@/lib/actions/editorial-board";
import { publicCoverUrl } from "@/lib/storage/covers";
import { useState, useTransition } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Mail, Shield, User, ArrowLeft, Plus, Edit2, Trash2 } from "lucide-react";

type EditorialBoardMember = {
  id: string;
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

type Props = {
  journalId: string;
  journalName: string;
  initialMembers: EditorialBoardMember[];
};

export function EditorialBoardManagement({ journalId, journalName, initialMembers }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [editingMember, setEditingMember] = useState<EditorialBoardMember | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete(id: string) {
    if (!confirm("Are you sure you want to remove this editorial board member?")) return;

    setError(null);
    startTransition(async () => {
      const res = await deleteEditorialBoardMemberAction(id, journalId);
      if (res.ok) {
        router.refresh();
      } else {
        setError(res.message ?? "Failed to delete member.");
      }
    });
  }

  function handleSaveSuccess() {
    setIsAdding(false);
    setEditingMember(null);
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 pb-4">
        <div>
          <p className="text-sm text-slate-500">
            <Link href={`/admin/journals/${journalId}`} className="flex items-center gap-1 text-teal-600 hover:underline">
              <ArrowLeft className="h-3 w-3" /> Back to Journal Details
            </Link>
          </p>
          <h2 className="mt-2 text-xl font-bold text-slate-900">Editorial Board — {journalName}</h2>
          <p className="text-sm text-slate-500">
            Manage editors, associate editors, and other members of the editorial board.
          </p>
        </div>
        {!isAdding && !editingMember && (
          <Button
            onClick={() => setIsAdding(true)}
            className="bg-teal-600 hover:bg-teal-700 text-white self-start flex items-center gap-2"
          >
            <Plus className="h-4 w-4" /> Add Board Member
          </Button>
        )}
      </div>

      {error && (
        <div className="rounded-md bg-red-50 p-3 text-sm text-red-600 border border-red-200">
          {error}
        </div>
      )}

      {/* Editor/Add Form View */}
      {(isAdding || editingMember) && (
        <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm max-w-2xl">
          <h3 className="text-base font-semibold text-slate-900 mb-4">
            {isAdding ? "Add New Editorial Board Member" : `Edit Member: ${editingMember?.name}`}
          </h3>
          <EditorialBoardEditor
            journalId={journalId}
            member={editingMember ?? undefined}
            onSaveSuccess={handleSaveSuccess}
            onCancel={() => {
              setIsAdding(false);
              setEditingMember(null);
            }}
          />
        </div>
      )}

      {/* List view */}
      {!isAdding && !editingMember && (
        <div className="space-y-3">
          {initialMembers.length ? (
            initialMembers.map((member) => (
              <div
                key={member.id}
                className="flex flex-col sm:flex-row sm:items-center gap-4 rounded-lg border border-slate-200 bg-white p-4 shadow-sm transition hover:shadow-md"
              >
                {/* Photo or placeholder */}
                <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-full border border-slate-200 bg-slate-50 flex items-center justify-center">
                  {member.photo_path ? (
                    <Image
                      src={publicCoverUrl(member.photo_path) || ""}
                      alt={member.name}
                      fill
                      className="object-cover"
                    />
                  ) : (
                    <User className="h-6 w-6 text-slate-400" />
                  )}
                </div>

                {/* Member Info */}
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h4 className="font-semibold text-slate-900">{member.name}</h4>
                    <span className="inline-flex items-center gap-1 rounded bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-800">
                      <Shield className="h-3 w-3" /> {member.position}
                    </span>
                    <span className="text-xs text-slate-400">Order: {member.sort_order}</span>
                  </div>
                  <p className="mt-1 text-sm text-slate-600">{member.affiliation}</p>
                  <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
                    {member.email && (
                      <span className="flex items-center gap-1">
                        <Mail className="h-3 w-3" /> {member.email}
                      </span>
                    )}
                    {member.orcid && (
                      <span className="flex items-center gap-1">
                        <span className="text-green-600 font-bold">iD</span>{" "}
                        <a
                          href={`https://orcid.org/${member.orcid}`}
                          target="_blank"
                          rel="noreferrer"
                          className="hover:underline text-teal-600"
                        >
                          {member.orcid}
                        </a>
                      </span>
                    )}
                    {member.profile_url && (
                      <a
                        href={member.profile_url}
                        target="_blank"
                        rel="noreferrer"
                        className="hover:underline text-teal-600"
                      >
                        Web Profile
                      </a>
                    )}
                    {member.google_scholar_url && (
                      <a
                        href={member.google_scholar_url}
                        target="_blank"
                        rel="noreferrer"
                        className="hover:underline text-teal-600"
                      >
                        Scholar
                      </a>
                    )}
                    {member.researchgate_url && (
                      <a
                        href={member.researchgate_url}
                        target="_blank"
                        rel="noreferrer"
                        className="hover:underline text-teal-600"
                      >
                        ResearchGate
                      </a>
                    )}
                    {member.scopus_url && (
                      <a
                        href={member.scopus_url}
                        target="_blank"
                        rel="noreferrer"
                        className="hover:underline text-teal-600"
                      >
                        Scopus
                      </a>
                    )}
                    {member.loop_url && (
                      <a
                        href={member.loop_url}
                        target="_blank"
                        rel="noreferrer"
                        className="hover:underline text-teal-600"
                      >
                        Loop
                      </a>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 sm:self-center">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setEditingMember(member)}
                    className="flex items-center gap-1 text-slate-700"
                  >
                    <Edit2 className="h-3.5 w-3.5" /> Edit
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDelete(member.id)}
                    className="flex items-center gap-1 text-red-600 hover:text-red-700 hover:bg-red-50 border-red-100"
                    disabled={isPending}
                  >
                    <Trash2 className="h-3.5 w-3.5" /> Delete
                  </Button>
                </div>
              </div>
            ))
          ) : (
            <div className="rounded-lg border border-dashed border-slate-200 p-8 text-center bg-slate-50/50">
              <User className="mx-auto h-8 w-8 text-slate-400" />
              <h3 className="mt-2 text-sm font-semibold text-slate-900">No Editorial Board Members</h3>
              <p className="mt-1 text-sm text-slate-500">
                Get started by adding editorial board members for this journal.
              </p>
              <div className="mt-4">
                <Button
                  onClick={() => setIsAdding(true)}
                  className="bg-teal-600 hover:bg-teal-700 text-white inline-flex items-center gap-2"
                >
                  <Plus className="h-4 w-4" /> Add Board Member
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

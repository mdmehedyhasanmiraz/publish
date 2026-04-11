"use client";

import { useMemo, useState, useTransition } from "react";
import { createClient } from "@/lib/supabase/client";
import { removeArticleAssetAction, uploadArticleAssetAction } from "@/lib/actions/article";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type Asset = {
  id: string;
  asset_key: string;
  asset_type: "figure" | "table";
  caption: string | null;
  alt_text: string | null;
  table_markdown: string | null;
  storage_path: string | null;
  sort_order: number;
};

export function ArticleAssetManager(props: {
  articleId: string;
  versionId: string;
  assets: Asset[];
}) {
  const supabase = useMemo(() => createClient(), []);
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState("");
  const [assetType, setAssetType] = useState<"figure" | "table">("figure");
  const [assetKey, setAssetKey] = useState("");
  const [caption, setCaption] = useState("");
  const [altText, setAltText] = useState("");
  const [tableMarkdown, setTableMarkdown] = useState("");
  const [sortOrder, setSortOrder] = useState("0");
  const [file, setFile] = useState<File | null>(null);

  function upload() {
    startTransition(async () => {
      let storagePath: string | null = null;
      if (assetType === "figure") {
        if (!file) {
          setMessage("Choose an image for figure.");
          return;
        }
        const safeName = file.name.replaceAll(/[^a-zA-Z0-9._-]+/g, "-");
        storagePath = `articles/${props.articleId}/${props.versionId}/${crypto.randomUUID()}-${safeName}`;
        const { error: upErr } = await supabase.storage.from("data").upload(storagePath, file, {
          cacheControl: "3600",
          upsert: false,
          contentType: file.type || undefined,
        });
        if (upErr) {
          setMessage(upErr.message);
          return;
        }
      }

      const res = await uploadArticleAssetAction({
        articleId: props.articleId,
        versionId: props.versionId,
        assetKey,
        assetType,
        caption,
        altText,
        tableMarkdown,
        storagePath,
        sortOrder: Number(sortOrder || "0"),
      });
      setMessage(res.ok ? "Asset saved." : (res.message ?? "Could not save asset."));
      if (res.ok) location.reload();
    });
  }

  return (
    <section className="rounded-lg border bg-white p-4">
      <h3 className="text-sm font-semibold">Figures and Tables</h3>
      <div className="mt-3 grid gap-3 md:grid-cols-3">
        <div className="grid gap-2">
          <Label>Asset type</Label>
          <select
            value={assetType}
            onChange={(e) => setAssetType(e.target.value as "figure" | "table")}
            className="flex h-10 w-full rounded-md border border-input bg-white px-3 py-2 text-sm"
          >
            <option value="figure">Figure</option>
            <option value="table">Table</option>
          </select>
        </div>
        <div className="grid gap-2">
          <Label>Asset key</Label>
          <Input placeholder="fig-1 or tbl-1" value={assetKey} onChange={(e) => setAssetKey(e.target.value)} />
        </div>
        <div className="grid gap-2">
          <Label>Sort order</Label>
          <Input value={sortOrder} onChange={(e) => setSortOrder(e.target.value)} />
        </div>
      </div>
      <div className="mt-3 grid gap-3 md:grid-cols-2">
        <div className="grid gap-2">
          <Label>Caption</Label>
          <Textarea rows={3} value={caption} onChange={(e) => setCaption(e.target.value)} />
        </div>
        <div className="grid gap-2">
          <Label>Alt text (for figures)</Label>
          <Textarea rows={3} value={altText} onChange={(e) => setAltText(e.target.value)} />
        </div>
      </div>
      {assetType === "figure" ? (
        <div className="mt-3 grid gap-2">
          <Label>Figure file</Label>
          <Input type="file" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
        </div>
      ) : (
        <div className="mt-3 grid gap-2">
          <Label>Table markdown</Label>
          <Textarea
            rows={6}
            value={tableMarkdown}
            onChange={(e) => setTableMarkdown(e.target.value)}
            placeholder={"| Col A | Col B |\n| --- | --- |\n| 1 | 2 |"}
          />
        </div>
      )}
      <div className="mt-3">
        <Button disabled={pending || !assetKey.trim()} onClick={upload}>
          {pending ? "Saving..." : "Save asset"}
        </Button>
      </div>
      {message ? <p className="mt-2 text-sm text-muted-foreground">{message}</p> : null}

      <div className="mt-4 rounded border">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-left">
            <tr>
              <th className="px-3 py-2">Key</th>
              <th className="px-3 py-2">Type</th>
              <th className="px-3 py-2">Caption</th>
              <th className="px-3 py-2">Action</th>
            </tr>
          </thead>
          <tbody>
            {props.assets.length ? (
              props.assets.map((asset) => (
                <tr key={asset.id} className="border-t">
                  <td className="px-3 py-2">{asset.asset_key}</td>
                  <td className="px-3 py-2">{asset.asset_type}</td>
                  <td className="px-3 py-2">{asset.caption ?? "—"}</td>
                  <td className="px-3 py-2">
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={pending}
                      onClick={() =>
                        startTransition(async () => {
                          const res = await removeArticleAssetAction({ assetId: asset.id });
                          setMessage(res.message ?? (res.ok ? "Removed." : "Could not remove asset."));
                          if (res.ok) location.reload();
                        })
                      }
                    >
                      Remove
                    </Button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td className="px-3 py-3 text-muted-foreground" colSpan={4}>
                  No assets yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}


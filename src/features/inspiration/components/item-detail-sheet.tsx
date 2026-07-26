"use client";

import { useState } from "react";
import Image from "next/image";
import { toast } from "sonner";
import { Trash, MagnifyingGlass } from "@phosphor-icons/react/dist/ssr";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCollections, useUpdateInspirationItem, useDeleteInspirationItem } from "@/features/inspiration/queries";
import { AnalysisSection } from "@/features/inspiration/components/analysis-section";
import { SimilarItemsRow } from "@/features/inspiration/components/similar-items-row";
import type { InspirationItemDTO } from "@/features/inspiration/types";

export function ItemDetailSheet({
  item,
  onClose,
  onSelectId,
}: {
  item: InspirationItemDTO | null;
  onClose: () => void;
  onSelectId: (id: string) => void;
}) {
  const remove = useDeleteInspirationItem();

  async function handleDelete() {
    if (!item) return;
    await remove.mutateAsync(item.id);
    toast.success("Deleted.");
    onClose();
  }

  return (
    <Sheet open={Boolean(item)} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="flex flex-col gap-4 overflow-y-auto p-4">
        <SheetHeader className="p-0">
          <SheetTitle>Inspiration detail</SheetTitle>
          <SheetDescription>Edit metadata or remove this item.</SheetDescription>
        </SheetHeader>

        {item && (
          <ItemDetailForm
            key={item.id}
            item={item}
            onDelete={handleDelete}
            deleting={remove.isPending}
            onSelectId={onSelectId}
          />
        )}
      </SheetContent>
    </Sheet>
  );
}

function ItemDetailForm({
  item,
  onDelete,
  deleting,
  onSelectId,
}: {
  item: InspirationItemDTO;
  onDelete: () => void;
  deleting: boolean;
  onSelectId: (id: string) => void;
}) {
  const { data: collections = [] } = useCollections();
  const update = useUpdateInspirationItem();
  const [showSimilar, setShowSimilar] = useState(false);

  const [title, setTitle] = useState(item.title ?? "");
  const [description, setDescription] = useState(item.description ?? "");
  const [collectionId, setCollectionId] = useState<string | undefined>(item.collection?.id);

  async function handleSave() {
    await update.mutateAsync({ id: item.id, input: { title, description, collectionId } });
    toast.success("Saved.");
  }

  return (
    <>
      {item.fileUrl ? (
        item.type === "VIDEO" ? (
          <video src={item.fileUrl} controls poster={item.posterUrl ?? undefined} className="w-full rounded-lg" />
        ) : (
          <div className="relative aspect-4/3 w-full overflow-hidden rounded-lg bg-muted">
            <Image src={item.fileUrl} alt={title || "Inspiration"} fill className="object-cover" unoptimized />
          </div>
        )
      ) : null}

      {item.sourceUrl && (
        <a
          href={item.sourceUrl}
          target="_blank"
          rel="noreferrer"
          className="truncate text-xs text-brand underline underline-offset-2"
        >
          {item.sourceUrl}
        </a>
      )}

      <div className="space-y-3">
        <Input placeholder="Title" value={title} onChange={(event) => setTitle(event.target.value)} />
        <Textarea
          placeholder="Description"
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          rows={3}
        />
        <Select value={collectionId} onValueChange={(value) => setCollectionId(String(value))}>
          <SelectTrigger className="w-full">
            {/* Base UI renders the raw value unless given a formatter, which
                would show the collection's cuid instead of its name. */}
            <SelectValue placeholder="Collection">
              {(value) => collections.find((c) => c.id === value)?.name ?? "Collection"}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {collections.map((collection) => (
              <SelectItem key={collection.id} value={collection.id}>
                {collection.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {item.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {item.tags.map((tag) => (
              <Badge key={tag.id} variant="outline" className="text-[10px] text-muted-foreground">
                {tag.name}
              </Badge>
            ))}
          </div>
        )}
      </div>

      <Separator />

      <div className="space-y-3">
        <h3 className="text-xs font-medium text-foreground">AI analysis</h3>
        <AnalysisSection itemId={item.id} analysis={item.analysis} />

        {item.analysis?.status === "DONE" && (
          <div className="space-y-2">
            <Button
              size="sm"
              variant="outline"
              className="h-7 gap-1.5 px-2 text-xs"
              onClick={() => setShowSimilar((value) => !value)}
            >
              <MagnifyingGlass size={12} />
              {showSimilar ? "Hide similar" : "Find similar"}
            </Button>
            {showSimilar && <SimilarItemsRow itemId={item.id} onSelect={onSelectId} />}
          </div>
        )}
      </div>

      <SheetFooter className="mt-auto flex-row justify-between gap-2 p-0">
        <Button variant="ghost" size="sm" className="text-destructive" onClick={onDelete} disabled={deleting}>
          <Trash size={14} />
          Delete
        </Button>
        <Button size="sm" onClick={handleSave} disabled={update.isPending}>
          {update.isPending ? "Saving…" : "Save"}
        </Button>
      </SheetFooter>
    </>
  );
}

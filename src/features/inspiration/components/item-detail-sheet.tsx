"use client";

import { useState } from "react";
import Image from "next/image";
import { toast } from "sonner";
import { Trash } from "@phosphor-icons/react/dist/ssr";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
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
import type { InspirationItemDTO } from "@/features/inspiration/types";

export function ItemDetailSheet({
  item,
  onClose,
}: {
  item: InspirationItemDTO | null;
  onClose: () => void;
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

        {item && <ItemDetailForm key={item.id} item={item} onDelete={handleDelete} deleting={remove.isPending} />}
      </SheetContent>
    </Sheet>
  );
}

function ItemDetailForm({
  item,
  onDelete,
  deleting,
}: {
  item: InspirationItemDTO;
  onDelete: () => void;
  deleting: boolean;
}) {
  const { data: collections = [] } = useCollections();
  const update = useUpdateInspirationItem();

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
            <SelectValue placeholder="Collection" />
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

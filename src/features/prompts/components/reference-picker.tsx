"use client";

import { useState } from "react";
import Image from "next/image";
import { Check, LinkSimple, NotePencil } from "@phosphor-icons/react/dist/ssr";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { useInspirationItems } from "@/features/inspiration/queries";

export function ReferencePicker({
  open,
  onOpenChange,
  selectedIds,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedIds: string[];
  onConfirm: (ids: string[]) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Pick references</DialogTitle>
          <DialogDescription>Choose inspiration items to ground this brief in.</DialogDescription>
        </DialogHeader>

        {/* Fresh mount per open, so local selection state always starts from the current prop. */}
        {open && (
          <ReferencePickerGrid
            selectedIds={selectedIds}
            onConfirm={(ids) => {
              onConfirm(ids);
              onOpenChange(false);
            }}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function ReferencePickerGrid({
  selectedIds,
  onConfirm,
}: {
  selectedIds: string[];
  onConfirm: (ids: string[]) => void;
}) {
  const { data: items = [] } = useInspirationItems({});
  const [pending, setPending] = useState<string[]>(selectedIds);

  function toggle(id: string) {
    setPending((prev) => (prev.includes(id) ? prev.filter((v) => v !== id) : [...prev, id]));
  }

  return (
    <>
      <div className="grid max-h-80 grid-cols-4 gap-2 overflow-y-auto">
        {items.map((item) => {
          const thumb = item.type === "VIDEO" ? item.posterUrl : item.fileUrl;
          const selected = pending.includes(item.id);
          return (
            <button
              key={item.id}
              onClick={() => toggle(item.id)}
              className={cn(
                "relative aspect-square overflow-hidden rounded-md border-2",
                selected ? "border-brand" : "border-transparent"
              )}
            >
              {thumb ? (
                <Image src={thumb} alt="" fill className="object-cover" unoptimized />
              ) : (
                <div className="flex size-full items-center justify-center bg-muted text-muted-foreground">
                  {item.type === "URL" ? <LinkSimple size={16} /> : <NotePencil size={16} />}
                </div>
              )}
              {selected && (
                <div className="absolute right-1 top-1 flex size-4 items-center justify-center rounded-full bg-brand text-brand-foreground">
                  <Check size={10} weight="bold" />
                </div>
              )}
            </button>
          );
        })}
      </div>

      <DialogFooter>
        <Button onClick={() => onConfirm(pending)}>
          Use {pending.length} reference{pending.length === 1 ? "" : "s"}
        </Button>
      </DialogFooter>
    </>
  );
}

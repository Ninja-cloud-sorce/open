"use client";

import Image from "next/image";
import { useSimilarInspirationItems } from "@/features/inspiration/queries";

export function SimilarItemsRow({ itemId, onSelect }: { itemId: string; onSelect: (id: string) => void }) {
  const { data: items = [], isLoading } = useSimilarInspirationItems(itemId);

  if (isLoading) {
    return <p className="text-xs text-muted-foreground">Searching…</p>;
  }

  if (items.length === 0) {
    return <p className="text-xs text-muted-foreground">No similar items found yet.</p>;
  }

  return (
    <div className="flex gap-2 overflow-x-auto pb-1">
      {items.map((item) => {
        const thumb = item.type === "VIDEO" ? item.posterUrl : item.fileUrl;
        return (
          <button
            key={item.id}
            onClick={() => onSelect(item.id)}
            className="relative size-16 shrink-0 overflow-hidden rounded-md border border-border bg-muted"
          >
            {thumb && <Image src={thumb} alt={item.title ?? ""} fill className="object-cover" unoptimized />}
            <span className="absolute bottom-0.5 right-0.5 rounded bg-black/70 px-1 text-[9px] text-white">
              {item.similarity}%
            </span>
          </button>
        );
      })}
    </div>
  );
}

"use client";

import { BookmarkSimple } from "@phosphor-icons/react/dist/ssr";
import { EmptyState } from "@/components/shared/empty-state";
import { InspirationCard } from "@/features/inspiration/components/inspiration-card";
import type { InspirationItemDTO } from "@/features/inspiration/types";

export function InspirationGrid({
  items,
  isLoading,
  onSelect,
}: {
  items: InspirationItemDTO[];
  isLoading: boolean;
  onSelect: (item: InspirationItemDTO) => void;
}) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="aspect-4/3 animate-pulse rounded-lg bg-muted" />
        ))}
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <EmptyState
        icon={BookmarkSimple}
        title="No inspiration yet"
        description="Upload a screenshot or video, save a URL, or jot a note to start building your library."
      />
    );
  }

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
      {items.map((item) => (
        <InspirationCard key={item.id} item={item} onClick={() => onSelect(item)} />
      ))}
    </div>
  );
}

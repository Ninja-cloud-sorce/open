"use client";

import { MagnifyingGlass } from "@phosphor-icons/react/dist/ssr";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useCollections } from "@/features/inspiration/queries";

export function CollectionFilter({
  collectionId,
  onCollectionChange,
  query,
  onQueryChange,
}: {
  collectionId: string | undefined;
  onCollectionChange: (id: string | undefined) => void;
  query: string;
  onQueryChange: (query: string) => void;
}) {
  const { data: collections = [] } = useCollections();

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-wrap gap-1.5">
        <button
          onClick={() => onCollectionChange(undefined)}
          className={cn(
            "rounded-full border px-3 py-1 text-xs font-medium transition-colors duration-fast",
            !collectionId
              ? "border-brand/40 bg-brand/10 text-brand"
              : "border-border text-muted-foreground hover:text-foreground"
          )}
        >
          All
        </button>
        {collections.map((collection) => (
          <button
            key={collection.id}
            onClick={() => onCollectionChange(collection.id)}
            className={cn(
              "rounded-full border px-3 py-1 text-xs font-medium transition-colors duration-fast",
              collectionId === collection.id
                ? "border-brand/40 bg-brand/10 text-brand"
                : "border-border text-muted-foreground hover:text-foreground"
            )}
          >
            {collection.name}
          </button>
        ))}
      </div>

      <div className="relative w-full sm:w-56">
        <MagnifyingGlass size={14} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          placeholder="Search inspiration…"
          className="h-8 pl-8 text-sm"
        />
      </div>
    </div>
  );
}

"use client";

import { useState } from "react";
import { MagnifyingGlass } from "@phosphor-icons/react/dist/ssr";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useCollections, useSmartCollections } from "@/features/inspiration/queries";
import { FiltersSheet, FiltersTrigger } from "@/features/inspiration/components/filters-sheet";
import type { InspirationFilters } from "@/features/inspiration/types";

export function CollectionFilter({
  filters,
  onFiltersChange,
}: {
  filters: InspirationFilters;
  onFiltersChange: (filters: InspirationFilters) => void;
}) {
  const { data: collections = [] } = useCollections();
  const { data: smartCollections = [] } = useSmartCollections();
  const [filtersOpen, setFiltersOpen] = useState(false);

  const facetCount = [filters.industry, filters.layoutStyle, filters.mood].filter(Boolean).length;

  return (
    <div className="space-y-2">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-1.5">
          <button
            onClick={() => onFiltersChange({ ...filters, collectionId: undefined })}
            className={cn(
              "rounded-full border px-3 py-1 text-xs font-medium transition-colors duration-fast",
              !filters.collectionId
                ? "border-brand/40 bg-brand/10 text-brand"
                : "border-border text-muted-foreground hover:text-foreground"
            )}
          >
            All
          </button>
          {collections.map((collection) => (
            <button
              key={collection.id}
              onClick={() => onFiltersChange({ ...filters, collectionId: collection.id })}
              className={cn(
                "rounded-full border px-3 py-1 text-xs font-medium transition-colors duration-fast",
                filters.collectionId === collection.id
                  ? "border-brand/40 bg-brand/10 text-brand"
                  : "border-border text-muted-foreground hover:text-foreground"
              )}
            >
              {collection.name}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <FiltersTrigger activeCount={facetCount} onClick={() => setFiltersOpen(true)} />
          <div className="relative w-full sm:w-56">
            <MagnifyingGlass
              size={14}
              className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground"
            />
            <Input
              value={filters.query ?? ""}
              onChange={(event) => onFiltersChange({ ...filters, query: event.target.value })}
              placeholder="Search inspiration…"
              className="h-8 pl-8 text-sm"
            />
          </div>
        </div>
      </div>

      {smartCollections.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[11px] text-muted-foreground">Smart:</span>
          {smartCollections.map((smart) => (
            <button
              key={smart.value}
              onClick={() =>
                onFiltersChange({
                  ...filters,
                  primaryStyle: filters.primaryStyle === smart.value ? undefined : smart.value,
                })
              }
              className={cn(
                "rounded-full border px-2.5 py-0.5 text-[11px] transition-colors duration-fast",
                filters.primaryStyle === smart.value
                  ? "border-brand/40 bg-brand/10 text-brand"
                  : "border-border text-muted-foreground hover:text-foreground"
              )}
            >
              {smart.value} <span className="text-muted-foreground/70">{smart.count}</span>
            </button>
          ))}
        </div>
      )}

      <FiltersSheet
        open={filtersOpen}
        onOpenChange={setFiltersOpen}
        filters={filters}
        onChange={(next) => onFiltersChange({ ...filters, ...next })}
      />
    </div>
  );
}

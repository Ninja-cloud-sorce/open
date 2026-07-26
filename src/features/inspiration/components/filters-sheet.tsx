"use client";

import { Funnel } from "@phosphor-icons/react/dist/ssr";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { useFacetOptions } from "@/features/inspiration/queries";
import type { SmartCollectionDTO } from "@/features/inspiration/types";

interface FacetFilters {
  industry?: string;
  layoutStyle?: string;
  mood?: string;
}

function FacetGroup({
  label,
  options,
  selected,
  onSelect,
}: {
  label: string;
  options: SmartCollectionDTO[];
  selected?: string;
  onSelect: (value: string | undefined) => void;
}) {
  if (options.length === 0) return null;
  return (
    <div className="space-y-2">
      <h3 className="text-xs font-medium text-foreground">{label}</h3>
      <div className="flex flex-wrap gap-1.5">
        {options.map((option) => (
          <button
            key={option.value}
            onClick={() => onSelect(selected === option.value ? undefined : option.value)}
            className={cn(
              "rounded-full border px-2.5 py-1 text-xs transition-colors duration-fast",
              selected === option.value
                ? "border-brand/40 bg-brand/10 text-brand"
                : "border-border text-muted-foreground hover:text-foreground"
            )}
          >
            {option.value}
            <span className="ml-1 text-muted-foreground/70">{option.count}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

export function FiltersSheet({
  open,
  onOpenChange,
  filters,
  onChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  filters: FacetFilters;
  onChange: (filters: FacetFilters) => void;
}) {
  const { data: facets } = useFacetOptions();
  const activeCount = [filters.industry, filters.layoutStyle, filters.mood].filter(Boolean).length;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex flex-col gap-5 overflow-y-auto p-4">
        <SheetHeader className="p-0">
          <SheetTitle>Filters</SheetTitle>
          <SheetDescription>Narrow by industry, layout, or mood.</SheetDescription>
        </SheetHeader>

        <FacetGroup
          label="Industry"
          options={facets?.industries ?? []}
          selected={filters.industry}
          onSelect={(value) => onChange({ ...filters, industry: value })}
        />
        <FacetGroup
          label="Layout"
          options={facets?.layoutStyles ?? []}
          selected={filters.layoutStyle}
          onSelect={(value) => onChange({ ...filters, layoutStyle: value })}
        />
        <FacetGroup
          label="Mood"
          options={facets?.moods ?? []}
          selected={filters.mood}
          onSelect={(value) => onChange({ ...filters, mood: value })}
        />

        {activeCount > 0 && (
          <Button variant="ghost" size="sm" className="w-fit" onClick={() => onChange({})}>
            Clear filters
          </Button>
        )}
      </SheetContent>
    </Sheet>
  );
}

export function FiltersTrigger({ activeCount, onClick }: { activeCount: number; onClick: () => void }) {
  return (
    <Button variant="outline" size="sm" onClick={onClick} className="h-8 gap-1.5 px-2.5 text-xs">
      <Funnel size={14} />
      Filters
      {activeCount > 0 && (
        <span className="flex size-4 items-center justify-center rounded-full bg-brand text-[10px] text-brand-foreground">
          {activeCount}
        </span>
      )}
    </Button>
  );
}

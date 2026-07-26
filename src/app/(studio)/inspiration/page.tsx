"use client";

import { useState } from "react";
import { Plus } from "@phosphor-icons/react/dist/ssr";
import { Button } from "@/components/ui/button";
import { Reveal } from "@/components/shared/reveal";
import { CollectionFilter } from "@/features/inspiration/components/collection-filter";
import { InspirationGrid } from "@/features/inspiration/components/inspiration-grid";
import { UploadDialog } from "@/features/inspiration/components/upload-dialog";
import { ItemDetailSheet } from "@/features/inspiration/components/item-detail-sheet";
import { SourceLauncher } from "@/features/inspiration/components/source-launcher";
import { useInspirationItems, useInspirationItem } from "@/features/inspiration/queries";
import type { InspirationFilters } from "@/features/inspiration/types";

export default function InspirationPage() {
  const [filters, setFilters] = useState<InspirationFilters>({});
  const [uploadOpen, setUploadOpen] = useState(false);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);

  const { data: items = [], isLoading } = useInspirationItems(filters);
  const { data: selectedItem = null } = useInspirationItem(selectedItemId);

  return (
    <Reveal className="mx-auto max-w-6xl space-y-5 px-6 py-8">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-lg font-semibold tracking-tight text-foreground">Inspiration Library</h1>
          <p className="text-sm text-muted-foreground">
            Screenshots, URLs, notes, and collections you&apos;re drawing from.
          </p>
        </div>
        <Button size="sm" onClick={() => setUploadOpen(true)} className="gap-1.5">
          <Plus size={14} />
          Add
        </Button>
      </div>

      <CollectionFilter filters={filters} onFiltersChange={setFilters} />

      <InspirationGrid items={items} isLoading={isLoading} onSelect={(item) => setSelectedItemId(item.id)} />

      <UploadDialog open={uploadOpen} onOpenChange={setUploadOpen} />
      <ItemDetailSheet
        item={selectedItem}
        onClose={() => setSelectedItemId(null)}
        onSelectId={setSelectedItemId}
      />
      <SourceLauncher />
    </Reveal>
  );
}

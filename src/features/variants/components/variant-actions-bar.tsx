"use client";

import { toast } from "sonner";
import { Star, Trash, MagicWand } from "@phosphor-icons/react/dist/ssr";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useToggleFavorite, useDeleteVariant, useRunRefinementGeneration } from "@/features/variants/queries";
import type { VariantDTO } from "@/features/variants/types";

export function VariantActionsBar({
  variant,
  variantSetId,
  onDeleted,
}: {
  variant: VariantDTO;
  variantSetId: string;
  onDeleted: () => void;
}) {
  const toggleFavorite = useToggleFavorite(variantSetId);
  const deleteVariant = useDeleteVariant(variantSetId);
  const refine = useRunRefinementGeneration(variantSetId);

  const canRefine = variant.kind === "DIRECTION" && variant.refinements.length === 0 && variant.status === "DONE";

  async function handleDelete() {
    await deleteVariant.mutateAsync(variant.id);
    toast.success("Deleted.");
    onDeleted();
  }

  return (
    <div className="flex items-center gap-2 border-b border-border px-4 py-2">
      <Button
        size="sm"
        variant="ghost"
        className="h-7 gap-1.5 px-2 text-xs"
        onClick={() => toggleFavorite.mutate(variant.id)}
      >
        <Star size={13} weight={variant.favorite ? "fill" : "regular"} className={cn(variant.favorite && "text-brand")} />
        {variant.favorite ? "Favorited" : "Favorite"}
      </Button>

      {canRefine && (
        <Button
          size="sm"
          variant="outline"
          className="h-7 gap-1.5 px-2 text-xs"
          onClick={() => refine.mutate(variant.id)}
          disabled={refine.isPending}
        >
          <MagicWand size={12} />
          {refine.isPending ? "Refining…" : "Refine"}
        </Button>
      )}

      <Button size="sm" variant="ghost" className="ml-auto h-7 gap-1.5 px-2 text-xs text-destructive" onClick={handleDelete}>
        <Trash size={13} />
        Delete
      </Button>
    </div>
  );
}

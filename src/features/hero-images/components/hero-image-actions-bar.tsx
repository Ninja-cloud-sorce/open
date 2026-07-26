"use client";

import { toast } from "sonner";
import { ArrowClockwise, Star, MagnifyingGlassPlus, CheckCircle, Trash, MagicWand } from "@phosphor-icons/react/dist/ssr";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  useRegenerateHeroImage,
  useUpscaleHeroImage,
  useToggleHeroFavorite,
  useApplyHeroImage,
  useDeleteHeroImage,
  useCreateTreatments,
} from "@/features/hero-images/queries";
import type { HeroImageDTO } from "@/features/hero-images/types";

export function HeroImageActionsBar({
  image,
  setId,
  onDeleted,
}: {
  image: HeroImageDTO;
  setId: string;
  onDeleted: () => void;
}) {
  const regenerate = useRegenerateHeroImage(setId);
  const upscale = useUpscaleHeroImage(setId);
  const toggleFavorite = useToggleHeroFavorite(setId);
  const apply = useApplyHeroImage(setId);
  const remove = useDeleteHeroImage(setId);
  const createTreatments = useCreateTreatments(setId);

  async function handleDelete() {
    await remove.mutateAsync(image.id);
    toast.success("Deleted.");
    onDeleted();
  }

  return (
    <div className="flex flex-wrap items-center gap-2 border-b border-border px-4 py-2">
      {image.kind === "BASE" && (
        <Button
          size="sm"
          variant="outline"
          className="h-7 gap-1.5 px-2 text-xs"
          onClick={() => regenerate.mutate(image.id)}
          disabled={regenerate.isPending}
        >
          <ArrowClockwise size={12} />
          {regenerate.isPending ? "Regenerating…" : "Regenerate"}
        </Button>
      )}

      <Button
        size="sm"
        variant="outline"
        className="h-7 gap-1.5 px-2 text-xs"
        onClick={() => upscale.mutate(image.id)}
        disabled={upscale.isPending}
        title="Re-renders the same prompt and seed at 2x resolution — not AI super-resolution."
      >
        <MagnifyingGlassPlus size={12} />
        {upscale.isPending ? "Upscaling…" : image.upscaledUrl ? "Re-upscale" : "Upscale"}
      </Button>

      <Button
        size="sm"
        variant="ghost"
        className="h-7 gap-1.5 px-2 text-xs"
        onClick={() => toggleFavorite.mutate(image.id)}
      >
        <Star size={13} weight={image.favorite ? "fill" : "regular"} className={cn(image.favorite && "text-brand")} />
        {image.favorite ? "Favorited" : "Favorite"}
      </Button>

      <Button
        size="sm"
        variant={image.applied ? "default" : "outline"}
        className="h-7 gap-1.5 px-2 text-xs"
        onClick={() => apply.mutate(image.id)}
        disabled={image.applied || apply.isPending}
      >
        <CheckCircle size={13} />
        {image.applied ? "Applied" : "Apply"}
      </Button>

      {image.kind === "BASE" && (
        <Button
          size="sm"
          variant="outline"
          className="h-7 gap-1.5 px-2 text-xs"
          onClick={() => createTreatments.mutate(image.id)}
          disabled={createTreatments.isPending}
        >
          <MagicWand size={12} />
          {createTreatments.isPending ? "Generating…" : image.treatments.length ? "Regenerate treatments" : "Generate treatments"}
        </Button>
      )}

      <Button size="sm" variant="ghost" className="ml-auto h-7 gap-1.5 px-2 text-xs text-destructive" onClick={handleDelete}>
        <Trash size={13} />
        Delete
      </Button>
    </div>
  );
}

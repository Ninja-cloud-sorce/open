"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { GridFour, ArrowLeft } from "@phosphor-icons/react/dist/ssr";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useHotkeys } from "@/hooks/use-hotkeys";
import { useVariantSet, useRunDirectionGeneration, useRunRefinementGeneration } from "@/features/variants/queries";
import { VariantTabBar, flattenVariants } from "@/features/variants/components/variant-tab-bar";
import { VariantFrame } from "@/features/variants/components/variant-frame";
import { VariantGrid } from "@/features/variants/components/variant-grid";
import { VariantActionsBar } from "@/features/variants/components/variant-actions-bar";

export function VariantSetView({ setId }: { setId: string }) {
  const { data: variantSet, isLoading } = useVariantSet(setId);
  const runGeneration = useRunDirectionGeneration(setId);
  const runRefinement = useRunRefinementGeneration(setId);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [gridView, setGridView] = useState(false);

  // Kick off the (already-batched) direction generation the first time this set
  // is opened and its directions are still PENDING — mirrors the Phase 2/3
  // create-then-generate two-step pattern.
  useEffect(() => {
    if (variantSet && variantSet.variants.every((v) => v.status === "PENDING")) {
      runGeneration.mutate();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [variantSet?.id]);

  function jumpTo(index: number) {
    const direction = variantSet?.variants[index];
    if (direction) {
      setActiveId(direction.id);
      setGridView(false);
    }
  }

  useHotkeys("1", () => jumpTo(0));
  useHotkeys("2", () => jumpTo(1));
  useHotkeys("3", () => jumpTo(2));
  useHotkeys("4", () => jumpTo(3));
  useHotkeys("5", () => jumpTo(4));
  useHotkeys("g", () => setGridView((v) => !v));

  if (isLoading || !variantSet) {
    return (
      <div className="space-y-3 p-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  const flat = flattenVariants(variantSet.variants);
  const active = flat.find((v) => v.id === activeId) ?? flat[0];

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between gap-4 border-b border-border px-4 py-2">
        <div className="flex items-center gap-3">
          <Link href="/variants" className="text-muted-foreground hover:text-foreground">
            <ArrowLeft size={16} />
          </Link>
          <span className="text-sm font-medium text-foreground">{variantSet.title}</span>
        </div>
        <Button
          size="sm"
          variant={gridView ? "default" : "outline"}
          className="h-7 gap-1.5 px-2 text-xs"
          onClick={() => setGridView((v) => !v)}
        >
          <GridFour size={13} />
          All {variantSet.variants.length}
        </Button>
      </div>

      <VariantTabBar variants={variantSet.variants} activeId={gridView ? null : active?.id ?? null} onSelect={(id) => {
        setActiveId(id);
        setGridView(false);
      }} />

      {gridView ? (
        <VariantGrid
          directions={variantSet.variants}
          onSelect={(id) => {
            setActiveId(id);
            setGridView(false);
          }}
        />
      ) : (
        active && (
          <>
            <VariantActionsBar
              variant={active}
              variantSetId={setId}
              onDeleted={() => setActiveId(variantSet.variants[0]?.id ?? null)}
            />
            <div className="flex-1 overflow-hidden">
              <VariantFrame
                variant={active}
                onRetry={
                  active.kind === "DIRECTION"
                    ? () => runGeneration.mutate()
                    : () => runRefinement.mutate(active.parentId!)
                }
                retrying={runGeneration.isPending || runRefinement.isPending}
              />
            </div>
          </>
        )
      )}
    </div>
  );
}

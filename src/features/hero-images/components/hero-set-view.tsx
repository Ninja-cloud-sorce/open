"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft } from "@phosphor-icons/react/dist/ssr";
import { Skeleton } from "@/components/ui/skeleton";
import { useHeroImageSet } from "@/features/hero-images/queries";
import { HeroImageThumb } from "@/features/hero-images/components/hero-image-thumb";
import { HeroImagePreview } from "@/features/hero-images/components/hero-image-preview";
import { HeroImageActionsBar } from "@/features/hero-images/components/hero-image-actions-bar";
import type { HeroImageDTO } from "@/features/hero-images/types";

export function HeroSetView({ setId }: { setId: string }) {
  const { data: heroSet, isLoading } = useHeroImageSet(setId);
  const [activeId, setActiveId] = useState<string | null>(null);

  if (isLoading || !heroSet) {
    return (
      <div className="space-y-3 p-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  const bases = heroSet.images;
  const allImages: HeroImageDTO[] = bases.flatMap((base) => [base, ...base.treatments]);
  const active = allImages.find((img) => img.id === activeId) ?? bases[0];
  const activeBase = active.kind === "BASE" ? active : bases.find((base) => base.treatments.some((t) => t.id === active.id));

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-3 border-b border-border px-4 py-2">
        <Link href="/hero-images" className="text-muted-foreground hover:text-foreground">
          <ArrowLeft size={16} />
        </Link>
        <span className="text-sm font-medium text-foreground">{heroSet.title}</span>
      </div>

      <div className="flex gap-2 overflow-x-auto border-b border-border p-3">
        {bases.map((base) => (
          <HeroImageThumb key={base.id} image={base} active={activeBase?.id === base.id} onClick={() => setActiveId(base.id)} />
        ))}
      </div>

      {active && (
        <>
          <HeroImageActionsBar
            image={active}
            setId={setId}
            onDeleted={() => setActiveId(bases.find((b) => b.id !== active.id)?.id ?? null)}
          />

          <div className="flex flex-1 flex-col overflow-hidden">
            <HeroImagePreview key={active.id} image={active} />

            {activeBase && activeBase.treatments.length > 0 && (
              <div className="flex gap-2 overflow-x-auto border-t border-border p-3">
                {activeBase.treatments.map((treatment) => (
                  <HeroImageThumb
                    key={treatment.id}
                    image={treatment}
                    active={active.id === treatment.id}
                    onClick={() => setActiveId(treatment.id)}
                  />
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

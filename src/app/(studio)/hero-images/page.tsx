"use client";

import { useState } from "react";
import Link from "next/link";
import { Plus, Image as ImageIcon } from "@phosphor-icons/react/dist/ssr";
import { Button } from "@/components/ui/button";
import { Reveal } from "@/components/shared/reveal";
import { EmptyState } from "@/components/shared/empty-state";
import { BriefPickerDialog } from "@/features/hero-images/components/brief-picker-dialog";
import { useHeroImageSets } from "@/features/hero-images/queries";

export default function HeroImagesPage() {
  const { data: sets = [], isLoading } = useHeroImageSets();
  const [pickerOpen, setPickerOpen] = useState(false);

  return (
    <Reveal className="mx-auto max-w-4xl space-y-5 px-6 py-8">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-lg font-semibold tracking-tight text-foreground">Hero Image Generator</h1>
          <p className="text-sm text-muted-foreground">Generate and compare hero imagery via Pollinations.</p>
        </div>
        <Button size="sm" onClick={() => setPickerOpen(true)} className="gap-1.5">
          <Plus size={14} />
          Generate
        </Button>
      </div>

      {!isLoading && sets.length === 0 && (
        <EmptyState
          icon={ImageIcon}
          title="No hero image sets yet"
          description="Generate 4 hero image concepts from a saved Prompt Builder brief."
          action={
            <Button size="sm" onClick={() => setPickerOpen(true)}>
              Generate from a brief
            </Button>
          }
        />
      )}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {sets.map((set) => (
          <Link
            key={set.id}
            href={`/hero-images/${set.id}`}
            className="flex flex-col gap-1 rounded-lg border border-border p-4 transition-colors duration-fast hover:border-brand/40"
          >
            <span className="text-sm font-medium text-foreground">{set.title}</span>
            <span className="text-xs text-muted-foreground">From brief: {set.briefTitle}</span>
          </Link>
        ))}
      </div>

      <BriefPickerDialog open={pickerOpen} onOpenChange={setPickerOpen} />
    </Reveal>
  );
}

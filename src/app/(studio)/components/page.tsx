"use client";

import { useState } from "react";
import { Cube, MagnifyingGlass, Sparkle, DownloadSimple } from "@phosphor-icons/react/dist/ssr";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/shared/empty-state";
import { cn } from "@/lib/utils";
import { COMPONENT_CATEGORIES } from "@/features/components/extract";
import { ComponentCard } from "@/features/components/components/component-card";
import { ComponentDetailSheet } from "@/features/components/components/component-detail-sheet";
import { ExtractDialog } from "@/features/components/components/extract-dialog";
import { GenerateDialog } from "@/features/components/components/generate-dialog";
import { useComponents, useToggleComponentFavorite } from "@/features/components/queries";

export default function ComponentExplorerPage() {
  const [category, setCategory] = useState<string | undefined>(undefined);
  const [query, setQuery] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);
  const [extractOpen, setExtractOpen] = useState(false);
  const [generateOpen, setGenerateOpen] = useState(false);

  const { data: components = [], isLoading } = useComponents({ category, query });
  const toggleFavorite = useToggleComponentFavorite();
  const open = components.find((c) => c.id === openId) ?? null;

  return (
    <div className="mx-auto max-w-6xl px-8 py-10">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-4 border-b border-border pb-6">
        <div className="space-y-1.5">
          <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">Library</p>
          <h1 className="font-heading text-3xl tracking-tight text-foreground">Component Explorer</h1>
          <p className="max-w-lg text-sm leading-relaxed text-muted-foreground">
            Save sections from sites you&apos;ve built, or generate new ones. Each keeps its preview, code, and notes.
          </p>
        </div>
        <div className="flex shrink-0 gap-2">
          <Button variant="outline" onClick={() => setExtractOpen(true)} className="gap-1.5">
            <DownloadSimple size={14} />
            Extract
          </Button>
          <Button onClick={() => setGenerateOpen(true)} className="gap-1.5">
            <Sparkle size={14} />
            Generate
          </Button>
        </div>
      </header>

      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-1.5">
          <button
            onClick={() => setCategory(undefined)}
            className={cn(
              "rounded-full border px-3 py-1 text-xs font-medium transition-colors duration-fast",
              !category ? "border-brand/40 bg-brand/10 text-brand" : "border-border text-muted-foreground hover:text-foreground"
            )}
          >
            All
          </button>
          {COMPONENT_CATEGORIES.map((c) => (
            <button
              key={c}
              onClick={() => setCategory(c)}
              className={cn(
                "rounded-full border px-3 py-1 text-xs font-medium transition-colors duration-fast",
                category === c
                  ? "border-brand/40 bg-brand/10 text-brand"
                  : "border-border text-muted-foreground hover:text-foreground"
              )}
            >
              {c}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-56">
          <MagnifyingGlass
            size={14}
            className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search components…"
            className="h-8 pl-8 text-sm"
          />
        </div>
      </div>

      {!isLoading && components.length === 0 && (
        <EmptyState
          icon={Cube}
          title="No components yet"
          description="Extract sections from a site you've built, or generate one from scratch."
          action={
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setExtractOpen(true)}>
                Extract from a project
              </Button>
              <Button size="sm" onClick={() => setGenerateOpen(true)}>
                Generate
              </Button>
            </div>
          }
        />
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {components.map((component, index) => (
          <ComponentCard
            key={component.id}
            component={component}
            index={index}
            onOpen={() => setOpenId(component.id)}
            onFavorite={() => toggleFavorite.mutate(component.id)}
          />
        ))}
      </div>

      <ComponentDetailSheet component={open} onClose={() => setOpenId(null)} />
      <ExtractDialog open={extractOpen} onOpenChange={setExtractOpen} />
      <GenerateDialog open={generateOpen} onOpenChange={setGenerateOpen} />
    </div>
  );
}

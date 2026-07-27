"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Check } from "@phosphor-icons/react/dist/ssr";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { EmptyState } from "@/components/shared/empty-state";
import { Cube } from "@phosphor-icons/react/dist/ssr";
import { cn } from "@/lib/utils";
import { useExtractableVariants, useDetectedSections, useSaveExtractedSections } from "@/features/components/queries";

export function ExtractDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const { data: variants = [] } = useExtractableVariants();
  const [variantId, setVariantId] = useState<string | null>(null);
  const { data: sections = [], isLoading } = useDetectedSections(variantId);
  const [picked, setPicked] = useState<number[]>([]);
  const save = useSaveExtractedSections();

  function reset() {
    setVariantId(null);
    setPicked([]);
  }

  async function handleSave() {
    if (!variantId || picked.length === 0) return;
    await save.mutateAsync({
      variantId,
      selections: picked.map((index) => {
        const section = sections.find((s) => s.index === index)!;
        return { index, name: section.name, category: section.category };
      }),
    });
    toast.success(`Saved ${picked.length} component${picked.length === 1 ? "" : "s"}.`);
    onOpenChange(false);
    reset();
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        onOpenChange(v);
        if (!v) reset();
      }}
    >
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Extract from a project</DialogTitle>
          <DialogDescription>
            Pull sections out of a site you already generated. They keep their styling.
          </DialogDescription>
        </DialogHeader>

        {variants.length === 0 ? (
          <EmptyState
            icon={Cube}
            title="No built sites yet"
            description="Build a full site in a project first, then its sections become available here."
            className="py-8"
          />
        ) : !variantId ? (
          <div className="max-h-80 space-y-1 overflow-y-auto">
            {variants.map((v) => (
              <button
                key={v.id}
                onClick={() => setVariantId(v.id)}
                className="flex w-full flex-col rounded-md px-3 py-2 text-left transition-colors duration-fast hover:bg-muted"
              >
                <span className="text-sm text-foreground">
                  {v.projectName} — {v.styleName}
                </span>
                <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">{v.label}</span>
              </button>
            ))}
          </div>
        ) : (
          <>
            <div className="grid max-h-[26rem] grid-cols-2 gap-2 overflow-y-auto">
              {isLoading && <p className="text-sm text-muted-foreground">Detecting sections…</p>}
              {sections.map((section) => {
                const selected = picked.includes(section.index);
                return (
                  <div
                    key={section.index}
                    role="button"
                    tabIndex={0}
                    onClick={() =>
                      setPicked((prev) =>
                        prev.includes(section.index) ? prev.filter((i) => i !== section.index) : [...prev, section.index]
                      )
                    }
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        setPicked((prev) =>
                          prev.includes(section.index) ? prev.filter((i) => i !== section.index) : [...prev, section.index]
                        );
                      }
                    }}
                    className={cn(
                      "relative cursor-pointer overflow-hidden rounded-md border-2",
                      selected ? "border-brand" : "border-border hover:border-foreground/25"
                    )}
                  >
                    <div className="relative h-28 overflow-hidden bg-white">
                      <div className="pointer-events-none absolute inset-0 origin-top-left scale-[0.28] [height:357%] [width:357%]">
                        <iframe
                          srcDoc={section.previewDoc}
                          sandbox="allow-scripts"
                          title={section.name}
                          className="h-full w-full border-0"
                        />
                      </div>
                    </div>
                    <div className="flex items-center justify-between gap-2 border-t border-border px-2 py-1.5">
                      <span className="truncate text-xs text-foreground">{section.name}</span>
                      <Badge variant="secondary" className="shrink-0 text-[9.5px]">
                        {section.category}
                      </Badge>
                    </div>
                    {selected && (
                      <span className="absolute right-1.5 top-1.5 flex size-4 items-center justify-center rounded-full bg-brand text-brand-foreground">
                        <Check size={10} weight="bold" />
                      </span>
                    )}
                  </div>
                );
              })}
            </div>

            <DialogFooter>
              <Button variant="ghost" size="sm" onClick={reset}>
                Back
              </Button>
              <Button onClick={handleSave} disabled={picked.length === 0 || save.isPending}>
                {save.isPending ? "Saving…" : `Save ${picked.length || ""}`}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

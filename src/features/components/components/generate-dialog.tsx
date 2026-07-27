"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Sparkle } from "@phosphor-icons/react/dist/ssr";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { COMPONENT_CATEGORIES } from "@/features/components/extract";
import { useExtractableVariants, useRunComponentGeneration } from "@/features/components/queries";

export function GenerateDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const { data: variants = [] } = useExtractableVariants();
  const generate = useRunComponentGeneration();

  const [category, setCategory] = useState<string>("Hero");
  const [styleNotes, setStyleNotes] = useState("");
  const [variantId, setVariantId] = useState<string | undefined>(undefined);

  async function handleGenerate() {
    const result = await generate.mutateAsync({ category, styleNotes, variantId });
    if ("error" in result) {
      toast.error(result.error);
      return;
    }
    toast.success("Component generated.");
    onOpenChange(false);
    setStyleNotes("");
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Generate a component</DialogTitle>
          <DialogDescription>Describe what you want. Optionally match an existing project&apos;s design system.</DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <Select value={category} onValueChange={(v) => setCategory(String(v))}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Category">{(v) => String(v ?? "Category")}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              {COMPONENT_CATEGORIES.map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Textarea
            value={styleNotes}
            onChange={(e) => setStyleNotes(e.target.value)}
            placeholder="e.g. warm editorial, serif headings, generous whitespace, one muted accent"
            rows={3}
          />

          {variants.length > 0 && (
            <div className="space-y-1.5">
              <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                Match a design system
              </p>
              <div className="flex flex-wrap gap-1.5">
                <button
                  onClick={() => setVariantId(undefined)}
                  className={cn(
                    "rounded-full border px-2.5 py-1 text-[11px] transition-colors duration-fast",
                    !variantId ? "border-brand/40 bg-brand/10 text-brand" : "border-border text-muted-foreground hover:text-foreground"
                  )}
                >
                  None
                </button>
                {variants.slice(0, 6).map((v) => (
                  <button
                    key={v.id}
                    onClick={() => setVariantId(v.id)}
                    className={cn(
                      "rounded-full border px-2.5 py-1 text-[11px] transition-colors duration-fast",
                      variantId === v.id
                        ? "border-brand/40 bg-brand/10 text-brand"
                        : "border-border text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {v.styleName}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button onClick={handleGenerate} disabled={generate.isPending} className="gap-1.5">
            <Sparkle size={14} />
            {generate.isPending ? "Generating…" : "Generate"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

"use client";

import { toast } from "sonner";
import { Copy, Sparkle, MagicWand } from "@phosphor-icons/react/dist/ssr";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useComposeOutputPrompt, useEnhanceOutputPrompt } from "@/features/prompts/queries";

export function OutputPromptPanel({ briefId, outputPrompt }: { briefId: string; outputPrompt: string | null }) {
  const compose = useComposeOutputPrompt();
  const enhance = useEnhanceOutputPrompt();

  async function handleCopy() {
    if (!outputPrompt) return;
    await navigator.clipboard.writeText(outputPrompt);
    toast.success("Copied to clipboard.");
  }

  async function handleEnhance() {
    const result = await enhance.mutateAsync(briefId);
    if (result.skipped) {
      toast.info("Set GEMINI_API_KEY to enable AI polish. Composed prompt is unchanged.");
    } else {
      toast.success("Polished with AI.");
    }
  }

  return (
    <div className="space-y-2 border-t border-border pt-5">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-medium text-foreground">Output Prompt</h3>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            className="h-7 gap-1.5 px-2 text-xs"
            onClick={() => compose.mutate(briefId)}
            disabled={compose.isPending}
          >
            <Sparkle size={12} />
            {compose.isPending ? "Composing…" : "Compose"}
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="h-7 gap-1.5 px-2 text-xs"
            onClick={handleEnhance}
            disabled={enhance.isPending || !outputPrompt}
          >
            <MagicWand size={12} />
            {enhance.isPending ? "Polishing…" : "Enhance with AI"}
          </Button>
          <Button size="sm" className="h-7 gap-1.5 px-2 text-xs" onClick={handleCopy} disabled={!outputPrompt}>
            <Copy size={12} />
            Copy
          </Button>
        </div>
      </div>

      <Textarea
        value={outputPrompt ?? ""}
        readOnly
        placeholder="Fill in sections above, then Compose to assemble the final prompt."
        rows={10}
        className="bg-muted/30 font-mono text-xs"
      />
    </div>
  );
}

"use client";

import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { EmptyState } from "@/components/shared/empty-state";
import { Sparkle } from "@phosphor-icons/react/dist/ssr";
import { usePromptBriefs } from "@/features/prompts/queries";
import { useCreateHeroImageSet } from "@/features/hero-images/queries";

export function BriefPickerDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const { data: briefs = [] } = usePromptBriefs();
  const create = useCreateHeroImageSet();
  const router = useRouter();

  async function handlePick(briefId: string) {
    const set = await create.mutateAsync(briefId);
    onOpenChange(false);
    router.push(`/hero-images/${set.id}`);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Generate hero images from a brief</DialogTitle>
          <DialogDescription>Pick a Prompt Builder brief to generate 4 hero concepts from.</DialogDescription>
        </DialogHeader>

        {briefs.length === 0 ? (
          <EmptyState
            icon={Sparkle}
            title="No briefs yet"
            description="Create one in the Prompt Builder first."
            className="py-6"
          />
        ) : (
          <div className="max-h-72 space-y-1 overflow-y-auto">
            {briefs.map((brief) => (
              <button
                key={brief.id}
                onClick={() => handlePick(brief.id)}
                disabled={create.isPending}
                className="flex w-full flex-col rounded-md px-3 py-2 text-left text-sm transition-colors duration-fast hover:bg-muted disabled:opacity-50"
              >
                <span className="text-foreground">{brief.title}</span>
                <span className="text-xs text-muted-foreground">
                  {brief.referenceCount} reference{brief.referenceCount === 1 ? "" : "s"}
                </span>
              </button>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

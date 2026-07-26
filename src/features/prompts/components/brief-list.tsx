"use client";

import { Sparkle, Plus } from "@phosphor-icons/react/dist/ssr";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/shared/empty-state";
import { cn } from "@/lib/utils";
import { usePromptBriefs, useCreatePromptBrief } from "@/features/prompts/queries";

export function BriefList({
  selectedId,
  onSelect,
}: {
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  const { data: briefs = [], isLoading } = usePromptBriefs();
  const create = useCreatePromptBrief();

  async function handleCreate() {
    const brief = await create.mutateAsync();
    onSelect(brief.id);
  }

  return (
    <div className="flex h-full w-64 shrink-0 flex-col border-r border-border">
      <div className="flex items-center justify-between border-b border-border p-3">
        <h2 className="text-xs font-medium text-foreground">Briefs</h2>
        <Button size="icon-sm" variant="ghost" onClick={handleCreate} disabled={create.isPending}>
          <Plus size={14} />
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {!isLoading && briefs.length === 0 && (
          <EmptyState
            icon={Sparkle}
            title="No briefs yet"
            description="Start one to assemble a structured design prompt."
            className="px-4 py-10"
          />
        )}

        {briefs.map((brief) => (
          <button
            key={brief.id}
            onClick={() => onSelect(brief.id)}
            className={cn(
              "flex w-full flex-col gap-0.5 border-b border-border px-3 py-2.5 text-left transition-colors duration-fast hover:bg-muted/50",
              selectedId === brief.id && "bg-muted"
            )}
          >
            <span className="line-clamp-1 text-sm text-foreground">{brief.title}</span>
            <span className="text-[11px] text-muted-foreground">
              {brief.referenceCount} reference{brief.referenceCount === 1 ? "" : "s"}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

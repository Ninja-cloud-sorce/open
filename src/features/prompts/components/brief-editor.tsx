"use client";

import { useState } from "react";
import Image from "next/image";
import { toast } from "sonner";
import { Trash, X, MagicWand, Sparkle } from "@phosphor-icons/react/dist/ssr";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/shared/empty-state";
import { ReferencePicker } from "@/features/prompts/components/reference-picker";
import { OutputPromptPanel } from "@/features/prompts/components/output-prompt-panel";
import { usePromptBrief, useUpdatePromptBrief, useDeletePromptBrief, useAutofillBrief } from "@/features/prompts/queries";
import type { PromptBriefDTO, PromptBriefFields } from "@/features/prompts/types";

const SECTION_FIELDS: { key: keyof PromptBriefFields; label: string; placeholder: string }[] = [
  { key: "aesthetic", label: "Aesthetic", placeholder: "e.g. Swiss minimalism, warm editorial" },
  { key: "intent", label: "Intent", placeholder: "What should this design accomplish?" },
  { key: "audience", label: "Audience", placeholder: "Who is this for?" },
  { key: "constraints", label: "Constraints", placeholder: "Brand colors, stack, must-haves" },
  { key: "guardRails", label: "Guard Rails", placeholder: "Boundaries to stay within" },
  { key: "negativePrompt", label: "Negative Prompt", placeholder: "What to explicitly avoid" },
  { key: "componentStyle", label: "Component Style", placeholder: "How buttons, cards, nav should feel" },
  { key: "motionStyle", label: "Motion Style", placeholder: "Animation character" },
  { key: "typographyStyle", label: "Typography Style", placeholder: "Type direction" },
];

export function BriefEditor({ briefId }: { briefId: string | null }) {
  if (!briefId) {
    return (
      <EmptyState
        icon={Sparkle}
        title="Select or start a brief"
        description="Pick a saved brief on the left, or create a new one to assemble a structured design prompt."
        className="flex-1"
      />
    );
  }
  return <BriefEditorLoader briefId={briefId} />;
}

function BriefEditorLoader({ briefId }: { briefId: string }) {
  const { data: brief, isLoading } = usePromptBrief(briefId);

  if (isLoading || !brief) {
    return (
      <div className="flex-1 space-y-4 p-6">
        <Skeleton className="h-7 w-64" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  return <BriefEditorForm key={brief.id} brief={brief} />;
}

function BriefEditorForm({ brief }: { brief: PromptBriefDTO }) {
  const update = useUpdatePromptBrief();
  const remove = useDeletePromptBrief();
  const autofill = useAutofillBrief();

  const [title, setTitle] = useState(brief.title);
  const [fields, setFields] = useState<Record<string, string>>(
    Object.fromEntries(SECTION_FIELDS.map((f) => [f.key, brief[f.key] ?? ""]))
  );
  const [pickerOpen, setPickerOpen] = useState(false);

  function saveField(key: string, value: string) {
    update.mutate({ id: brief.id, input: { [key]: value || null } });
  }

  async function handleDelete() {
    await remove.mutateAsync(brief.id);
    toast.success("Brief deleted.");
  }

  async function handleAutofill() {
    const updated = await autofill.mutateAsync(brief.id);
    if (updated) {
      setFields(Object.fromEntries(SECTION_FIELDS.map((f) => [f.key, updated[f.key] ?? ""])));
      toast.success("Autofilled from references.");
    }
  }

  function handleReferencesChange(referenceIds: string[]) {
    update.mutate({ id: brief.id, input: { referenceIds } });
  }

  return (
    <div className="flex-1 space-y-6 overflow-y-auto p-6">
      <div className="flex items-start justify-between gap-4">
        <Input
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          onBlur={() => saveField("title", title)}
          className="border-none px-0 text-lg font-semibold shadow-none focus-visible:ring-0"
        />
        <Button variant="ghost" size="sm" className="shrink-0 text-destructive" onClick={handleDelete}>
          <Trash size={14} />
          Delete
        </Button>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-medium text-foreground">References</h3>
          <div className="flex items-center gap-2">
            {brief.references.length > 0 && (
              <Button
                size="sm"
                variant="outline"
                className="h-7 gap-1.5 px-2 text-xs"
                onClick={handleAutofill}
                disabled={autofill.isPending}
              >
                <MagicWand size={12} />
                {autofill.isPending ? "Autofilling…" : "Autofill from references"}
              </Button>
            )}
            <Button size="sm" variant="outline" className="h-7 px-2 text-xs" onClick={() => setPickerOpen(true)}>
              Pick references
            </Button>
          </div>
        </div>

        {brief.references.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {brief.references.map((reference) => {
              const thumb = reference.type === "VIDEO" ? reference.posterUrl : reference.fileUrl;
              return (
                <div key={reference.id} className="flex items-center gap-1.5 rounded-full border border-border py-1 pl-1 pr-2">
                  <div className="relative size-5 shrink-0 overflow-hidden rounded-full bg-muted">
                    {thumb && <Image src={thumb} alt="" fill className="object-cover" unoptimized />}
                  </div>
                  <span className="max-w-32 truncate text-xs text-muted-foreground">
                    {reference.title || reference.sourceUrl || "Untitled"}
                  </span>
                  <button
                    onClick={() =>
                      handleReferencesChange(brief.references.filter((r) => r.id !== reference.id).map((r) => r.id))
                    }
                    className="text-muted-foreground hover:text-foreground"
                  >
                    <X size={10} />
                  </button>
                </div>
              );
            })}
          </div>
        )}

        <ReferencePicker
          open={pickerOpen}
          onOpenChange={setPickerOpen}
          selectedIds={brief.references.map((r) => r.id)}
          onConfirm={handleReferencesChange}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {SECTION_FIELDS.map((section) => (
          <div key={section.key} className="space-y-1.5">
            <label className="text-xs font-medium text-foreground">{section.label}</label>
            <Textarea
              value={fields[section.key]}
              placeholder={section.placeholder}
              onChange={(event) => setFields((prev) => ({ ...prev, [section.key]: event.target.value }))}
              onBlur={() => saveField(section.key, fields[section.key])}
              rows={3}
              className="text-sm"
            />
          </div>
        ))}
      </div>

      <OutputPromptPanel briefId={brief.id} outputPrompt={brief.outputPrompt} />
    </div>
  );
}

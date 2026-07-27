"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Copy, Trash } from "@phosphor-icons/react/dist/ssr";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from "@/components/ui/sheet";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ComponentFrame, buildDoc } from "@/features/components/components/component-frame";
import { COMPONENT_CATEGORIES } from "@/features/components/extract";
import { useUpdateComponent, useDeleteComponent } from "@/features/components/queries";
import type { ComponentDTO } from "@/features/components/types";

export function ComponentDetailSheet({
  component,
  onClose,
}: {
  component: ComponentDTO | null;
  onClose: () => void;
}) {
  return (
    <Sheet open={Boolean(component)} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="flex w-full flex-col gap-4 overflow-y-auto p-4 sm:max-w-xl">
        <SheetHeader className="p-0">
          <SheetTitle>Component</SheetTitle>
          <SheetDescription>Preview, copy the code, and keep your own notes.</SheetDescription>
        </SheetHeader>
        {component && <DetailBody key={component.id} component={component} onClose={onClose} />}
      </SheetContent>
    </Sheet>
  );
}

function DetailBody({ component, onClose }: { component: ComponentDTO; onClose: () => void }) {
  const update = useUpdateComponent();
  const remove = useDeleteComponent();

  const [name, setName] = useState(component.name);
  const [category, setCategory] = useState<string>(component.category);
  const [notes, setNotes] = useState(component.notes ?? "");
  const [tags, setTags] = useState(component.tags.map((t) => t.name).join(", "));

  async function copy(text: string, label: string) {
    await navigator.clipboard.writeText(text);
    toast.success(`${label} copied.`);
  }

  async function save() {
    await update.mutateAsync({
      id: component.id,
      input: { name, category, notes, tagNames: tags.split(",").map((t) => t.trim()).filter(Boolean) },
    });
    toast.success("Saved.");
  }

  const styles = component.css.includes("<!--fonts-->") ? component.css.split("\n<!--fonts-->\n")[1] : component.css;

  return (
    <>
      <div className="h-72 overflow-hidden rounded-lg border border-border bg-white">
        <ComponentFrame html={component.html} css={component.css} title={component.name} />
      </div>

      <Tabs defaultValue="markup">
        <TabsList className="w-full">
          <TabsTrigger value="markup">Markup</TabsTrigger>
          <TabsTrigger value="styles">Stylesheet</TabsTrigger>
          <TabsTrigger value="full">Full page</TabsTrigger>
        </TabsList>

        {[
          { value: "markup", code: component.html, label: "Markup" },
          { value: "styles", code: styles, label: "Stylesheet" },
          { value: "full", code: buildDoc(component.html, component.css), label: "Full document" },
        ].map((tab) => (
          <TabsContent key={tab.value} value={tab.value} className="mt-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                {tab.code.length.toLocaleString()} chars
              </span>
              <Button size="sm" variant="outline" className="h-7 gap-1.5 px-2 text-xs" onClick={() => copy(tab.code, tab.label)}>
                <Copy size={12} />
                Copy
              </Button>
            </div>
            <pre className="max-h-56 overflow-auto rounded-md border border-border bg-muted/30 p-3 text-[11px] leading-relaxed">
              <code>{tab.code.slice(0, 8000)}</code>
            </pre>
          </TabsContent>
        ))}
      </Tabs>

      <Separator />

      <div className="space-y-3">
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Name" />
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
        <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Notes" rows={3} />
        <Input value={tags} onChange={(e) => setTags(e.target.value)} placeholder="Tags, comma separated" />

        {component.prompt && (
          <p className="text-[11px] leading-relaxed text-muted-foreground">
            <span className="font-medium text-foreground">Origin:</span> {component.prompt}
          </p>
        )}
        {component.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {component.tags.map((t) => (
              <Badge key={t.id} variant="outline" className="text-[10px] text-muted-foreground">
                {t.name}
              </Badge>
            ))}
          </div>
        )}
      </div>

      <SheetFooter className="mt-auto flex-row justify-between gap-2 p-0">
        <Button
          variant="ghost"
          size="sm"
          className="text-destructive"
          onClick={async () => {
            await remove.mutateAsync(component.id);
            toast.success("Deleted.");
            onClose();
          }}
        >
          <Trash size={14} />
          Delete
        </Button>
        <Button size="sm" onClick={save} disabled={update.isPending}>
          {update.isPending ? "Saving…" : "Save"}
        </Button>
      </SheetFooter>
    </>
  );
}

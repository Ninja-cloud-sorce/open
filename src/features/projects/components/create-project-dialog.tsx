"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import Image from "next/image";
import { Check } from "@phosphor-icons/react/dist/ssr";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { useInspirationItems } from "@/features/inspiration/queries";
import { useCreateProject } from "@/features/projects/queries";

export function CreateProjectDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const router = useRouter();
  const create = useCreateProject();
  const { data: items = [] } = useInspirationItems({});

  const [name, setName] = useState("");
  const [serviceType, setServiceType] = useState("");
  const [description, setDescription] = useState("");
  const [audience, setAudience] = useState("");
  const [designNotes, setDesignNotes] = useState("");
  const [referenceIds, setReferenceIds] = useState<string[]>([]);

  async function handleCreate() {
    if (!name.trim()) {
      toast.error("Give the project a name.");
      return;
    }
    const project = await create.mutateAsync({
      name: name.trim(),
      serviceType,
      description,
      audience,
      designNotes,
      referenceIds,
    });
    onOpenChange(false);
    router.push(`/projects/${project.id}`);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>New project</DialogTitle>
          <DialogDescription>
            Describe what you&apos;re building and what you&apos;re drawing from. Everything downstream reads from this.
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-[60vh] space-y-3 overflow-y-auto pr-1">
          <Input placeholder="Project name" value={name} onChange={(e) => setName(e.target.value)} />
          <Input
            placeholder="Service type — e.g. medical practice, hotel management"
            value={serviceType}
            onChange={(e) => setServiceType(e.target.value)}
          />
          <Textarea
            placeholder="What does this business do?"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
          />
          <Input placeholder="Who is it for?" value={audience} onChange={(e) => setAudience(e.target.value)} />
          <Textarea
            placeholder="Design language you're after — mood, references, anything to avoid"
            value={designNotes}
            onChange={(e) => setDesignNotes(e.target.value)}
            rows={2}
          />

          {items.length > 0 && (
            <div className="space-y-1.5">
              <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                Inspiration references
              </p>
              <div className="grid grid-cols-5 gap-1.5">
                {items.slice(0, 20).map((item) => {
                  const thumb = item.type === "VIDEO" ? item.posterUrl : item.fileUrl;
                  const selected = referenceIds.includes(item.id);
                  return (
                    <button
                      key={item.id}
                      onClick={() =>
                        setReferenceIds((prev) =>
                          prev.includes(item.id) ? prev.filter((v) => v !== item.id) : [...prev, item.id]
                        )
                      }
                      className={cn(
                        "relative aspect-square overflow-hidden rounded-md border-2 bg-muted",
                        selected ? "border-brand" : "border-transparent"
                      )}
                    >
                      {thumb && <Image src={thumb} alt="" fill className="object-cover" unoptimized />}
                      {selected && (
                        <span className="absolute right-1 top-1 flex size-3.5 items-center justify-center rounded-full bg-brand text-brand-foreground">
                          <Check size={9} weight="bold" />
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button onClick={handleCreate} disabled={create.isPending}>
            {create.isPending ? "Creating…" : "Create project"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

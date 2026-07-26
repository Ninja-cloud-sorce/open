"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { useCreateInspirationSource } from "@/features/inspiration/queries";

export function AddSourceDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const create = useCreateInspirationSource();

  async function handleSubmit() {
    if (!name || !url) {
      toast.error("Name and URL are both required.");
      return;
    }
    await create.mutateAsync({ name, url });
    setName("");
    setUrl("");
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xs">
        <DialogHeader>
          <DialogTitle>Add inspiration source</DialogTitle>
          <DialogDescription>Its favicon is fetched automatically and appears in the launcher.</DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <Input placeholder="Name (e.g. Dribbble)" value={name} onChange={(event) => setName(event.target.value)} />
          <Input placeholder="dribbble.com" value={url} onChange={(event) => setUrl(event.target.value)} />
        </div>

        <DialogFooter>
          <Button onClick={handleSubmit} disabled={create.isPending}>
            {create.isPending ? "Adding…" : "Add"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

"use client";

import { useRef, useState } from "react";
import { toast } from "sonner";
import { UploadSimple } from "@phosphor-icons/react/dist/ssr";
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
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { captureVideoPoster } from "@/features/inspiration/lib/capture-poster";
import { useUploadInspirationItem, useRunAnalysis, useCreateUrlOrNoteItem } from "@/features/inspiration/queries";

export function UploadDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const [tab, setTab] = useState("upload");
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const upload = useUploadInspirationItem();
  const analyze = useRunAnalysis();
  const createUrlOrNote = useCreateUrlOrNoteItem();

  const busy = upload.isPending || createUrlOrNote.isPending;

  function reset() {
    setFile(null);
    setTitle("");
    setDescription("");
    setSourceUrl("");
    setTab("upload");
  }

  async function handleSubmit() {
    try {
      if (tab === "upload") {
        if (!file) {
          toast.error("Choose a file first.");
          return;
        }
        const isVideo = file.type.startsWith("video/");
        const formData = new FormData();
        formData.set("type", isVideo ? "VIDEO" : "IMAGE");
        formData.set("file", file);
        if (title) formData.set("title", title);
        if (isVideo) {
          const poster = await captureVideoPoster(file);
          formData.set("poster", new File([poster], "poster.jpg", { type: "image/jpeg" }));
        }
        const item = await upload.mutateAsync(formData);
        onOpenChange(false);
        reset();
        analyze.mutate(item.id);
      } else if (tab === "url") {
        if (!sourceUrl) {
          toast.error("Enter a URL.");
          return;
        }
        await createUrlOrNote.mutateAsync({ type: "URL", sourceUrl, title, description });
        onOpenChange(false);
        reset();
      } else {
        if (!title && !description) {
          toast.error("Write something first.");
          return;
        }
        await createUrlOrNote.mutateAsync({ type: "NOTE", title, description });
        onOpenChange(false);
        reset();
      }
    } catch {
      toast.error("Something went wrong. Try again.");
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add inspiration</DialogTitle>
          <DialogDescription>Upload a screenshot or video, save a URL, or jot a note.</DialogDescription>
        </DialogHeader>

        <Tabs value={tab} onValueChange={(value) => setTab(String(value))}>
          <TabsList className="w-full">
            <TabsTrigger value="upload">Upload</TabsTrigger>
            <TabsTrigger value="url">Save URL</TabsTrigger>
            <TabsTrigger value="note">Add note</TabsTrigger>
          </TabsList>

          <TabsContent value="upload" className="mt-3 space-y-3">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(event) => event.preventDefault()}
              onDrop={(event) => {
                event.preventDefault();
                const dropped = event.dataTransfer.files[0];
                if (dropped) setFile(dropped);
              }}
              className="flex w-full flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border py-8 text-center text-sm text-muted-foreground transition-colors duration-fast hover:border-brand/40 hover:text-foreground"
            >
              <UploadSimple size={20} />
              {file ? file.name : "Drop a file, or click to choose"}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,video/*"
              className="hidden"
              onChange={(event) => setFile(event.target.files?.[0] ?? null)}
            />
            <Input placeholder="Title (optional)" value={title} onChange={(event) => setTitle(event.target.value)} />
          </TabsContent>

          <TabsContent value="url" className="mt-3 space-y-3">
            <Input
              placeholder="https://…"
              value={sourceUrl}
              onChange={(event) => setSourceUrl(event.target.value)}
            />
            <Input placeholder="Title (optional)" value={title} onChange={(event) => setTitle(event.target.value)} />
            <Textarea
              placeholder="Notes (optional)"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
            />
          </TabsContent>

          <TabsContent value="note" className="mt-3 space-y-3">
            <Input placeholder="Title" value={title} onChange={(event) => setTitle(event.target.value)} />
            <Textarea
              placeholder="What's the idea?"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              rows={4}
            />
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button onClick={handleSubmit} disabled={busy}>
            {busy ? "Adding…" : "Add"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

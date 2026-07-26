"use client";

import { useRef, useState } from "react";
import { toast } from "sonner";
import { Camera, LinkSimple, Check } from "@phosphor-icons/react/dist/ssr";
import { cn } from "@/lib/utils";
import { uploadInspirationItem, createUrlOrNoteItem } from "@/features/inspiration/actions";
import { runAnalysis } from "@/features/inspiration/actions";
import { captureVideoPoster } from "@/features/inspiration/lib/capture-poster";

type Mode = "upload" | "link";

/** Phone capture surface — deliberately outside the studio shell: no sidebar,
 *  large touch targets, one thing on screen at a time. */
export default function CapturePage() {
  const [mode, setMode] = useState<Mode>("upload");
  const [file, setFile] = useState<File | null>(null);
  const [url, setUrl] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [busy, setBusy] = useState(false);
  const [savedCount, setSavedCount] = useState(0);
  const fileRef = useRef<HTMLInputElement>(null);

  function reset() {
    setFile(null);
    setUrl("");
    setTitle("");
    setDescription("");
  }

  async function handleSave() {
    setBusy(true);
    try {
      if (mode === "upload") {
        if (!file) {
          toast.error("Pick a photo or video first.");
          return;
        }
        const isVideo = file.type.startsWith("video/");
        const formData = new FormData();
        formData.set("type", isVideo ? "VIDEO" : "IMAGE");
        formData.set("file", file);
        if (title) formData.set("title", title);
        if (isVideo) {
          const poster = await captureVideoPoster(file).catch(() => null);
          if (poster) formData.set("poster", new File([poster], "poster.jpg", { type: "image/jpeg" }));
        }
        const item = await uploadInspirationItem(formData);
        reset();
        setSavedCount((n) => n + 1);
        toast.success("Saved — analysing in the background.");
        void runAnalysis(item.id);
      } else {
        if (!url.trim()) {
          toast.error("Paste a link first.");
          return;
        }
        await createUrlOrNoteItem({
          type: "URL",
          sourceUrl: url.trim(),
          title: title.trim(),
          description: description.trim(),
        });
        reset();
        setSavedCount((n) => n + 1);
        toast.success("Link saved to your library.");
      }
    } catch {
      toast.error("Something went wrong. Try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto min-h-[100dvh] w-full max-w-md px-5 py-8">
      <header className="mb-6">
        <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Design Studio</p>
        <h1 className="mt-1.5 font-heading text-2xl tracking-tight text-foreground">Add inspiration</h1>
        <p className="mt-1.5 text-sm text-muted-foreground">
          Saves straight to your library. Keep this page open and add as many as you like.
        </p>
      </header>

      <div className="mb-5 grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-border bg-border">
        {(["upload", "link"] as Mode[]).map((m) => (
          <button
            key={m}
            onClick={() => setMode(m)}
            className={cn(
              "flex items-center justify-center gap-2 bg-background py-3 text-sm font-medium transition-colors",
              mode === m ? "text-brand" : "text-muted-foreground"
            )}
          >
            {m === "upload" ? <Camera size={17} /> : <LinkSimple size={17} />}
            {m === "upload" ? "Photo / video" : "Link"}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {mode === "upload" ? (
          <>
            <button
              onClick={() => fileRef.current?.click()}
              className="flex min-h-40 w-full flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border px-4 text-center text-sm text-muted-foreground active:scale-[0.99]"
            >
              <Camera size={26} />
              {file ? (
                <span className="break-all px-2 text-foreground">{file.name}</span>
              ) : (
                <span>Tap to choose from your camera roll</span>
              )}
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/*,video/*"
              className="hidden"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
          </>
        ) : (
          <input
            inputMode="url"
            autoCapitalize="off"
            autoCorrect="off"
            placeholder="Paste the site or post URL"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            className="w-full rounded-xl border border-border bg-background px-4 py-3.5 text-base outline-none focus:border-brand"
          />
        )}

        <input
          placeholder="Title (optional)"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full rounded-xl border border-border bg-background px-4 py-3.5 text-base outline-none focus:border-brand"
        />

        <textarea
          placeholder="What do you like about it?"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={4}
          className="w-full resize-none rounded-xl border border-border bg-background px-4 py-3.5 text-base outline-none focus:border-brand"
        />

        <button
          onClick={handleSave}
          disabled={busy}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand py-4 text-base font-medium text-brand-foreground transition-transform active:scale-[0.99] disabled:opacity-50"
        >
          {busy ? "Saving…" : "Save to library"}
        </button>

        {savedCount > 0 && (
          <p className="flex items-center justify-center gap-1.5 pt-1 text-xs text-muted-foreground">
            <Check size={13} className="text-brand" />
            {savedCount} saved this session
          </p>
        )}
      </div>
    </main>
  );
}

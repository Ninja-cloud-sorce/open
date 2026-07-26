"use client";

import { useState } from "react";
import { CircleNotch, WarningCircle, ArrowClockwise } from "@phosphor-icons/react/dist/ssr";
import type { HeroImageDTO } from "@/features/hero-images/types";

/** Full-size preview. Keyed by image.id at the call site so switching images resets load state. */
export function HeroImagePreview({ image }: { image: HeroImageDTO }) {
  const [loaded, setLoaded] = useState(false);
  const [errored, setErrored] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const src = image.upscaledUrl ?? image.imageUrl;

  return (
    <div className="relative flex flex-1 items-center justify-center overflow-hidden bg-muted/20 p-4">
      {!errored && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={attempt}
          src={src}
          alt={image.conceptName}
          className="max-h-full max-w-full rounded-md object-contain"
          onLoad={() => setLoaded(true)}
          onError={() => setErrored(true)}
        />
      )}

      {!loaded && !errored && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-muted-foreground">
          <CircleNotch size={22} className="animate-spin" />
          <span className="text-xs">Generating — new prompts can take up to a minute.</span>
        </div>
      )}

      {errored && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-center">
          <WarningCircle size={22} className="text-destructive" />
          <p className="text-xs text-muted-foreground">Image failed to load.</p>
          <button
            onClick={() => {
              setErrored(false);
              setLoaded(false);
              setAttempt((n) => n + 1);
            }}
            className="flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1 text-xs text-foreground hover:bg-muted"
          >
            <ArrowClockwise size={12} />
            Retry
          </button>
        </div>
      )}
    </div>
  );
}

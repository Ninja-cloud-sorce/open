"use client";

import { useState } from "react";
import { CircleNotch, Star, CheckCircle, WarningCircle, ArrowClockwise } from "@phosphor-icons/react/dist/ssr";
import { cn } from "@/lib/utils";
import type { HeroImageDTO } from "@/features/hero-images/types";

export function HeroImageThumb({
  image,
  active,
  onClick,
}: {
  image: HeroImageDTO;
  active: boolean;
  onClick: () => void;
}) {
  const [loaded, setLoaded] = useState(false);
  const [errored, setErrored] = useState(false);
  const [attempt, setAttempt] = useState(0);

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(event) => (event.key === "Enter" || event.key === " ") && onClick()}
      className={cn(
        "relative aspect-video w-40 shrink-0 cursor-pointer overflow-hidden rounded-md border-2 bg-muted/40 text-left",
        active ? "border-brand" : "border-transparent hover:border-border"
      )}
    >
      {!errored && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={attempt}
          src={image.imageUrl}
          alt={image.conceptName}
          className="size-full object-cover"
          onLoad={() => setLoaded(true)}
          onError={() => setErrored(true)}
        />
      )}

      {!loaded && !errored && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 bg-muted/60">
          <CircleNotch size={16} className="animate-spin text-muted-foreground" />
          <span className="text-[9px] text-muted-foreground">Generating…</span>
        </div>
      )}

      {errored && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 bg-muted/60">
          <WarningCircle size={16} className="text-destructive" />
          <button
            onClick={(event) => {
              event.stopPropagation();
              setErrored(false);
              setLoaded(false);
              setAttempt((n) => n + 1);
            }}
            className="flex items-center gap-1 rounded border border-border bg-background px-1.5 py-0.5 text-[9px] text-foreground"
          >
            <ArrowClockwise size={9} />
            Retry
          </button>
        </div>
      )}

      <div className="absolute inset-x-0 bottom-0 flex items-center justify-between bg-black/60 px-1.5 py-1">
        <span className="truncate text-[10px] font-medium text-white">
          {image.label} · {image.conceptName}
        </span>
        <div className="flex items-center gap-1">
          {image.favorite && <Star size={10} weight="fill" className="text-brand" />}
          {image.applied && <CheckCircle size={10} weight="fill" className="text-emerald-400" />}
        </div>
      </div>
    </div>
  );
}

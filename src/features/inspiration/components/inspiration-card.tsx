"use client";

import Image from "next/image";
import { ArrowClockwise, LinkSimple, NotePencil, Play } from "@phosphor-icons/react/dist/ssr";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { useRunAnalysis } from "@/features/inspiration/queries";
import type { InspirationItemDTO } from "@/features/inspiration/types";

export function InspirationCard({ item, onClick }: { item: InspirationItemDTO; onClick: () => void }) {
  const runAnalysis = useRunAnalysis();
  const thumb = item.type === "VIDEO" ? item.posterUrl : item.fileUrl;
  const status = item.analysis?.status;

  return (
    // Not a <button>: the ERROR state nests a retry Button inside, and a button
    // inside a button is invalid HTML that breaks hydration.
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onClick();
        }
      }}
      className="group flex cursor-pointer flex-col overflow-hidden rounded-lg border border-border bg-card text-left transition-colors duration-fast hover:border-brand/40"
    >
      <div className="relative aspect-4/3 w-full overflow-hidden bg-muted">
        {thumb ? (
          <Image src={thumb} alt={item.title ?? "Inspiration"} fill className="object-cover" unoptimized />
        ) : (
          <div className="flex size-full items-center justify-center text-muted-foreground">
            {item.type === "URL" ? <LinkSimple size={22} /> : <NotePencil size={22} />}
          </div>
        )}

        {item.type === "VIDEO" && thumb && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/20">
            <div className="flex size-9 items-center justify-center rounded-full bg-black/50 text-white">
              <Play size={16} weight="fill" />
            </div>
          </div>
        )}

        {(status === "PENDING" || status === "ANALYZING") && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-background/80 backdrop-blur-sm">
            <Skeleton className="h-3 w-24" />
            <span className="text-[11px] text-muted-foreground">Analyzing…</span>
          </div>
        )}

        {status === "ERROR" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-background/90 px-4 text-center">
            <span className="text-[11px] text-muted-foreground">Analysis failed</span>
            <Button
              size="sm"
              variant="outline"
              className="h-7 gap-1.5 px-2 text-xs"
              onClick={(event) => {
                event.stopPropagation();
                runAnalysis.mutate(item.id);
              }}
            >
              <ArrowClockwise size={12} />
              Retry
            </Button>
          </div>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-2 p-3">
        <p className="line-clamp-1 text-sm font-medium text-foreground">
          {item.title || item.sourceUrl || item.description || "Untitled"}
        </p>
        {(item.collection || item.analysis?.primaryStyle || item.tags.length > 0) && (
          <div className="flex flex-wrap gap-1.5">
            {item.collection && (
              <Badge variant="secondary" className="text-[10px]">
                {item.collection.name}
              </Badge>
            )}
            {item.analysis?.primaryStyle && (
              <Badge variant="outline" className="border-brand/30 text-[10px] text-brand">
                {item.analysis.primaryStyle}
              </Badge>
            )}
            {item.analysis?.mood.slice(0, 1).map((mood) => (
              <Badge key={mood} variant="outline" className="text-[10px] text-muted-foreground">
                {mood}
              </Badge>
            ))}
            {item.tags.slice(0, 2).map((tag) => (
              <Badge key={tag.id} variant="outline" className="text-[10px] text-muted-foreground">
                {tag.name}
              </Badge>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

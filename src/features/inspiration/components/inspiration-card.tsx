"use client";

import Image from "next/image";
import { ArrowClockwise, LinkSimple, NotePencil, Play } from "@phosphor-icons/react/dist/ssr";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { useRunCategorization } from "@/features/inspiration/queries";
import type { InspirationItemDTO } from "@/features/inspiration/types";

export function InspirationCard({ item, onClick }: { item: InspirationItemDTO; onClick: () => void }) {
  const runCategorization = useRunCategorization();
  const thumb = item.type === "VIDEO" ? item.posterUrl : item.fileUrl;

  return (
    <button
      onClick={onClick}
      className="group flex flex-col overflow-hidden rounded-lg border border-border bg-card text-left transition-colors duration-fast hover:border-brand/40"
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

        {item.categorizeStatus === "PENDING" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-background/80 backdrop-blur-sm">
            <Skeleton className="h-3 w-24" />
            <span className="text-[11px] text-muted-foreground">Categorizing…</span>
          </div>
        )}

        {item.categorizeStatus === "ERROR" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-background/90 px-4 text-center">
            <span className="text-[11px] text-muted-foreground">Categorization failed</span>
            <Button
              size="sm"
              variant="outline"
              className="h-7 gap-1.5 px-2 text-xs"
              onClick={(event) => {
                event.stopPropagation();
                runCategorization.mutate(item.id);
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
        {(item.collection || item.tags.length > 0) && (
          <div className="flex flex-wrap gap-1.5">
            {item.collection && (
              <Badge variant="secondary" className="text-[10px]">
                {item.collection.name}
              </Badge>
            )}
            {item.tags.slice(0, 3).map((tag) => (
              <Badge key={tag.id} variant="outline" className="text-[10px] text-muted-foreground">
                {tag.name}
              </Badge>
            ))}
          </div>
        )}
      </div>
    </button>
  );
}

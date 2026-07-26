"use client";

import { CircleNotch, WarningCircle } from "@phosphor-icons/react/dist/ssr";
import type { VariantDTO } from "@/features/projects/types";

export function VariantFrame({ variant, full = false }: { variant: VariantDTO; full?: boolean }) {
  const html = full ? variant.fullSiteHtml : variant.previewHtml;

  if (variant.status === "PENDING" || variant.status === "GENERATING") {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 bg-muted/20 text-muted-foreground">
        <CircleNotch size={16} className="animate-spin" />
        <span className="font-mono text-[10px] uppercase tracking-[0.14em]">Composing</span>
      </div>
    );
  }

  if (variant.status === "ERROR" || !html) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 bg-muted/20 px-5 text-center">
        <WarningCircle size={16} className="text-destructive" />
        <p className="text-[11px] leading-relaxed text-muted-foreground">
          {variant.error ?? "Nothing generated yet."}
        </p>
      </div>
    );
  }

  return (
    <iframe
      srcDoc={html}
      sandbox="allow-scripts"
      title={variant.styleName}
      className="h-full w-full border-0 bg-white"
    />
  );
}

"use client";

import { ArrowClockwise, CircleNotch, WarningCircle } from "@phosphor-icons/react/dist/ssr";
import { Button } from "@/components/ui/button";
import type { VariantDTO } from "@/features/variants/types";

export function VariantFrame({
  variant,
  onRetry,
  retrying,
}: {
  variant: VariantDTO;
  onRetry?: () => void;
  retrying?: boolean;
}) {
  if (variant.status === "PENDING" || variant.status === "GENERATING") {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 bg-muted/30 text-sm text-muted-foreground">
        <CircleNotch size={18} className="animate-spin" />
        Generating {variant.styleName}…
      </div>
    );
  }

  if (variant.status === "ERROR" || !variant.html) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 bg-muted/30 px-6 text-center">
        <WarningCircle size={20} className="text-destructive" />
        <p className="max-w-sm text-sm text-muted-foreground">{variant.error ?? "Generation failed."}</p>
        {onRetry && (
          <Button size="sm" variant="outline" onClick={onRetry} disabled={retrying} className="gap-1.5">
            <ArrowClockwise size={12} />
            {retrying ? "Retrying…" : "Retry"}
          </Button>
        )}
      </div>
    );
  }

  return (
    <iframe
      srcDoc={variant.html}
      sandbox="allow-scripts"
      title={variant.styleName}
      className="h-full w-full border-0 bg-white"
    />
  );
}

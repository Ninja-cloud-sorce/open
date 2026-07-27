"use client";

import { useEffect, useRef, useState } from "react";
import { CircleNotch, WarningCircle } from "@phosphor-icons/react/dist/ssr";
import type { VariantDTO } from "@/features/projects/types";

/**
 * Generated sites are designed for a desktop viewport. A split pane is roughly
 * half that, so rendering at natural width collapsed multi-column layouts into
 * columns barely wide enough for one word. Render at a real desktop width and
 * scale the whole thing down instead, so the pane shows what the site actually
 * looks like rather than its tablet breakpoint.
 */
const DESKTOP_WIDTH = 1440;

export function VariantFrame({ variant, full = false }: { variant: VariantDTO; full?: boolean }) {
  const html = full ? variant.fullSiteHtml : variant.previewHtml;
  const containerRef = useRef<HTMLDivElement>(null);
  const [box, setBox] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const element = containerRef.current;
    if (!element) return;
    const observer = new ResizeObserver(() => {
      setBox({ width: element.clientWidth, height: element.clientHeight });
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

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
        <p className="max-w-sm text-[11px] leading-relaxed text-muted-foreground">
          {variant.error ?? "Nothing generated yet."}
        </p>
      </div>
    );
  }

  // Only ever scale down; a pane wider than the desktop width shows it 1:1.
  const scale = box.width ? Math.min(1, box.width / DESKTOP_WIDTH) : 1;

  return (
    <div ref={containerRef} className="relative h-full w-full overflow-hidden bg-white">
      {box.width > 0 && (
        <iframe
          srcDoc={html}
          sandbox="allow-scripts"
          title={variant.styleName}
          style={{
            width: DESKTOP_WIDTH,
            height: box.height / scale,
            transform: `scale(${scale})`,
            transformOrigin: "top left",
          }}
          className="absolute left-0 top-0 border-0 bg-white"
        />
      )}
    </div>
  );
}

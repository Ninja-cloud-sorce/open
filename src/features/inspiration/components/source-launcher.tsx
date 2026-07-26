"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ArrowUp, Plus } from "@phosphor-icons/react/dist/ssr";
import { cn } from "@/lib/utils";
import { useInspirationSources } from "@/features/inspiration/queries";
import { AddSourceDialog } from "@/features/inspiration/components/add-source-dialog";

export function SourceLauncher() {
  const [expanded, setExpanded] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const { data: sources = [] } = useInspirationSources();

  return (
    <div className="fixed bottom-6 right-6 z-40 flex flex-col items-center gap-3">
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ opacity: 0, scale: 0.85, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.85, y: 12 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            className="flex flex-col items-center gap-2 rounded-full border border-border bg-popover p-2 shadow-lg"
          >
            <button
              onClick={() => setAddOpen(true)}
              title="Add a source"
              className="flex size-9 shrink-0 items-center justify-center rounded-full border border-dashed border-border text-muted-foreground transition-colors duration-fast hover:border-brand/50 hover:text-brand"
            >
              <Plus size={16} />
            </button>

            {sources.map((source, index) => (
              <motion.a
                key={source.id}
                href={source.url}
                target="_blank"
                rel="noreferrer"
                title={source.name}
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.04, duration: 0.18 }}
                className="flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-full border border-border bg-background transition-transform duration-fast hover:scale-105"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={source.faviconUrl} alt={source.name} className="size-5" />
              </motion.a>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      <button
        onClick={() => setExpanded((value) => !value)}
        aria-label={expanded ? "Close inspiration sources" : "Open inspiration sources"}
        className="flex size-12 shrink-0 items-center justify-center rounded-full bg-brand text-brand-foreground shadow-lg transition-transform duration-fast hover:scale-105"
      >
        <ArrowUp size={18} className={cn("transition-transform duration-base", expanded && "rotate-180")} />
      </button>

      <AddSourceDialog open={addOpen} onOpenChange={setAddOpen} />
    </div>
  );
}

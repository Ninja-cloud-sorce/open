"use client";

import { useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { ArrowUp, Plus } from "@phosphor-icons/react/dist/ssr";
import { useInspirationSources } from "@/features/inspiration/queries";
import { AddSourceDialog } from "@/features/inspiration/components/add-source-dialog";

/** Spring feel — snappy but settled, no visible bounce overshoot on the capsule. */
const CAPSULE_SPRING = { type: "spring", stiffness: 420, damping: 34, mass: 0.8 } as const;
const ITEM_SPRING = { type: "spring", stiffness: 500, damping: 28, mass: 0.6 } as const;

export function SourceLauncher() {
  const [expanded, setExpanded] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const { data: sources = [] } = useInspirationSources();
  const reduceMotion = useReducedMotion();

  // Children animate bottom-up, so the stack unfurls from the trigger rather
  // than all appearing at once.
  const items = [...sources].reverse();

  return (
    <div className="fixed bottom-6 right-6 z-40 flex flex-col items-center gap-3">
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={reduceMotion ? { opacity: 0 } : { opacity: 0, scaleY: 0.6, y: 16 }}
            animate={{ opacity: 1, scaleY: 1, y: 0 }}
            exit={reduceMotion ? { opacity: 0 } : { opacity: 0, scaleY: 0.7, y: 12 }}
            transition={CAPSULE_SPRING}
            style={{ originY: 1 }}
            className="flex flex-col items-center gap-2 rounded-full border border-border bg-popover p-2 shadow-lg"
          >
            <motion.button
              onClick={() => setAddOpen(true)}
              title="Add a source"
              initial={reduceMotion ? false : { opacity: 0, scale: 0.4, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ ...ITEM_SPRING, delay: reduceMotion ? 0 : items.length * 0.035 + 0.04 }}
              whileHover={{ scale: 1.08 }}
              whileTap={{ scale: 0.94 }}
              className="flex size-9 shrink-0 items-center justify-center rounded-full border border-dashed border-border text-muted-foreground transition-colors duration-fast hover:border-brand/50 hover:text-brand"
            >
              <Plus size={16} />
            </motion.button>

            {items.map((source, index) => (
              <motion.a
                key={source.id}
                href={source.url}
                target="_blank"
                rel="noreferrer"
                title={source.name}
                initial={reduceMotion ? false : { opacity: 0, scale: 0.4, y: 8 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.5 }}
                transition={{ ...ITEM_SPRING, delay: reduceMotion ? 0 : (items.length - 1 - index) * 0.035 }}
                whileHover={{ scale: 1.08 }}
                whileTap={{ scale: 0.94 }}
                className="flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-full border border-border bg-background"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={source.faviconUrl} alt={source.name} className="size-5" />
              </motion.a>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        onClick={() => setExpanded((value) => !value)}
        aria-label={expanded ? "Close inspiration sources" : "Open inspiration sources"}
        whileHover={{ scale: 1.06 }}
        whileTap={{ scale: 0.93 }}
        transition={ITEM_SPRING}
        className="flex size-12 shrink-0 items-center justify-center rounded-full bg-brand text-brand-foreground shadow-lg"
      >
        <motion.span
          animate={{ rotate: expanded ? 180 : 0 }}
          transition={{ type: "spring", stiffness: 380, damping: 26 }}
          className="flex items-center justify-center"
        >
          <ArrowUp size={18} />
        </motion.span>
      </motion.button>

      <AddSourceDialog open={addOpen} onOpenChange={setAddOpen} />
    </div>
  );
}

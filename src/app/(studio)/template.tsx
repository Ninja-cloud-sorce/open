"use client";

import { motion, useReducedMotion } from "motion/react";

/** A template (not a layout) remounts on every navigation, which is what lets
 *  each route play an enter transition instead of snapping into place. */
export default function StudioTemplate({ children }: { children: React.ReactNode }) {
  const reduceMotion = useReducedMotion();

  return (
    <motion.div
      initial={reduceMotion ? false : { opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
      className="h-full"
    >
      {children}
    </motion.div>
  );
}

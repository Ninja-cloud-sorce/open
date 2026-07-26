"use client";

import { motion, type Transition, useReducedMotion } from "motion/react";

interface RevealProps {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}

const transition: Transition = {
  duration: 0.42,
  ease: [0.22, 1, 0.36, 1],
};

export function Reveal({ children, delay = 0, className }: RevealProps) {
  const reduceMotion = useReducedMotion();

  return (
    <motion.div
      className={className}
      initial={reduceMotion ? false : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ ...transition, delay }}
    >
      {children}
    </motion.div>
  );
}

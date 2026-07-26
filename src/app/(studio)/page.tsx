"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { ArrowRight } from "@phosphor-icons/react/dist/ssr";
import { STUDIO_MODULES, MODULE_GROUPS } from "@/features/shell/modules";
import { cn } from "@/lib/utils";

export default function DashboardPage() {
  return (
    <div className="mx-auto max-w-5xl px-8 py-12">
      <motion.header
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
        className="mb-12 border-b border-border pb-8"
      >
        <p className="mb-3 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
          Design Studio
        </p>
        <h1 className="max-w-2xl font-heading text-4xl leading-[1.1] tracking-tight text-foreground">
          Design systems worth shipping, not templates worth forgetting.
        </h1>
        <p className="mt-4 max-w-xl text-sm leading-relaxed text-muted-foreground">
          Collect what you admire, analyse why it works, then generate directions under two opposing design
          rulebooks and narrow until one earns the job.
        </p>
        <Link
          href="/projects"
          className="mt-6 inline-flex items-center gap-2 border-b border-brand pb-0.5 text-sm font-medium text-brand transition-opacity hover:opacity-70"
        >
          Start a project
          <ArrowRight size={14} />
        </Link>
      </motion.header>

      <div className="space-y-10">
        {MODULE_GROUPS.map((group, groupIndex) => {
          const modules = STUDIO_MODULES.filter((m) => m.group === group);
          if (modules.length === 0) return null;
          return (
            <motion.section
              key={group}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.06 * (groupIndex + 1), ease: [0.22, 1, 0.36, 1] }}
              className="space-y-3"
            >
              <h2 className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">{group}</h2>
              <div className="grid gap-px overflow-hidden rounded-lg border border-border bg-border sm:grid-cols-2">
                {modules.map((module, moduleIndex) => (
                  <Link
                    key={module.id}
                    href={module.href}
                    className={cn(
                      "group flex flex-col gap-2 bg-background p-5 transition-colors duration-base hover:bg-muted/40",
                      !module.ready && "opacity-55",
                      // No orphan cells: an odd-length group lets its last item span the row.
                      modules.length % 2 === 1 && moduleIndex === modules.length - 1 && "sm:col-span-2"
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <module.icon size={17} />
                      <span className="font-mono text-[9.5px] uppercase tracking-[0.14em] text-muted-foreground">
                        {module.ready ? `Phase ${module.phase}` : "Upcoming"}
                      </span>
                    </div>
                    <h3 className="font-heading text-sm tracking-tight text-foreground">{module.label}</h3>
                    <p className="text-xs leading-relaxed text-muted-foreground">{module.description}</p>
                  </Link>
                ))}
              </div>
            </motion.section>
          );
        })}
      </div>
    </div>
  );
}

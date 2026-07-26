"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "motion/react";
import { Plus, SquaresFour, ArrowRight } from "@phosphor-icons/react/dist/ssr";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/shared/empty-state";
import { CreateProjectDialog } from "@/features/projects/components/create-project-dialog";
import { useProjects } from "@/features/projects/queries";

export default function ProjectsPage() {
  const { data: projects = [], isLoading } = useProjects();
  const [createOpen, setCreateOpen] = useState(false);

  return (
    <div className="mx-auto max-w-5xl px-8 py-10">
      <header className="mb-8 flex items-end justify-between gap-6 border-b border-border pb-6">
        <div className="space-y-1.5">
          <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">Design flow</p>
          <h1 className="font-heading text-3xl tracking-tight text-foreground">Projects</h1>
          <p className="max-w-lg text-sm leading-relaxed text-muted-foreground">
            One guided path from brief to finished direction — describe the service, curate references, generate ten
            directions across two rulebooks, then narrow until one wins.
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)} className="shrink-0 gap-1.5">
          <Plus size={14} />
          New project
        </Button>
      </header>

      {!isLoading && projects.length === 0 && (
        <EmptyState
          icon={SquaresFour}
          title="No projects yet"
          description="Start one to run the full design flow end to end."
          action={<Button onClick={() => setCreateOpen(true)}>Start a project</Button>}
        />
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        {projects.map((project, index) => (
          <motion.div
            key={project.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: index * 0.04, ease: [0.22, 1, 0.36, 1] }}
          >
            <Link
              href={`/projects/${project.id}`}
              className="group flex items-center justify-between gap-4 rounded-lg border border-border p-5 transition-colors duration-base hover:border-foreground/25"
            >
              <div className="min-w-0 space-y-1">
                <h2 className="truncate font-heading text-base tracking-tight text-foreground">{project.name}</h2>
                <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                  {project.serviceType || "No service type"} · {project.roundCount} round
                  {project.roundCount === 1 ? "" : "s"}
                </p>
              </div>
              <ArrowRight
                size={16}
                className="shrink-0 text-muted-foreground transition-transform duration-base group-hover:translate-x-0.5"
              />
            </Link>
          </motion.div>
        ))}
      </div>

      <CreateProjectDialog open={createOpen} onOpenChange={setCreateOpen} />
    </div>
  );
}

import Link from "next/link";
import { Reveal } from "@/components/shared/reveal";
import { STUDIO_MODULES } from "@/features/shell/modules";

export default function DashboardPage() {
  return (
    <Reveal className="mx-auto max-w-4xl px-6 py-12">
      <div className="mb-10 space-y-1.5">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          Design Studio
        </h1>
        <p className="text-sm text-muted-foreground">
          Figma meets Claude Code — collect inspiration, generate directions, and ship a
          website that doesn&apos;t look like everyone else&apos;s.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {STUDIO_MODULES.map((module) => (
          <Link
            key={module.id}
            href={module.href}
            className="group flex flex-col gap-3 rounded-lg border border-border p-4 transition-colors duration-fast hover:border-brand/40 hover:bg-muted/40"
          >
            <div className="flex items-center justify-between">
              <div className="flex size-8 items-center justify-center rounded-md border border-border bg-muted/50 text-muted-foreground group-hover:text-brand">
                <module.icon size={16} />
              </div>
              <span className="text-[11px] font-mono text-muted-foreground/70">
                Phase {module.phase}
              </span>
            </div>
            <div className="space-y-1">
              <h2 className="text-sm font-medium text-foreground">{module.label}</h2>
              <p className="text-xs leading-relaxed text-muted-foreground">
                {module.description}
              </p>
            </div>
          </Link>
        ))}
      </div>
    </Reveal>
  );
}

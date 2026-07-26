import { Reveal } from "@/components/shared/reveal";
import { STUDIO_MODULES } from "@/features/shell/modules";

export function ModuleStub({ id }: { id: string }) {
  const studioModule = STUDIO_MODULES.find((m) => m.id === id);
  if (!studioModule) return null;

  return (
    <Reveal className="mx-auto flex h-full max-w-lg flex-col justify-center px-8 py-16 text-center">
      <p className="mb-3 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
        Phase {studioModule.phase} · upcoming
      </p>
      <h1 className="font-heading text-2xl tracking-tight text-foreground">{studioModule.label}</h1>
      <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{studioModule.description}</p>
    </Reveal>
  );
}

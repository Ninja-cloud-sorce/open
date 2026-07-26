import { Reveal } from "@/components/shared/reveal";
import { EmptyState } from "@/components/shared/empty-state";
import { STUDIO_MODULES } from "@/features/shell/modules";

export function ModuleStub({ id }: { id: string }) {
  const studioModule = STUDIO_MODULES.find((m) => m.id === id);
  if (!studioModule) return null;

  return (
    <Reveal className="flex h-full flex-col">
      <EmptyState
        icon={studioModule.icon}
        title={studioModule.label}
        description={`${studioModule.description} Coming in Phase ${studioModule.phase}.`}
      />
    </Reveal>
  );
}

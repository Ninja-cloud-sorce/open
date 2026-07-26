"use client";

import { useRouter } from "next/navigation";
import { House } from "@phosphor-icons/react/dist/ssr";
import { STUDIO_MODULES } from "@/features/shell/modules";
import { useShellStore } from "@/features/shell/store";
import { useHotkeys } from "@/hooks/use-hotkeys";
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";

export function CommandPalette() {
  const router = useRouter();
  const { paletteOpen, setPaletteOpen } = useShellStore();

  useHotkeys("mod+k", () => setPaletteOpen(!paletteOpen));

  function go(href: string) {
    router.push(href);
    setPaletteOpen(false);
  }

  return (
    <CommandDialog open={paletteOpen} onOpenChange={setPaletteOpen}>
      <Command>
        <CommandInput placeholder="Go to…" />
        <CommandList>
          <CommandEmpty>No results.</CommandEmpty>
          <CommandGroup heading="Navigate">
            <CommandItem onSelect={() => go("/")} value="dashboard home">
              <House size={16} />
              Dashboard
            </CommandItem>
            {STUDIO_MODULES.map((module) => (
              <CommandItem
                key={module.id}
                onSelect={() => go(module.href)}
                value={`${module.label} ${module.id}`}
              >
                <module.icon size={16} />
                {module.label}
              </CommandItem>
            ))}
          </CommandGroup>
        </CommandList>
      </Command>
    </CommandDialog>
  );
}

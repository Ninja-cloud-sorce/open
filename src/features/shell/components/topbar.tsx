"use client";

import { usePathname } from "next/navigation";
import { MagnifyingGlass } from "@phosphor-icons/react/dist/ssr";
import { STUDIO_MODULES } from "@/features/shell/modules";
import { useShellStore } from "@/features/shell/store";
import { ThemeToggle } from "@/features/shell/components/theme-toggle";
import { Button } from "@/components/ui/button";

export function Topbar() {
  const pathname = usePathname();
  const setPaletteOpen = useShellStore((state) => state.setPaletteOpen);

  const currentModule = STUDIO_MODULES.find((module) => module.href === pathname);
  const title = pathname === "/" ? "Dashboard" : currentModule?.label ?? "";

  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b border-border px-5">
      <h1 className="text-sm font-medium text-foreground">{title}</h1>

      <div className="flex items-center gap-1.5">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setPaletteOpen(true)}
          className="h-8 gap-2 px-2.5 text-muted-foreground font-normal"
        >
          <MagnifyingGlass size={14} />
          <span>Search</span>
          <kbd className="ml-1 rounded border border-border bg-muted px-1.5 py-0.5 text-[10px] font-mono">
            ⌘K
          </kbd>
        </Button>
        <ThemeToggle />
      </div>
    </header>
  );
}

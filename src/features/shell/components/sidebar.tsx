"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { House, CaretLineLeft, CaretLineRight } from "@phosphor-icons/react/dist/ssr";
import { STUDIO_MODULES } from "@/features/shell/modules";
import { useShellStore } from "@/features/shell/store";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

function NavLink({
  href,
  label,
  icon: Icon,
  active,
  collapsed,
}: {
  href: string;
  label: string;
  icon: React.ComponentType<{ size?: number }>;
  active: boolean;
  collapsed: boolean;
}) {
  const link = (
    <Link
      href={href}
      className={cn(
        "flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm transition-colors duration-fast",
        "text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent",
        active && "bg-sidebar-accent text-sidebar-foreground font-medium",
        collapsed && "justify-center px-0"
      )}
    >
      <Icon size={17} />
      {!collapsed && <span className="truncate">{label}</span>}
    </Link>
  );

  if (!collapsed) return link;

  return (
    <Tooltip>
      <TooltipTrigger render={link} />
      <TooltipContent side="right">{label}</TooltipContent>
    </Tooltip>
  );
}

export function Sidebar() {
  const pathname = usePathname();
  const { sidebarCollapsed, toggleSidebar } = useShellStore();

  return (
    <aside
      className={cn(
        "flex h-full flex-col border-r border-sidebar-border bg-sidebar transition-[width] duration-base ease-out-quint",
        sidebarCollapsed ? "w-14" : "w-60"
      )}
    >
      <div className={cn("flex h-14 items-center px-3", sidebarCollapsed && "justify-center px-0")}>
        {!sidebarCollapsed && (
          <span className="text-sm font-semibold tracking-tight text-sidebar-foreground">
            Design Studio
          </span>
        )}
      </div>

      <nav className="flex-1 space-y-0.5 overflow-y-auto px-2 py-1">
        <NavLink href="/" label="Dashboard" icon={House} active={pathname === "/"} collapsed={sidebarCollapsed} />
        <div className={cn("my-2 border-t border-sidebar-border", sidebarCollapsed && "mx-1")} />
        {STUDIO_MODULES.map((module) => (
          <NavLink
            key={module.id}
            href={module.href}
            label={module.label}
            icon={module.icon}
            active={pathname === module.href}
            collapsed={sidebarCollapsed}
          />
        ))}
      </nav>

      <div className={cn("border-t border-sidebar-border p-2", sidebarCollapsed && "flex justify-center")}>
        <button
          onClick={toggleSidebar}
          aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          className="flex items-center justify-center rounded-md p-2 text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-foreground"
        >
          {sidebarCollapsed ? <CaretLineRight size={16} /> : <CaretLineLeft size={16} />}
        </button>
      </div>
    </aside>
  );
}

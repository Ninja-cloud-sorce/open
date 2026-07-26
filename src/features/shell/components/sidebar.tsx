"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { House, CaretLineLeft, CaretLineRight } from "@phosphor-icons/react/dist/ssr";
import { STUDIO_MODULES, MODULE_GROUPS } from "@/features/shell/modules";
import { useShellStore } from "@/features/shell/store";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

function NavLink({
  href,
  label,
  icon: Icon,
  active,
  collapsed,
  muted,
}: {
  href: string;
  label: string;
  icon: React.ComponentType<{ size?: number }>;
  active: boolean;
  collapsed: boolean;
  muted?: boolean;
}) {
  const link = (
    <Link
      href={href}
      className={cn(
        "group relative flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-[13px] transition-colors duration-fast",
        active
          ? "bg-sidebar-accent font-medium text-sidebar-foreground"
          : "text-sidebar-foreground/65 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground",
        muted && !active && "text-sidebar-foreground/35",
        collapsed && "justify-center px-0"
      )}
    >
      {active && !collapsed && (
        <span className="absolute inset-y-1.5 left-0 w-0.5 rounded-full bg-brand" aria-hidden />
      )}
      <Icon size={16} />
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
      <div className={cn("flex h-14 items-center px-4", sidebarCollapsed && "justify-center px-0")}>
        {sidebarCollapsed ? (
          <span className="size-2 rounded-full bg-brand" aria-hidden />
        ) : (
          <div className="flex items-baseline gap-1.5">
            <span className="font-heading text-[15px] tracking-tight text-sidebar-foreground">Design Studio</span>
            <span className="size-1.5 rounded-full bg-brand" aria-hidden />
          </div>
        )}
      </div>

      <nav className="flex-1 space-y-5 overflow-y-auto px-2 pb-2">
        <div className="space-y-0.5">
          <NavLink
            href="/"
            label="Overview"
            icon={House}
            active={pathname === "/"}
            collapsed={sidebarCollapsed}
          />
        </div>

        {MODULE_GROUPS.map((group) => {
          const modules = STUDIO_MODULES.filter((m) => m.group === group);
          if (modules.length === 0) return null;
          return (
            <div key={group} className="space-y-0.5">
              {!sidebarCollapsed && (
                <p className="px-2.5 pb-1 font-mono text-[9.5px] uppercase tracking-[0.18em] text-sidebar-foreground/35">
                  {group}
                </p>
              )}
              {sidebarCollapsed && <div className="mx-2 my-2 border-t border-sidebar-border" />}
              {modules.map((module) => (
                <NavLink
                  key={module.id}
                  href={module.href}
                  label={module.label}
                  icon={module.icon}
                  active={pathname.startsWith(module.href)}
                  collapsed={sidebarCollapsed}
                  muted={!module.ready}
                />
              ))}
            </div>
          );
        })}
      </nav>

      <div className={cn("border-t border-sidebar-border p-2", sidebarCollapsed && "flex justify-center")}>
        <button
          onClick={toggleSidebar}
          aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          className="flex items-center justify-center rounded-md p-2 text-sidebar-foreground/50 transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground"
        >
          {sidebarCollapsed ? <CaretLineRight size={15} /> : <CaretLineLeft size={15} />}
        </button>
      </div>
    </aside>
  );
}

import type { Icon } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  icon: Icon;
  title: string;
  description: string;
  action?: React.ReactNode;
  className?: string;
}

export function EmptyState({ icon: IconComponent, title, description, action, className }: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-1 flex-col items-center justify-center gap-4 px-6 py-24 text-center",
        className
      )}
    >
      <div className="flex size-11 items-center justify-center rounded-full border border-border bg-muted/50 text-muted-foreground">
        <IconComponent size={20} />
      </div>
      <div className="space-y-1.5">
        <h2 className="text-sm font-medium text-foreground">{title}</h2>
        <p className="max-w-sm text-sm text-muted-foreground">{description}</p>
      </div>
      {action}
    </div>
  );
}

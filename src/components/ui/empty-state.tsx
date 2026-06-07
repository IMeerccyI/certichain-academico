import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

type EmptyStateProps = {
  action?: ReactNode;
  className?: string;
  description: string;
  icon?: ReactNode;
  title: string;
};

export function EmptyState({ action, className, description, icon, title }: EmptyStateProps) {
  return (
    <div
      className={cn(
        "grid place-items-center rounded-lg border border-dashed border-border bg-black/30 p-8 text-center",
        className,
      )}
    >
      <div className="max-w-sm">
        {icon ? (
          <div className="mx-auto grid h-10 w-10 place-items-center rounded-md border border-border bg-secondary text-muted-foreground">
            {icon}
          </div>
        ) : null}
        <p className="mt-4 text-sm font-semibold text-foreground">{title}</p>
        <p className="mt-2 text-xs leading-5 text-muted-foreground">{description}</p>
        {action ? <div className="mt-4 flex justify-center">{action}</div> : null}
      </div>
    </div>
  );
}

import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

type StatusTone = "online" | "syncing" | "warning" | "offline" | "neutral";

const toneClasses: Record<StatusTone, string> = {
  online: "border-success/25 bg-success/10 text-success",
  syncing: "border-primary/25 bg-primary/10 text-primary",
  warning: "border-warning/30 bg-warning/10 text-warning",
  offline: "border-destructive/25 bg-destructive/10 text-destructive",
  neutral: "border-border/80 bg-secondary text-muted-foreground",
};

type StatusBadgeProps = {
  children: ReactNode;
  className?: string;
  tone?: StatusTone;
};

export function StatusBadge({ children, className, tone = "neutral" }: StatusBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-[11px] font-semibold leading-none",
        toneClasses[tone],
        className,
      )}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden="true" />
      {children}
    </span>
  );
}

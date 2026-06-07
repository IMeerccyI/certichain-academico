import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

type BadgeIntent = "neutral" | "success" | "warning" | "danger" | "info";

const intentClasses: Record<BadgeIntent, string> = {
  neutral: "border-border bg-muted text-muted-foreground",
  success: "border-success/25 bg-success/10 text-success",
  warning: "border-warning/30 bg-warning/10 text-warning",
  danger: "border-destructive/25 bg-destructive/10 text-destructive",
  info: "border-primary/25 bg-primary/10 text-primary",
};

type BadgeProps = {
  children: ReactNode;
  intent?: BadgeIntent;
  className?: string;
};

export function Badge({ children, className, intent = "neutral" }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold leading-none",
        intentClasses[intent],
        className,
      )}
    >
      {children}
    </span>
  );
}

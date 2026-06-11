import * as Progress from "@radix-ui/react-progress";
import type { ReactNode } from "react";
import { AnimatedNumber, MotionCard } from "@/components/motion";
import { cn } from "@/lib/cn";

type MetricCardProps = {
  actionLabel?: string;
  label: string;
  value: string;
  detail: string;
  icon: ReactNode;
  onClick?: () => void;
  progress?: number;
  testId?: string;
  tone?: "primary" | "accent" | "success" | "warning" | "danger";
  delta?: string;
  bars?: number[];
  compact?: boolean;
};

const toneClasses = {
  primary: "text-primary",
  accent: "text-accent",
  success: "text-success",
  warning: "text-warning",
  danger: "text-destructive",
};

const barClasses = {
  primary: "bg-primary shadow-[0_0_16px_hsl(var(--primary)/0.28)]",
  accent: "bg-accent shadow-[0_0_16px_hsl(var(--accent)/0.26)]",
  success: "bg-success shadow-[0_0_16px_hsl(var(--success)/0.24)]",
  warning: "bg-warning shadow-[0_0_16px_hsl(var(--warning)/0.22)]",
  danger: "bg-destructive shadow-[0_0_16px_hsl(var(--destructive)/0.24)]",
};

export function MetricCard({
  actionLabel,
  bars = [34, 62, 48, 76, 58, 84],
  compact = false,
  delta,
  detail,
  icon,
  label,
  onClick,
  progress,
  testId,
  tone = "primary",
  value,
}: MetricCardProps) {
  return (
    <MotionCard
      aria-label={onClick ? (actionLabel ?? label) : undefined}
      as={onClick ? "button" : "article"}
      className={cn(
        "min-w-0 rounded-lg border border-border bg-card shadow-[inset_0_1px_0_hsl(var(--foreground)/0.04),0_24px_64px_-48px_hsl(var(--shadow-ledger)/1)]",
        compact ? "min-h-0 p-2.5" : "min-h-[8.5rem] p-3.5",
        onClick &&
          "w-full text-left transition-colors hover:border-foreground/30 hover:bg-card focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/25",
      )}
      data-testid={testId}
      onClick={onClick}
      type={onClick ? "button" : undefined}
    >
      <div className={cn("flex items-center justify-between gap-2", compact ? "gap-1.5" : "gap-3")}>
        <div className="flex min-w-0 items-center gap-1.5">
          <span className={cn("shrink-0", toneClasses[tone])}>
            {compact ? (
              <span className="grid h-4 w-4 place-items-center [&>svg]:h-3.5 [&>svg]:w-3.5">
                {icon}
              </span>
            ) : (
              icon
            )}
          </span>
          <p
            className={cn(
              "truncate font-medium text-foreground/80",
              compact ? "text-[10px] leading-4" : "text-xs",
            )}
          >
            {label}
          </p>
        </div>
        {!compact ? <span className="text-muted-foreground">...</span> : null}
      </div>
      <div
        className={cn(
          "grid items-end rounded-md border border-border/45 bg-muted/55 shadow-[inset_0_1px_0_hsl(var(--foreground)/0.035),inset_0_-18px_36px_hsl(var(--shadow-ledger)/0.18)]",
          compact
            ? "mt-2 min-h-[3.35rem] grid-cols-[minmax(0,1fr)_2.35rem] gap-2 px-2 py-2"
            : "mt-3 min-h-[5.2rem] grid-cols-[minmax(0,1fr)_4.65rem] gap-4 px-3 py-3",
        )}
      >
        <div className="min-w-0">
          <AnimatedNumber
            className={cn(
              "font-mono font-medium leading-none tracking-tight text-foreground",
              compact ? "text-xl" : "text-3xl",
            )}
            value={value}
          />
          <p
            className={cn(
              "truncate text-muted-foreground",
              compact ? "mt-1 text-[10px] leading-4" : "mt-3 text-xs",
            )}
          >
            {detail}
          </p>
        </div>
        <div
          className={cn(
            "flex items-end justify-end",
            compact ? "h-10 gap-1" : "h-16 gap-1.5",
          )}
        >
          {bars.map((height, index) => (
            <span
              className={cn("rounded-sm", compact ? "w-1" : "w-1.5", barClasses[tone])}
              key={`${label}-${height}-${index}`}
              style={{ height: `${height}%`, opacity: 0.48 + index * 0.055 }}
            />
          ))}
        </div>
      </div>
      {delta ? (
        <p className={cn(compact ? "mt-1.5 text-[10px] leading-4" : "mt-3 text-xs", toneClasses[tone])}>
          {delta}
        </p>
      ) : null}
      {typeof progress === "number" ? (
        <Progress.Root
          className={cn(
            "overflow-hidden rounded-full bg-muted",
            compact ? "mt-1.5 h-0.5" : "mt-3 h-1",
          )}
          value={progress}
        >
          <Progress.Indicator
            className={cn("h-full rounded-full transition-transform", barClasses[tone])}
            style={{ transform: `translateX(-${100 - progress}%)` }}
          />
        </Progress.Root>
      ) : null}
    </MotionCard>
  );
}
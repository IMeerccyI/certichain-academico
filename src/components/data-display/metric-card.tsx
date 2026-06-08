import * as Progress from "@radix-ui/react-progress";
import type { ReactNode } from "react";
import { AnimatedNumber, MotionCard } from "@/components/motion";
import { cn } from "@/lib/cn";

type MetricCardProps = {
  label: string;
  value: string;
  detail: string;
  icon: ReactNode;
  progress?: number;
  tone?: "primary" | "accent" | "success" | "warning" | "danger";
  delta?: string;
  bars?: number[];
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
  bars = [34, 62, 48, 76, 58, 84],
  delta,
  detail,
  icon,
  label,
  progress,
  tone = "primary",
  value,
}: MetricCardProps) {
  return (
    <MotionCard
      as="article"
      className="min-h-[8.5rem] min-w-0 rounded-lg border border-border bg-card p-3.5 shadow-[inset_0_1px_0_hsl(var(--foreground)/0.04),0_24px_64px_-48px_hsl(var(--shadow-ledger)/1)]"
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <span className={cn("shrink-0", toneClasses[tone])}>{icon}</span>
          <p className="truncate text-xs font-medium text-foreground/80">{label}</p>
        </div>
        <span className="text-muted-foreground">...</span>
      </div>
      <div className="mt-3 grid min-h-[5.2rem] grid-cols-[minmax(0,1fr)_4.65rem] items-end gap-4 rounded-md border border-border/45 bg-black/50 px-3 py-3 shadow-[inset_0_1px_0_hsl(var(--foreground)/0.035),inset_0_-18px_36px_hsl(var(--shadow-ledger)/0.18)]">
        <div className="min-w-0">
          <AnimatedNumber
            className="font-mono text-3xl font-medium leading-none tracking-tight text-foreground"
            value={value}
          />
          <p className="mt-3 truncate text-xs text-muted-foreground">{detail}</p>
        </div>
        <div className="flex h-16 items-end justify-end gap-1.5">
          {bars.map((height, index) => (
            <span
              className={cn("w-1.5 rounded-sm", barClasses[tone])}
              key={`${label}-${height}-${index}`}
              style={{ height: `${height}%`, opacity: 0.48 + index * 0.055 }}
            />
          ))}
        </div>
      </div>
      {delta ? (
        <p className={cn("mt-3 text-xs", toneClasses[tone])}>{delta}</p>
      ) : null}
      {typeof progress === "number" ? (
        <Progress.Root
          className="mt-3 h-1 overflow-hidden rounded-full bg-muted"
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

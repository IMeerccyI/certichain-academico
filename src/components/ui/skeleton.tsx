import { cn } from "@/lib/cn";

type SkeletonProps = {
  className?: string;
};

export function Skeleton({ className }: SkeletonProps) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-md border border-border/35 bg-secondary/70 shadow-[inset_0_1px_0_hsl(var(--foreground)/0.025)]",
        className,
      )}
    />
  );
}

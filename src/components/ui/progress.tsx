import * as ProgressPrimitive from "@radix-ui/react-progress";
import { cn } from "@/lib/cn";

type ProgressProps = {
  className?: string;
  indicatorClassName?: string;
  value: number;
};

export function Progress({ className, indicatorClassName, value }: ProgressProps) {
  return (
    <ProgressPrimitive.Root
      className={cn("h-1.5 overflow-hidden rounded-full bg-muted", className)}
      value={value}
    >
      <ProgressPrimitive.Indicator
        className={cn("h-full rounded-full bg-primary transition-transform", indicatorClassName)}
        style={{ transform: `translateX(-${100 - value}%)` }}
      />
    </ProgressPrimitive.Root>
  );
}

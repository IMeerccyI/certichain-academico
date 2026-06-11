import type { InputHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "h-8 w-full rounded-md border border-input bg-muted/45 px-3 text-xs text-foreground outline-none shadow-[inset_0_1px_0_hsl(var(--foreground)/0.025)] transition-colors placeholder:text-muted-foreground focus:border-primary/70 focus:ring-4 focus:ring-primary/15",
        className,
      )}
      {...props}
    />
  );
}

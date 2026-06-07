import type { TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

export function Textarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(
        "min-h-24 w-full resize-y rounded-md border border-input bg-black/35 px-3 py-2 text-xs text-foreground outline-none shadow-[inset_0_1px_0_hsl(var(--foreground)/0.025)] transition-colors placeholder:text-muted-foreground focus:border-primary/70 focus:ring-4 focus:ring-primary/15",
        className,
      )}
      {...props}
    />
  );
}

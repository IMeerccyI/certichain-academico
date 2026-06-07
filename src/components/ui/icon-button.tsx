import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/cn";

type IconButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  icon: ReactNode;
  label: string;
};

export function IconButton({ className, icon, label, type = "button", ...props }: IconButtonProps) {
  return (
    <button
      aria-label={label}
      className={cn(
        "grid h-8 w-8 place-items-center rounded-md border border-border/80 bg-secondary text-muted-foreground shadow-[inset_0_1px_0_hsl(var(--foreground)/0.035)] transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/25 disabled:pointer-events-none disabled:opacity-50",
        className,
      )}
      type={type}
      {...props}
    >
      {icon}
    </button>
  );
}

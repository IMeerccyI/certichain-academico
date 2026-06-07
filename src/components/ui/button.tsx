import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/cn";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  icon?: ReactNode;
};

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    "border-foreground/25 bg-foreground text-background shadow-[inset_0_1px_0_hsl(var(--background)/0.2),0_12px_28px_-22px_hsl(var(--foreground)/0.6)] hover:bg-foreground/88 focus-visible:ring-primary/35",
  secondary:
    "border-border/80 bg-secondary text-secondary-foreground shadow-[inset_0_1px_0_hsl(var(--foreground)/0.04),0_12px_28px_-24px_hsl(var(--shadow-ledger)/0.9)] hover:bg-muted hover:text-foreground focus-visible:ring-accent/35",
  ghost:
    "border-transparent text-muted-foreground hover:border-border/70 hover:bg-secondary hover:text-foreground focus-visible:ring-primary/25",
  danger:
    "border-destructive/35 bg-destructive text-destructive-foreground shadow-[inset_0_1px_0_hsl(var(--foreground)/0.08),0_12px_28px_-22px_hsl(var(--destructive)/0.55)] hover:bg-destructive/92 focus-visible:ring-destructive/35",
};

export function Button({
  className,
  children,
  icon,
  variant = "primary",
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex min-h-8 items-center justify-center gap-2 rounded-md border px-3 py-1.5 text-xs font-semibold transition-all duration-200 hover:-translate-y-px active:translate-y-0 focus-visible:outline-none focus-visible:ring-4 disabled:pointer-events-none disabled:opacity-55",
        variantClasses[variant],
        className,
      )}
      type={type}
      {...props}
    >
      {icon}
      {children}
    </button>
  );
}

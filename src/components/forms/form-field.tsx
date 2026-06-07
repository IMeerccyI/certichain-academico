import type { InputHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/cn";

type FormFieldProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  hint?: ReactNode;
  error?: string;
};

export function FormField({ className, error, hint, id, label, ...props }: FormFieldProps) {
  const inputId = id ?? props.name ?? label.toLowerCase().replace(/\s+/g, "-");

  return (
    <label className="grid gap-2 text-sm font-semibold text-foreground" htmlFor={inputId}>
      {label}
      <input
        className={cn(
          "min-h-11 rounded-md border border-input bg-background px-3 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-primary focus:ring-4 focus:ring-primary/20",
          error && "border-destructive focus:border-destructive focus:ring-destructive/20",
          className,
        )}
        id={inputId}
        {...props}
      />
      {error ? (
        <span className="text-xs font-medium text-destructive">{error}</span>
      ) : hint ? (
        <span className="text-xs font-medium text-muted-foreground">{hint}</span>
      ) : null}
    </label>
  );
}

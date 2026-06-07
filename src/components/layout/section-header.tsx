import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

type SectionHeaderProps = {
  action?: ReactNode;
  className?: string;
  description?: string;
  eyebrow?: ReactNode;
  title: string;
};

export function SectionHeader({
  action,
  className,
  description,
  eyebrow,
  title,
}: SectionHeaderProps) {
  return (
    <div
      className={cn(
        "flex min-w-0 flex-col gap-3 md:flex-row md:items-end md:justify-between",
        className,
      )}
    >
      <div className="min-w-0">
        {eyebrow ? <div className="mb-2 flex flex-wrap gap-2">{eyebrow}</div> : null}
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">{title}</h1>
        {description ? (
          <p className="mt-1 max-w-3xl text-sm leading-6 text-muted-foreground">
            {description}
          </p>
        ) : null}
      </div>
      {action ? <div className="flex shrink-0 flex-wrap items-center gap-2">{action}</div> : null}
    </div>
  );
}

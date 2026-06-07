import type { ReactNode } from "react";
import * as SelectPrimitive from "@radix-ui/react-select";
import { Check, ChevronDown } from "lucide-react";
import { cn } from "@/lib/cn";

type SelectOption = {
  label: string;
  value: string;
};

type SelectProps = {
  ariaLabel: string;
  className?: string;
  onValueChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: ReactNode;
  value: string;
};

export function Select({
  ariaLabel,
  className,
  onValueChange,
  options,
  placeholder,
  value,
}: SelectProps) {
  return (
    <SelectPrimitive.Root onValueChange={onValueChange} value={value}>
      <SelectPrimitive.Trigger
        aria-label={ariaLabel}
        className={cn(
          "inline-flex h-8 min-w-36 items-center justify-between gap-2 rounded-md border border-border/80 bg-secondary px-3 text-xs font-semibold text-foreground shadow-[inset_0_1px_0_hsl(var(--foreground)/0.035)] outline-none transition-colors hover:bg-muted focus:ring-4 focus:ring-primary/20",
          className,
        )}
      >
        <SelectPrimitive.Value placeholder={placeholder} />
        <SelectPrimitive.Icon>
          <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
        </SelectPrimitive.Icon>
      </SelectPrimitive.Trigger>
      <SelectPrimitive.Portal>
        <SelectPrimitive.Content
          className="z-50 min-w-[var(--radix-select-trigger-width)] overflow-hidden rounded-md border border-border bg-card p-1 text-card-foreground shadow-ledger"
          position="popper"
          sideOffset={6}
        >
          <SelectPrimitive.Viewport>
            {options.map((option) => (
              <SelectPrimitive.Item
                className="relative flex h-8 cursor-pointer select-none items-center rounded-sm px-8 text-xs font-medium text-muted-foreground outline-none data-[highlighted]:bg-secondary data-[highlighted]:text-foreground"
                key={option.value}
                value={option.value}
              >
                <SelectPrimitive.ItemIndicator className="absolute left-2 grid place-items-center text-primary">
                  <Check className="h-3.5 w-3.5" aria-hidden="true" />
                </SelectPrimitive.ItemIndicator>
                <SelectPrimitive.ItemText>{option.label}</SelectPrimitive.ItemText>
              </SelectPrimitive.Item>
            ))}
          </SelectPrimitive.Viewport>
        </SelectPrimitive.Content>
      </SelectPrimitive.Portal>
    </SelectPrimitive.Root>
  );
}

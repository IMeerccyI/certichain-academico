import type { ReactNode } from "react";
import * as TabsPrimitive from "@radix-ui/react-tabs";
import { cn } from "@/lib/cn";

type TabItem = {
  content: ReactNode;
  label: string;
  value: string;
};

type TabsProps = {
  className?: string;
  defaultValue: string;
  items: TabItem[];
};

export function Tabs({ className, defaultValue, items }: TabsProps) {
  return (
    <TabsPrimitive.Root className={cn("grid gap-3", className)} defaultValue={defaultValue}>
      <TabsPrimitive.List className="inline-flex w-fit gap-1 rounded-md border border-border bg-card p-1">
        {items.map((item) => (
          <TabsPrimitive.Trigger
            className="rounded-sm px-3 py-1.5 text-xs font-semibold text-muted-foreground transition-colors data-[state=active]:bg-secondary data-[state=active]:text-foreground"
            key={item.value}
            value={item.value}
          >
            {item.label}
          </TabsPrimitive.Trigger>
        ))}
      </TabsPrimitive.List>
      {items.map((item) => (
        <TabsPrimitive.Content className="outline-none" key={item.value} value={item.value}>
          {item.content}
        </TabsPrimitive.Content>
      ))}
    </TabsPrimitive.Root>
  );
}

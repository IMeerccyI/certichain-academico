import type { ReactNode } from "react";
import { useStaggeredCards } from "@/hooks/useStaggeredCards";

type TimelineItem = {
  description: ReactNode;
  id: string;
  meta?: ReactNode;
  title: ReactNode;
};

type TimelineProps = {
  items: TimelineItem[];
};

export function Timeline({ items }: TimelineProps) {
  const timelineRef = useStaggeredCards<HTMLOListElement>({
    selector: "[data-motion-timeline-item]",
    stagger: 0.045,
    y: 10,
  });

  return (
    <ol className="grid gap-3" ref={timelineRef}>
      {items.map((item) => (
        <li
          className="grid grid-cols-[auto_1fr] gap-3 motion-transform"
          data-motion-timeline-item
          key={item.id}
        >
          <span className="mt-1 h-2 w-2 rounded-full bg-primary shadow-[0_0_16px_hsl(var(--primary)/0.28)]" />
          <div className="rounded-md border border-border/55 bg-muted/45 p-3 shadow-[inset_0_1px_0_hsl(var(--foreground)/0.025)]">
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs font-semibold text-foreground">{item.title}</p>
              {item.meta ? (
                <span className="font-mono text-[11px] text-muted-foreground">{item.meta}</span>
              ) : null}
            </div>
            <p className="mt-2 text-xs leading-5 text-muted-foreground">{item.description}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}

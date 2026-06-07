import type { HTMLAttributes } from "react";
import { cn } from "@/lib/cn";

type RevealProps = HTMLAttributes<HTMLDivElement>;

export function Reveal({ className, ...props }: RevealProps) {
  return <div className={cn(className)} data-reveal {...props} />;
}

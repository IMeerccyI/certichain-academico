import { useRef } from "react";
import type { ReactNode } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { useGSAP } from "@gsap/react";
import { gsap } from "gsap";
import { X } from "lucide-react";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { cn } from "@/lib/cn";
import { motionPresets, shouldSkipMotion } from "@/lib/motion";

type ModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: ReactNode;
};

export function Modal({ children, description, onOpenChange, open, title }: ModalProps) {
  const scopeRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const reducedMotion = useReducedMotion();

  useGSAP(
    () => {
      const overlay = overlayRef.current;
      const content = contentRef.current;

      if (!open || !overlay || !content) {
        return;
      }

      if (shouldSkipMotion(reducedMotion)) {
        gsap.set([overlay, content], { autoAlpha: 1, scale: 1, x: 0, y: 0 });
        return;
      }

      const timeline = gsap.timeline({
        defaults: { duration: 0.22, ease: "power2.out" },
      });

      timeline
        .addLabel("modalIn")
        .fromTo(
          overlay,
          motionPresets.modalIn.overlayFrom,
          motionPresets.modalIn.overlayTo,
          "modalIn",
        )
        .fromTo(
          content,
          motionPresets.modalIn.contentFrom,
          motionPresets.modalIn.contentTo,
          "modalIn+=0.03",
        );

      return () => timeline.kill();
    },
    { dependencies: [open, reducedMotion], revertOnUpdate: true, scope: scopeRef },
  );

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <div ref={scopeRef}>
          <Dialog.Overlay
            className="fixed inset-0 z-40 bg-foreground/35 backdrop-blur-[2px] motion-opacity"
            ref={overlayRef}
          />
          <Dialog.Content
            className={cn(
              "fixed left-1/2 top-1/2 z-50 w-[min(92vw,34rem)] -translate-x-1/2 -translate-y-1/2 rounded-lg border border-border bg-card p-6 text-card-foreground shadow-ledger motion-transform",
            )}
            ref={contentRef}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <Dialog.Title className="font-display text-2xl font-semibold text-foreground">
                  {title}
                </Dialog.Title>
                {description ? (
                  <Dialog.Description className="mt-2 text-sm leading-6 text-muted-foreground">
                    {description}
                  </Dialog.Description>
                ) : null}
              </div>
              <Dialog.Close className="rounded-md p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/25">
                <X className="h-4 w-4" aria-hidden="true" />
                <span className="sr-only">Cerrar modal</span>
              </Dialog.Close>
            </div>
            <div className="mt-5">{children}</div>
          </Dialog.Content>
        </div>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

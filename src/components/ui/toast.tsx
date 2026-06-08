import * as ToastPrimitive from "@radix-ui/react-toast";
import { useRef } from "react";
import { useGSAP } from "@gsap/react";
import { gsap } from "gsap";
import { AlertTriangle, CheckCircle2, Info, XCircle } from "lucide-react";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { useAppStore } from "@/store/app-store";
import type { AppToast, ToastIntent } from "@/types/domain";
import { cn } from "@/lib/cn";
import { motionPresets, setMotionCompleteState, shouldSkipMotion } from "@/lib/motion";

const intentIcons = {
  success: CheckCircle2,
  warning: AlertTriangle,
  error: XCircle,
  info: Info,
} satisfies Record<ToastIntent, typeof Info>;

const intentClasses: Record<ToastIntent, string> = {
  success: "border-success/25 bg-success/12 text-success",
  warning: "border-warning/30 bg-warning/10 text-warning",
  error: "border-destructive/25 bg-destructive/10 text-destructive",
  info: "border-primary/25 bg-primary/10 text-primary",
};

function AnimatedToast({
  onRemove,
  toast,
}: {
  onRemove: (toastId: string) => void;
  toast: AppToast;
}) {
  const rootRef = useRef<HTMLLIElement>(null);
  const exitTweenRef = useRef<gsap.core.Tween | null>(null);
  const reducedMotion = useReducedMotion();
  const Icon = intentIcons[toast.intent];
  useGSAP(
    () => {
      const root = rootRef.current;

      if (!root) {
        return;
      }

      if (shouldSkipMotion(reducedMotion)) {
        setMotionCompleteState(root);
        return;
      }

      const tween = gsap.fromTo(root, motionPresets.toastIn.from, {
        ...motionPresets.toastIn.to,
        clearProps: "transform,visibility,opacity",
      });

      return () => {
        exitTweenRef.current?.kill();
        tween.kill();
      };
    },
    { dependencies: [reducedMotion], scope: rootRef },
  );

  const closeWithMotion = (open: boolean) => {
    if (open) {
      return;
    }

    const root = rootRef.current;

    if (!root || shouldSkipMotion(reducedMotion)) {
      onRemove(toast.id);
      return;
    }

    exitTweenRef.current?.kill();
    exitTweenRef.current = gsap.to(root, {
      ...motionPresets.toastOut.to,
      onComplete: () => onRemove(toast.id),
    });
  };

  return (
    <ToastPrimitive.Root
      className="grid grid-cols-[auto_1fr] gap-3 rounded-lg border border-border bg-card p-4 text-card-foreground shadow-ledger motion-transform"
      duration={4200}
      onOpenChange={closeWithMotion}
      ref={rootRef}
    >
      <div className={cn("rounded-md border p-2", intentClasses[toast.intent])}>
        <Icon className="h-4 w-4" aria-hidden="true" />
      </div>
      <div>
        <ToastPrimitive.Title className="text-sm font-semibold text-foreground">
          {toast.title}
        </ToastPrimitive.Title>
        {toast.description ? (
          <ToastPrimitive.Description className="mt-1 text-sm leading-5 text-muted-foreground">
            {toast.description}
          </ToastPrimitive.Description>
        ) : null}
      </div>
    </ToastPrimitive.Root>
  );
}

export function AppToasts() {
  const toasts = useAppStore((state) => state.toasts);
  const removeToast = useAppStore((state) => state.removeToast);

  return (
    <>
      {toasts.map((toast) => (
        <AnimatedToast key={toast.id} onRemove={removeToast} toast={toast} />
      ))}
      <ToastPrimitive.Viewport className="fixed bottom-4 right-4 z-[60] flex w-[min(24rem,calc(100vw-2rem))] flex-col gap-3 outline-none" />
    </>
  );
}

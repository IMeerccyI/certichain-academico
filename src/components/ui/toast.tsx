import * as ToastPrimitive from "@radix-ui/react-toast";
import { useRef } from "react";
import { useGSAP } from "@gsap/react";
import { gsap } from "gsap";
import { AlertTriangle, CheckCircle2, Info, X, XCircle } from "lucide-react";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { useAppStore } from "@/store/app-store";
import type { AppToast, ToastIntent } from "@/types/domain";
import { cn } from "@/lib/cn";
import { motionPresets, setMotionCompleteState, shouldSkipMotion } from "@/lib/motion";

const intentStyles = {
  success: {
    Icon: CheckCircle2,
    accent: "border-l-success",
    icon: "text-success",
    wash: "from-success/10",
  },
  warning: {
    Icon: AlertTriangle,
    accent: "border-l-warning",
    icon: "text-warning",
    wash: "from-warning/10",
  },
  error: {
    Icon: XCircle,
    accent: "border-l-destructive",
    icon: "text-destructive",
    wash: "from-destructive/10",
  },
  info: {
    Icon: Info,
    accent: "border-l-primary",
    icon: "text-primary",
    wash: "from-primary/10",
  },
} satisfies Record<
  ToastIntent,
  {
    Icon: typeof Info;
    accent: string;
    icon: string;
    wash: string;
  }
>;

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
  const style = intentStyles[toast.intent];
  const Icon = style.Icon;

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
      className={cn(
        "group relative overflow-hidden rounded-lg border border-border bg-card text-card-foreground motion-transform",
        "border-l-[3px] shadow-[inset_0_1px_0_hsl(var(--foreground)/0.05),0_22px_56px_-40px_hsl(var(--shadow-ledger)/1)]",
        style.accent,
      )}
      duration={4500}
      onOpenChange={closeWithMotion}
      ref={rootRef}
    >
      <div
        aria-hidden="true"
        className={cn(
          "pointer-events-none absolute inset-0 bg-gradient-to-br to-transparent opacity-80",
          style.wash,
        )}
      />
      <div className="relative flex items-start gap-3 p-3.5">
        <div
          className={cn(
            "mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-md border border-border/70 bg-background/80",
            style.icon,
          )}
        >
          <Icon className="h-4 w-4" aria-hidden="true" strokeWidth={2.25} />
        </div>

        <div className="min-w-0 flex-1 pr-1">
          <ToastPrimitive.Title className="text-[0.8125rem] font-semibold leading-5 tracking-[-0.01em] text-foreground">
            {toast.title}
          </ToastPrimitive.Title>
          {toast.description ? (
            <ToastPrimitive.Description className="mt-1 text-xs leading-[1.45] text-muted-foreground">
              {toast.description}
            </ToastPrimitive.Description>
          ) : null}
        </div>

        <ToastPrimitive.Close
          aria-label="Cerrar notificacion"
          className="grid h-7 w-7 shrink-0 place-items-center rounded-md text-muted-foreground/70 transition-colors hover:bg-muted/80 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
        >
          <X className="h-3.5 w-3.5" aria-hidden="true" />
        </ToastPrimitive.Close>
      </div>
    </ToastPrimitive.Root>
  );
}

export function AppToasts() {
  const toasts = useAppStore((state) => state.toasts);
  const removeToast = useAppStore((state) => state.removeToast);
  const visibleToasts = toasts.slice(-3);

  return (
    <>
      {visibleToasts.map((toast) => (
        <AnimatedToast key={toast.id} onRemove={removeToast} toast={toast} />
      ))}
      <ToastPrimitive.Viewport className="fixed bottom-4 right-4 z-[60] flex w-[min(21.5rem,calc(100vw-2rem))] flex-col gap-2.5 outline-none sm:bottom-5 sm:right-5" />
    </>
  );
}
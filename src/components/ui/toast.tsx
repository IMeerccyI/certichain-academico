import * as ToastPrimitive from "@radix-ui/react-toast";
import { AlertTriangle, CheckCircle2, Info, XCircle } from "lucide-react";
import { useAppStore } from "@/store/app-store";
import type { ToastIntent } from "@/types/domain";
import { cn } from "@/lib/cn";

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

export function AppToasts() {
  const toasts = useAppStore((state) => state.toasts);
  const removeToast = useAppStore((state) => state.removeToast);

  return (
    <>
      {toasts.map((toast) => {
        const Icon = intentIcons[toast.intent];

        return (
          <ToastPrimitive.Root
            key={toast.id}
            className="grid grid-cols-[auto_1fr] gap-3 rounded-lg border border-border bg-card p-4 text-card-foreground shadow-ledger data-[state=open]:animate-in data-[state=closed]:animate-out"
            duration={4200}
            onOpenChange={(open) => {
              if (!open) {
                removeToast(toast.id);
              }
            }}
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
      })}
      <ToastPrimitive.Viewport className="fixed bottom-4 right-4 z-[60] flex w-[min(24rem,calc(100vw-2rem))] flex-col gap-3 outline-none" />
    </>
  );
}

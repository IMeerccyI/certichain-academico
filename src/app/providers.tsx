import type { ReactNode } from "react";
import * as ToastPrimitive from "@radix-ui/react-toast";
import * as Tooltip from "@radix-ui/react-tooltip";
import { AppToasts } from "@/components/ui/toast";
import { registerMotionSystem } from "@/lib/motion";

registerMotionSystem();

type AppProvidersProps = {
  children: ReactNode;
};

export function AppProviders({ children }: AppProvidersProps) {
  return (
    <Tooltip.Provider delayDuration={180}>
      <ToastPrimitive.Provider swipeDirection="right">
        {children}
        <AppToasts />
      </ToastPrimitive.Provider>
    </Tooltip.Provider>
  );
}

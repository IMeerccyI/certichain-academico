import type { ReactNode } from "react";
import * as ToastPrimitive from "@radix-ui/react-toast";
import * as Tooltip from "@radix-ui/react-tooltip";
import { useGSAP } from "@gsap/react";
import { gsap } from "gsap";
import { AppToasts } from "@/components/ui/toast";

gsap.registerPlugin(useGSAP);
gsap.defaults({
  duration: 0.45,
  ease: "power2.out",
});

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

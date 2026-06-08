import { useRef } from "react";
import { useGSAP } from "@gsap/react";
import { gsap } from "gsap";
import { motionPresets, setMotionCompleteState, shouldSkipMotion } from "@/lib/motion";
import { useReducedMotion } from "@/hooks/useReducedMotion";

export function usePageTransition<T extends HTMLElement>(key: string) {
  const scope = useRef<T>(null);
  const reducedMotion = useReducedMotion();

  useGSAP(
    () => {
      if (!scope.current) {
        return;
      }

      if (shouldSkipMotion(reducedMotion)) {
        setMotionCompleteState(scope.current);
        return;
      }

      const timeline = gsap.timeline({ defaults: { duration: 0.3, ease: "power2.out" } });

      timeline
        .addLabel("pageEnter")
        .fromTo(scope.current, motionPresets.pageEnter.from, {
          ...motionPresets.pageEnter.to,
          clearProps: "transform,visibility,opacity",
        });
    },
    { scope, dependencies: [key, reducedMotion], revertOnUpdate: true },
  );

  return scope;
}

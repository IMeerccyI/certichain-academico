import { useRef } from "react";
import { useGSAP } from "@gsap/react";
import { gsap } from "gsap";
import { motionPresets, setMotionCompleteState, shouldSkipMotion } from "@/lib/motion";
import { useReducedMotion } from "@/hooks/useReducedMotion";

export function useGsapReveal<T extends HTMLElement>() {
  const scope = useRef<T>(null);
  const reducedMotion = useReducedMotion();

  useGSAP(
    () => {
      const targets = scope.current?.querySelectorAll("[data-reveal]");

      if (!targets?.length) {
        return;
      }

      if (shouldSkipMotion(reducedMotion)) {
        setMotionCompleteState(targets);
        return;
      }

      gsap.fromTo(targets, motionPresets.cardReveal.from, {
        ...motionPresets.cardReveal.to,
        clearProps: "transform,visibility,opacity",
        stagger: 0.055,
      });
    },
    { scope, dependencies: [reducedMotion], revertOnUpdate: true },
  );

  return scope;
}

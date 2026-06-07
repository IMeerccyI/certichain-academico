import { useRef } from "react";
import { useGSAP } from "@gsap/react";
import { gsap } from "gsap";
import { useReducedMotion } from "@/hooks/useReducedMotion";

export function usePageTransition<T extends HTMLElement>(key: string) {
  const scope = useRef<T>(null);
  const reducedMotion = useReducedMotion();

  useGSAP(
    () => {
      if (!scope.current || reducedMotion) {
        return;
      }

      gsap.fromTo(
        scope.current,
        { opacity: 0, y: 10 },
        {
          opacity: 1,
          y: 0,
          duration: 0.32,
          ease: "power2.out",
          clearProps: "opacity,transform",
        },
      );
    },
    { scope, dependencies: [key, reducedMotion], revertOnUpdate: true },
  );

  return scope;
}

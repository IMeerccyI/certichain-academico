import { useRef } from "react";
import { useGSAP } from "@gsap/react";
import { gsap } from "gsap";
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

      if (reducedMotion) {
        gsap.set(targets, { opacity: 1, y: 0, clearProps: "opacity,transform" });
        return;
      }

      gsap.from(targets, {
        opacity: 0,
        y: 18,
        duration: 0.52,
        stagger: 0.055,
        ease: "power2.out",
        clearProps: "opacity,transform",
      });
    },
    { scope, dependencies: [reducedMotion], revertOnUpdate: true },
  );

  return scope;
}

import { useRef } from "react";
import { useGSAP } from "@gsap/react";
import { gsap } from "gsap";
import {
  motionPresets,
  motionSelectors,
  setMotionCompleteState,
  shouldSkipMotion,
} from "@/lib/motion";
import { useReducedMotion } from "@/hooks/useReducedMotion";

type UseStaggeredCardsOptions = {
  selector?: string;
  stagger?: number;
  y?: number;
};

export function useStaggeredCards<T extends HTMLElement>({
  selector = motionSelectors.cards,
  stagger = motionPresets.listStagger.to.stagger,
  y = motionPresets.listStagger.from.y,
}: UseStaggeredCardsOptions = {}) {
  const scope = useRef<T>(null);
  const reducedMotion = useReducedMotion();

  useGSAP(
    () => {
      const targets = scope.current?.querySelectorAll(selector);

      if (!targets?.length) {
        return;
      }

      if (shouldSkipMotion(reducedMotion)) {
        setMotionCompleteState(targets);
        return;
      }

      gsap.fromTo(
        targets,
        { autoAlpha: 0, y },
        {
          autoAlpha: 1,
          clearProps: "transform,visibility,opacity",
          duration: motionPresets.listStagger.to.duration,
          ease: motionPresets.listStagger.to.ease,
          stagger,
          y: 0,
        },
      );
    },
    { dependencies: [reducedMotion, selector, stagger, y], revertOnUpdate: true, scope },
  );

  return scope;
}

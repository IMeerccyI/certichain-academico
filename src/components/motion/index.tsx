import { useRef } from "react";
import type { ElementType, HTMLAttributes, ReactNode } from "react";
import { useGSAP } from "@gsap/react";
import { gsap } from "gsap";
import { useCountUpMetric } from "@/hooks/useCountUpMetric";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import {
  motionPresets,
  motionSelectors,
  setMotionCompleteState,
  shouldSkipMotion,
} from "@/lib/motion";
import { cn } from "@/lib/cn";

type MotionElement = "article" | "button" | "div" | "li" | "main" | "section";

type MotionPageProps = HTMLAttributes<HTMLDivElement> & {
  staggerSelector?: string;
};

type MotionCardProps = HTMLAttributes<HTMLElement> & {
  as?: MotionElement;
  type?: "button" | "reset" | "submit";
};

type RouteTransitionBoundaryProps = HTMLAttributes<HTMLElement> & {
  as?: MotionElement;
  children: ReactNode;
  routeKey: string;
};

type AnimatedNumberProps = HTMLAttributes<HTMLSpanElement> & {
  value: number | string;
  duration?: number;
  prefix?: string;
  suffix?: string;
};

function parseMetricParts(value: number | string, prefix = "", suffix = "") {
  if (typeof value === "number") {
    return {
      decimals: Number.isInteger(value) ? 0 : String(value).split(".")[1]?.length ?? 0,
      numericValue: value,
      prefix,
      suffix,
    };
  }

  const match = value.match(/^([^0-9-]*)(-?\d+(?:[.,]\d+)?)(.*)$/);

  if (!match) {
    return null;
  }

  const [, parsedPrefix, rawNumber, parsedSuffix] = match;
  const normalizedNumber = rawNumber.replace(",", ".");
  const decimals = normalizedNumber.includes(".") ? normalizedNumber.split(".")[1].length : 0;

  return {
    decimals,
    numericValue: Number(normalizedNumber),
    prefix: prefix || parsedPrefix,
    suffix: suffix || parsedSuffix,
  };
}

export function MotionPage({
  children,
  className,
  staggerSelector = motionSelectors.sections,
  ...props
}: MotionPageProps) {
  const scope = useRef<HTMLDivElement>(null);
  const reducedMotion = useReducedMotion();

  useGSAP(
    () => {
      const page = scope.current;
      const sections = page?.querySelectorAll(staggerSelector);

      if (!page) {
        return;
      }

      if (shouldSkipMotion(reducedMotion)) {
        setMotionCompleteState(page);
        if (sections?.length) {
          setMotionCompleteState(sections);
        }
        return;
      }

      const timeline = gsap.timeline({
        defaults: { duration: 0.4, ease: "power2.out" },
      });

      timeline
        .addLabel("pageEnter")
        .fromTo(page, motionPresets.pageEnter.from, motionPresets.pageEnter.to, "pageEnter");

      if (sections?.length) {
        timeline.fromTo(
          sections,
          motionPresets.cardReveal.from,
          {
            ...motionPresets.cardReveal.to,
            clearProps: "transform,visibility,opacity",
            stagger: 0.055,
          },
          "pageEnter+=0.05",
        );
      }
    },
    { dependencies: [reducedMotion, staggerSelector], revertOnUpdate: true, scope },
  );

  return (
    <div
      className={cn("motion-transform", className)}
      data-motion-page
      ref={scope}
      {...props}
    >
      {children}
    </div>
  );
}

export function MotionCard({
  as = "article",
  children,
  className,
  ...props
}: MotionCardProps) {
  const Component = as as ElementType;

  return (
    <Component
      className={cn("motion-transform", className)}
      data-motion-card
      {...props}
    >
      {children}
    </Component>
  );
}

export function AnimatedNumber({
  className,
  duration,
  prefix,
  suffix,
  value,
  ...props
}: AnimatedNumberProps) {
  const parsed = parseMetricParts(value, prefix, suffix);
  const displayValue = useCountUpMetric(parsed?.numericValue ?? 0, {
    decimals: parsed?.decimals ?? 0,
    duration,
    enabled: Boolean(parsed),
    prefix: parsed?.prefix,
    suffix: parsed?.suffix,
  });

  return (
    <span className={className} data-motion-number {...props}>
      {parsed ? displayValue : value}
    </span>
  );
}

export function RouteTransitionBoundary({
  as = "div",
  children,
  className,
  routeKey,
  ...props
}: RouteTransitionBoundaryProps) {
  const scope = useRef<HTMLElement>(null);
  const reducedMotion = useReducedMotion();
  const Component = as as ElementType;

  useGSAP(
    () => {
      const target = scope.current;

      if (!target) {
        return;
      }

      if (shouldSkipMotion(reducedMotion)) {
        setMotionCompleteState(target);
        return;
      }

      const timeline = gsap.timeline({
        defaults: { duration: 0.3, ease: "power2.out" },
      });

      timeline
        .addLabel("pageExit")
        .set(target, { autoAlpha: 0, y: motionPresets.pageEnter.from.y })
        .addLabel("pageEnter")
        .to(target, {
          autoAlpha: 1,
          clearProps: "transform,visibility,opacity",
          duration: motionPresets.pageEnter.to.duration,
          ease: motionPresets.pageEnter.to.ease,
          y: 0,
        }, "pageEnter");
    },
    { dependencies: [routeKey, reducedMotion], revertOnUpdate: true, scope },
  );

  return (
    <Component
      className={cn("motion-transform", className)}
      data-route-transition
      ref={scope}
      {...props}
    >
      {children}
    </Component>
  );
}

export { Reveal } from "@/components/motion/reveal";

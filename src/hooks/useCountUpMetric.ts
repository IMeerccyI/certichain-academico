import { useMemo, useRef, useState } from "react";
import { useGSAP } from "@gsap/react";
import { gsap } from "gsap";
import { motionPresets, shouldSkipMotion } from "@/lib/motion";
import { useReducedMotion } from "@/hooks/useReducedMotion";

type CountUpOptions = {
  decimals?: number;
  duration?: number;
  enabled?: boolean;
  formatter?: (value: number) => string;
  from?: number;
  prefix?: string;
  suffix?: string;
};

function formatMetricValue(
  value: number,
  { decimals = 0, formatter, prefix = "", suffix = "" }: CountUpOptions,
) {
  if (formatter) {
    return formatter(value);
  }

  return `${prefix}${value.toFixed(decimals)}${suffix}`;
}

export function useCountUpMetric(value: number, options: CountUpOptions = {}) {
  const {
    decimals = 0,
    duration = motionPresets.metricCount.duration,
    enabled = true,
    formatter,
    from,
    prefix = "",
    suffix = "",
  } = options;
  const reducedMotion = useReducedMotion();
  const previousValue = useRef(from ?? value);
  const formatOptions = useMemo(
    () => ({ decimals, formatter, prefix, suffix }),
    [decimals, formatter, prefix, suffix],
  );
  const [displayValue, setDisplayValue] = useState(() =>
    formatMetricValue(value, formatOptions),
  );

  useGSAP(
    () => {
      if (shouldSkipMotion(reducedMotion) || !enabled) {
        previousValue.current = value;
        setDisplayValue(formatMetricValue(value, formatOptions));
        return;
      }

      const counter = { value: previousValue.current };
      const tween = gsap.to(counter, {
        duration,
        ease: motionPresets.metricCount.ease,
        onComplete: () => {
          previousValue.current = value;
          setDisplayValue(formatMetricValue(value, formatOptions));
        },
        onUpdate: () => {
          setDisplayValue(formatMetricValue(counter.value, formatOptions));
        },
        value,
      });

      return () => tween.kill();
    },
    {
      dependencies: [duration, enabled, formatOptions, reducedMotion, value],
      revertOnUpdate: true,
    },
  );

  return displayValue;
}

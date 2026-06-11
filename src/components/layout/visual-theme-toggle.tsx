import { useId, useRef, useState, type MouseEvent } from "react";
import { useGSAP } from "@gsap/react";
import { gsap } from "gsap";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { cn } from "@/lib/cn";
import {
  animateColorSchemeChange,
  applyColorScheme,
  getStoredColorScheme,
  type ColorScheme,
} from "@/lib/theme";

const stars = [
  { cx: 18, cy: 13, r: 1.2 },
  { cx: 35, cy: 9, r: 0.9 },
  { cx: 56, cy: 17, r: 1.1 },
  { cx: 82, cy: 10, r: 1 },
  { cx: 103, cy: 20, r: 1.3 },
  { cx: 128, cy: 12, r: 0.8 },
];

export function VisualThemeToggle() {
  const [scheme, setScheme] = useState<ColorScheme>(() => getStoredColorScheme());
  const buttonRef = useRef<HTMLButtonElement>(null);
  const knobRef = useRef<HTMLSpanElement>(null);
  const reducedMotion = useReducedMotion();
  const rawId = useId().replace(/:/g, "");
  const dayGradientId = `${rawId}-theme-day`;
  const nightGradientId = `${rawId}-theme-night`;
  const waterGradientId = `${rawId}-theme-water`;
  const isNight = scheme === "dark";

  useGSAP(
    () => {
      if (!knobRef.current || shouldSkipKnobMotion(reducedMotion)) {
        return;
      }

      gsap.to(knobRef.current, {
        x: isNight ? 44 : 0,
        duration: 0.55,
        ease: "back.out(1.45)",
      });
    },
    { dependencies: [isNight, reducedMotion], scope: buttonRef },
  );

  const handleToggle = (event: MouseEvent<HTMLButtonElement>) => {
    const nextScheme: ColorScheme = isNight ? "light" : "dark";

    if (reducedMotion || import.meta.env.MODE === "test") {
      applyColorScheme(nextScheme);
      setScheme(nextScheme);
      return;
    }

    animateColorSchemeChange(
      nextScheme,
      {
        x: event.clientX,
        y: event.clientY,
      },
      reducedMotion,
      (appliedScheme) => setScheme(appliedScheme),
    );
  };

  return (
    <button
      aria-label="Alternar vista visual del tema"
      aria-pressed={isNight}
      className={cn(
        "group relative h-8 w-[4.75rem] shrink-0 overflow-hidden rounded-full border p-[3px] shadow-[inset_0_1px_0_hsl(var(--foreground)/0.08),0_14px_28px_-22px_hsl(var(--shadow-ledger)/1)] transition-[border-color,box-shadow,transform] duration-300 hover:-translate-y-px active:translate-y-0 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/25",
        isNight
          ? "border-blue-700/80 bg-[#061436]"
          : "border-white/80 bg-[#f8fbff]",
      )}
      data-state={isNight ? "night" : "day"}
      onClick={handleToggle}
      ref={buttonRef}
      title="Alternar tema claro u oscuro"
      type="button"
    >
      <span className="sr-only">Alternar vista visual del tema</span>
      <svg
        aria-hidden="true"
        className="absolute inset-[3px] h-[calc(100%-6px)] w-[calc(100%-6px)] rounded-full"
        preserveAspectRatio="none"
        viewBox="0 0 152 56"
      >
        <defs>
          <linearGradient id={dayGradientId} x1="0" x2="1" y1="0" y2="1">
            <stop offset="0" stopColor="#fff1a7" />
            <stop offset="0.43" stopColor="#e8a764" />
            <stop offset="0.74" stopColor="#536fbf" />
            <stop offset="1" stopColor="#101b4d" />
          </linearGradient>
          <linearGradient id={nightGradientId} x1="0" x2="1" y1="0" y2="1">
            <stop offset="0" stopColor="#344fc2" />
            <stop offset="0.5" stopColor="#172762" />
            <stop offset="1" stopColor="#050b20" />
          </linearGradient>
          <linearGradient id={waterGradientId} x1="0" x2="1">
            <stop offset="0" stopColor="#101a4d" />
            <stop offset="0.6" stopColor="#343477" />
            <stop offset="1" stopColor="#07102b" />
          </linearGradient>
        </defs>
        <rect
          className="transition-opacity duration-500"
          fill={`url(#${dayGradientId})`}
          height="56"
          opacity={isNight ? 0 : 1}
          rx="28"
          width="152"
        />
        <rect
          className="transition-opacity duration-500"
          fill={`url(#${nightGradientId})`}
          height="56"
          opacity={isNight ? 1 : 0}
          rx="28"
          width="152"
        />
        <g className="transition-opacity duration-500" opacity={isNight ? 0 : 1}>
          <circle cx="116" cy="15" fill="#fff2a3" opacity="0.7" r="12" />
          <path
            d="M42 21 C70 11 102 16 151 10"
            fill="none"
            opacity="0.34"
            stroke="#fff8c9"
            strokeLinecap="round"
            strokeWidth="5"
          />
          <path
            d="M47 34 C82 25 113 29 151 28"
            fill="none"
            opacity="0.42"
            stroke="#fff0a6"
            strokeLinecap="round"
            strokeWidth="3"
          />
        </g>
        <g className="transition-opacity duration-500" opacity={isNight ? 1 : 0}>
          <path
            d="M-4 17 C28 1 60 4 91 15 C113 22 133 13 156 7 L156 32 C124 24 105 35 75 27 C44 18 18 27 -4 33 Z"
            fill="#6fffd9"
            opacity="0.28"
          />
          {stars.map((star) => (
            <circle
              cx={star.cx}
              cy={star.cy}
              fill="#dff4ff"
              key={`${star.cx}-${star.cy}`}
              r={star.r}
            />
          ))}
        </g>
        <path
          className="transition-colors duration-500"
          d="M0 36 C22 24 40 28 57 34 C75 42 91 26 110 27 C129 28 141 35 152 29 L152 56 L0 56 Z"
          fill={isNight ? "#0b1537" : "#283268"}
          opacity="0.88"
        />
        <path
          className="transition-colors duration-500"
          d="M39 40 L65 19 L87 40 Z M74 41 L111 14 L156 44 L156 56 L74 56 Z"
          fill={isNight ? "#061027" : "#293771"}
        />
        <path
          d="M0 42 C24 38 45 43 68 43 C96 43 116 38 152 42 L152 56 L0 56 Z"
          fill={`url(#${waterGradientId})`}
          opacity="0.88"
        />
        <path
          className="transition-colors duration-500"
          d="M0 48 C16 43 31 43 47 46 C62 49 78 45 92 42 C108 39 124 47 152 48 L152 56 L0 56 Z"
          fill={isNight ? "#020713" : "#07143a"}
          opacity="0.9"
        />
        <path
          d="M12 49 L17 35 L22 49 Z M24 50 L31 30 L38 50 Z M40 49 L45 37 L50 49 Z"
          fill="#010511"
          opacity="0.88"
        />
      </svg>
      <span
        aria-hidden="true"
        className={cn(
          "absolute left-[3px] top-[3px] grid h-[26px] w-[26px] place-items-center rounded-full shadow-[0_10px_18px_-10px_rgba(0,0,0,0.85),inset_5px_4px_8px_rgba(255,255,255,0.3),inset_-6px_-8px_10px_rgba(0,0,0,0.22)]",
          isNight ? "bg-[#2f4ed0]" : "bg-[#f8bf19]",
        )}
        ref={knobRef}
        style={{ transform: reducedMotion ? `translateX(${isNight ? 44 : 0}px)` : undefined }}
      >
        <svg aria-hidden="true" className="h-[18px] w-[18px]" viewBox="0 0 48 48">
          <g className="transition-opacity duration-300" opacity={isNight ? 0 : 1}>
            <circle cx="24" cy="24" fill="#fffbd6" r="7" />
            {[0, 45, 90, 135, 180, 225, 270, 315].map((rotation) => (
              <rect
                fill="#fff7c5"
                height="8"
                key={rotation}
                rx="2"
                transform={`rotate(${rotation} 24 24)`}
                width="3.5"
                x="22.25"
                y="7"
              />
            ))}
          </g>
          <g className="transition-opacity duration-300" opacity={isNight ? 1 : 0}>
            <path
              d="M28.8 39.2C20 38.9 12.9 31.4 12.9 22.4C12.9 14 18.9 6.9 27 5.6C23.5 10 21.7 14.7 21.7 20.2C21.7 30.1 29.3 37.2 39.1 35.6C36.6 38 33.1 39.3 28.8 39.2Z"
              fill="#ddfbff"
            />
            <path
              d="M34 10.5 L36 15 L40.5 17 L36 19 L34 23.5 L32 19 L27.5 17 L32 15 Z"
              fill="#e9fbff"
            />
            <path
              d="M38.5 25 L40 28 L43 29.5 L40 31 L38.5 34 L37 31 L34 29.5 L37 28 Z"
              fill="#bfdfff"
            />
          </g>
        </svg>
      </span>
    </button>
  );
}

function shouldSkipKnobMotion(reducedMotion: boolean) {
  return reducedMotion || import.meta.env.MODE === "test";
}
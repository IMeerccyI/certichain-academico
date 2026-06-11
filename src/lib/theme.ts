export type ColorScheme = "dark" | "light";

export type ThemeTransitionOrigin = {
  x: number;
  y: number;
};

const STORAGE_KEY = "certichain-color-scheme";

const THEME_TRANSITION = {
  durationMs: 1600,
  easing: "cubic-bezier(0.45, 0.05, 0.55, 0.95)",
} as const;

export function getStoredColorScheme(): ColorScheme {
  if (typeof window === "undefined") {
    return "light";
  }

  const stored = window.localStorage.getItem(STORAGE_KEY);
  return stored === "dark" ? "dark" : "light";
}

export function getActiveColorScheme(): ColorScheme {
  if (typeof document === "undefined") {
    return getStoredColorScheme();
  }

  return document.documentElement.classList.contains("dark") ? "dark" : "light";
}

export function applyColorScheme(scheme: ColorScheme) {
  const root = document.documentElement;
  root.classList.remove("dark", "light");
  root.classList.add(scheme);
  root.style.colorScheme = scheme;
  window.localStorage.setItem(STORAGE_KEY, scheme);
}

export function initColorScheme() {
  applyColorScheme(getStoredColorScheme());
}

function getRevealRadius(x: number, y: number) {
  return (
    Math.hypot(
      Math.max(x, window.innerWidth - x),
      Math.max(y, window.innerHeight - y),
    ) + 48
  );
}

function supportsViewTransitions() {
  return typeof document !== "undefined" && "startViewTransition" in document;
}

function setTransitionOrigin(x: number, y: number) {
  const root = document.documentElement;
  const radius = getRevealRadius(x, y);
  root.style.setProperty("--theme-transition-x", `${x}px`);
  root.style.setProperty("--theme-transition-y", `${y}px`);
  root.style.setProperty("--theme-transition-radius", `${radius}px`);
}

function clearTransitionOrigin() {
  const root = document.documentElement;
  root.classList.remove("theme-view-transition", "theme-transitioning");
  root.style.removeProperty("--theme-transition-x");
  root.style.removeProperty("--theme-transition-y");
  root.style.removeProperty("--theme-transition-radius");
}

function animateWithViewTransition(
  nextScheme: ColorScheme,
  origin: ThemeTransitionOrigin,
  onApplied?: (scheme: ColorScheme) => void,
  onComplete?: () => void,
) {
  const { x, y } = origin;
  const root = document.documentElement;
  const radius = getRevealRadius(x, y);

  setTransitionOrigin(x, y);
  root.classList.add("theme-view-transition");

  const transition = (
    document as Document & {
      startViewTransition: (callback: () => void | Promise<void>) => {
        ready: Promise<void>;
        finished: Promise<void>;
      };
    }
  ).startViewTransition(() => {
    applyColorScheme(nextScheme);
    onApplied?.(nextScheme);
  });

  transition.ready
    .then(() => {
      root.animate(
        {
          clipPath: [
            `circle(0px at ${x}px ${y}px)`,
            `circle(${radius}px at ${x}px ${y}px)`,
          ],
        },
        {
          duration: THEME_TRANSITION.durationMs,
          easing: THEME_TRANSITION.easing,
          pseudoElement: "::view-transition-new(root)",
        },
      );
    })
    .catch(() => undefined);

  transition.finished
    .then(() => {
      clearTransitionOrigin();
      onComplete?.();
    })
    .catch(() => {
      clearTransitionOrigin();
      onComplete?.();
    });
}

function animateWithCssFallback(
  nextScheme: ColorScheme,
  onApplied?: (scheme: ColorScheme) => void,
  onComplete?: () => void,
) {
  const root = document.documentElement;
  root.classList.add("theme-transitioning");

  applyColorScheme(nextScheme);
  onApplied?.(nextScheme);

  window.setTimeout(() => {
    root.classList.remove("theme-transitioning");
    onComplete?.();
  }, THEME_TRANSITION.durationMs);
}

/**
 * Captura la UI real con View Transitions y revela el tema nuevo
 * en una onda circular desde el punto del clic, sin velo opaco.
 */
export function animateColorSchemeChange(
  nextScheme: ColorScheme,
  origin: ThemeTransitionOrigin,
  reducedMotion = false,
  onApplied?: (scheme: ColorScheme) => void,
  onComplete?: () => void,
) {
  if (reducedMotion || typeof window === "undefined") {
    applyColorScheme(nextScheme);
    onApplied?.(nextScheme);
    onComplete?.();
    return;
  }

  if (supportsViewTransitions()) {
    animateWithViewTransition(nextScheme, origin, onApplied, onComplete);
    return;
  }

  animateWithCssFallback(nextScheme, onApplied, onComplete);
}
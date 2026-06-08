import { useEffect, useState } from "react";
import { useAppStore } from "@/store/app-store";

export function useReducedMotion() {
  const settingsReducedMotion = useAppStore((state) => state.settings.reducedMotion);
  const [systemReducedMotion, setSystemReducedMotion] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) {
      return;
    }

    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setSystemReducedMotion(query.matches);

    update();
    query.addEventListener?.("change", update);

    return () => query.removeEventListener?.("change", update);
  }, []);

  return systemReducedMotion || settingsReducedMotion;
}

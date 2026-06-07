import { useRef } from "react";
import { useGSAP } from "@gsap/react";
import { gsap } from "gsap";
import { Select } from "@/components/ui/select";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { useAppStore, type ActiveRole } from "@/store/app-store";

const roleOptions = [
  { label: "Universidad emisora", value: "issuer" },
  { label: "Estudiante", value: "student" },
  { label: "Verificador", value: "verifier" },
  { label: "Auditor", value: "auditor" },
] satisfies Array<{ label: string; value: ActiveRole }>;

export function RoleSelector() {
  const activeRole = useAppStore((state) => state.activeRole);
  const setActiveRole = useAppStore((state) => state.setActiveRole);
  const reducedMotion = useReducedMotion();
  const scope = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      if (!scope.current || reducedMotion) {
        return;
      }

      gsap.fromTo(
        scope.current,
        { scale: 0.985 },
        {
          scale: 1,
          duration: 0.22,
          ease: "power2.out",
          clearProps: "transform",
        },
      );
    },
    { dependencies: [activeRole, reducedMotion], scope, revertOnUpdate: true },
  );

  return (
    <div ref={scope}>
      <Select
        ariaLabel="Rol activo"
        className="min-w-[10.5rem]"
        onValueChange={(value) => setActiveRole(value as ActiveRole)}
        options={roleOptions}
        value={activeRole}
      />
    </div>
  );
}

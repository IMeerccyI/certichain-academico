import { useMemo, useRef } from "react";
import { useGSAP } from "@gsap/react";
import { gsap } from "gsap";
import { Select } from "@/components/ui/select";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { personaLabel } from "@/lib/roles";
import { useAppStore } from "@/store/app-store";
import type { Role } from "@/types/domain";

const hiddenPersonaRoles: Role[] = ["academic_admin", "auditor"];

export function PersonaSelector() {
  const activeRole = useAppStore((state) => state.activeRole);
  const activePersona = useAppStore((state) => state.activePersona);
  const issuers = useAppStore((state) => state.issuers);
  const students = useAppStore((state) => state.students);
  const verifierEntities = useAppStore((state) => state.verifierEntities);
  const setActivePersona = useAppStore((state) => state.setActivePersona);
  const reducedMotion = useReducedMotion();
  const scope = useRef<HTMLDivElement>(null);

  const options = useMemo(() => {
    switch (activeRole) {
      case "authorized_issuer":
        return issuers.map((issuer) => ({
          label: issuer.institution,
          value: issuer.id,
        }));
      case "student":
        return students.map((student) => ({
          label: student.fullName,
          value: student.id,
        }));
      case "public_verifier":
        return verifierEntities.map((verifier) => ({
          label: verifier.name,
          value: verifier.id,
        }));
      default:
        return [];
    }
  }, [activeRole, issuers, students, verifierEntities]);

  const value =
    activeRole === "authorized_issuer"
      ? activePersona.issuerId ?? ""
      : activeRole === "student"
        ? activePersona.studentId ?? ""
        : activeRole === "public_verifier"
          ? activePersona.verifierId ?? ""
          : "";

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
    { dependencies: [activeRole, value, reducedMotion], scope, revertOnUpdate: true },
  );

  if (hiddenPersonaRoles.includes(activeRole)) {
    return (
      <div
        aria-label="Persona activa"
        className="hidden min-w-[9rem] rounded-md border border-border/80 bg-secondary px-3 py-1.5 text-xs text-muted-foreground xl:block"
        ref={scope}
      >
        <span className="block text-[10px] uppercase tracking-[0.12em]">Persona activa</span>
        <span className="font-medium text-foreground">{personaLabel(activeRole, activePersona, issuers, students, verifierEntities)}</span>
      </div>
    );
  }

  if (!options.length) {
    return null;
  }

  return (
    <div ref={scope}>
      <Select
        ariaLabel="Persona activa"
        className="min-w-[11rem]"
        onValueChange={(nextValue) => {
          if (activeRole === "authorized_issuer") {
            setActivePersona({ issuerId: nextValue });
            return;
          }

          if (activeRole === "student") {
            setActivePersona({ studentId: nextValue });
            return;
          }

          setActivePersona({ verifierId: nextValue });
        }}
        options={options}
        value={value}
      />
    </div>
  );
}
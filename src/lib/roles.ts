import type { RouteId } from "@/app/routes";
import type { ActivePersona, Issuer, Role, Student, VerifierEntity } from "@/types/domain";

export const ROLE_LABELS: Record<Role, string> = {
  academic_admin: "Administrador academico",
  authorized_issuer: "Universidad emisora",
  auditor: "Auditor",
  public_verifier: "Verificador publico",
  student: "Estudiante",
};

export const ROUTES_BY_ROLE: Record<Role, readonly RouteId[]> = {
  academic_admin: [
    "dashboard",
    "web3",
    "issue",
    "verification",
    "certificates",
    "revocation",
    "issuers",
    "students",
    "ledger",
    "nft",
    "settings",
  ],
  authorized_issuer: [
    "dashboard",
    "web3",
    "issue",
    "verification",
    "certificates",
    "revocation",
    "ledger",
    "nft",
    "settings",
  ],
  student: ["dashboard", "web3", "verification", "students", "certificates", "settings"],
  public_verifier: ["dashboard", "web3", "verification", "certificates", "settings"],
  auditor: [
    "dashboard",
    "web3",
    "verification",
    "certificates",
    "revocation",
    "issuers",
    "students",
    "ledger",
    "settings",
  ],
};

export const DEFAULT_ROUTE_BY_ROLE: Record<Role, RouteId> = {
  academic_admin: "dashboard",
  authorized_issuer: "issue",
  auditor: "ledger",
  public_verifier: "verification",
  student: "students",
};

export function getRoutesForRole(role: Role): readonly RouteId[] {
  return ROUTES_BY_ROLE[role];
}

export function isRouteAllowedForRole(routeId: RouteId, role: Role): boolean {
  return ROUTES_BY_ROLE[role].includes(routeId);
}

export function defaultPersonaForRole(
  role: Role,
  issuers: Issuer[],
  students: Student[],
  verifiers: VerifierEntity[],
): ActivePersona {
  switch (role) {
    case "authorized_issuer":
      return { issuerId: issuers.find((issuer) => issuer.active)?.id ?? issuers[0]?.id };
    case "student":
      return { studentId: students[0]?.id };
    case "public_verifier":
      return { verifierId: verifiers[0]?.id };
    default:
      return {};
  }
}

export function normalizeWallet(address?: string): string {
  return address?.trim().toLowerCase() ?? "";
}

export function walletsMatch(left?: string, right?: string): boolean {
  const normalizedLeft = normalizeWallet(left);
  const normalizedRight = normalizeWallet(right);
  return Boolean(normalizedLeft && normalizedRight && normalizedLeft === normalizedRight);
}

export function resolveActiveIssuer(
  persona: ActivePersona,
  issuers: Issuer[],
): Issuer | undefined {
  if (!persona.issuerId) {
    return undefined;
  }

  return issuers.find((issuer) => issuer.id === persona.issuerId);
}

export function resolveActiveStudent(
  persona: ActivePersona,
  students: Student[],
): Student | undefined {
  if (!persona.studentId) {
    return undefined;
  }

  return students.find((student) => student.id === persona.studentId);
}

export function resolveActiveVerifier(
  persona: ActivePersona,
  verifiers: VerifierEntity[],
): VerifierEntity | undefined {
  if (!persona.verifierId) {
    return undefined;
  }

  return verifiers.find((verifier) => verifier.id === persona.verifierId);
}

export function personaLabel(
  role: Role,
  persona: ActivePersona,
  issuers: Issuer[],
  students: Student[],
  verifiers: VerifierEntity[],
): string {
  switch (role) {
    case "authorized_issuer": {
      const issuer = resolveActiveIssuer(persona, issuers);
      return issuer?.institution ?? issuer?.name ?? "Selecciona emisor";
    }
    case "student": {
      const student = resolveActiveStudent(persona, students);
      return student?.fullName ?? "Selecciona estudiante";
    }
    case "public_verifier": {
      const verifier = resolveActiveVerifier(persona, verifiers);
      return verifier?.name ?? "Selecciona verificador";
    }
    default:
      return "Vista institucional";
  }
}

export function detectPersonaFromWallet(
  walletAddress: string,
  issuers: Issuer[],
  students: Student[],
): ActivePersona {
  const normalized = normalizeWallet(walletAddress);
  const issuer = issuers.find((item) => walletsMatch(item.walletAddress, normalized));
  if (issuer) {
    return { issuerId: issuer.id };
  }

  const student = students.find((item) => walletsMatch(item.walletAddress, normalized));
  if (student) {
    return { studentId: student.id };
  }

  return {};
}

export function roleForDetectedPersona(persona: ActivePersona): Role | undefined {
  if (persona.issuerId) {
    return "authorized_issuer";
  }

  if (persona.studentId) {
    return "student";
  }

  return undefined;
}
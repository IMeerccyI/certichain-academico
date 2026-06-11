import type { ActivePersona, Certificate, Issuer, Role, Student } from "@/types/domain";
import { walletsMatch } from "@/lib/roles";

type WalletPermissionOptions = {
  persona?: ActivePersona;
  walletAddress?: string;
  requireWallet?: boolean;
};

function walletAuthorized(
  expectedWallet: string | undefined,
  walletAddress: string | undefined,
  requireWallet: boolean,
): boolean {
  if (!requireWallet) {
    return true;
  }

  if (!walletAddress) {
    return false;
  }

  return walletsMatch(walletAddress, expectedWallet);
}

export function canIssueCertificate(
  issuer: Issuer | undefined,
  role: Role = "authorized_issuer",
  options?: WalletPermissionOptions,
) {
  const roleAllowed = Boolean(
    issuer?.active && (role === "academic_admin" || role === "authorized_issuer"),
  );

  if (!roleAllowed || !issuer) {
    return false;
  }

  if (role === "authorized_issuer") {
    if (options?.persona?.issuerId && issuer.id !== options.persona.issuerId) {
      return false;
    }

    return walletAuthorized(
      issuer.walletAddress,
      options?.walletAddress,
      options?.requireWallet ?? false,
    );
  }

  if (role === "academic_admin") {
    return walletAuthorized(
      options?.walletAddress,
      options?.walletAddress,
      options?.requireWallet ?? false,
    );
  }

  return false;
}

export function canRevokeCertificate(
  issuer: Issuer | undefined,
  certificate: Certificate,
  role: Role = "authorized_issuer",
  options?: WalletPermissionOptions,
) {
  const issuerMatches =
    role === "academic_admin" || Boolean(issuer?.active && issuer.id === certificate.issuerId);
  const roleAllowed = role === "academic_admin" || role === "authorized_issuer";

  if (!issuerMatches || !roleAllowed || certificate.status === "revoked") {
    return false;
  }

  if (role === "authorized_issuer") {
    if (!issuer) {
      return false;
    }

    if (options?.persona?.issuerId && issuer.id !== options.persona.issuerId) {
      return false;
    }

    return walletAuthorized(
      issuer.walletAddress,
      options?.walletAddress,
      options?.requireWallet ?? false,
    );
  }

  if (role === "academic_admin") {
    return walletAuthorized(
      options?.walletAddress,
      options?.walletAddress,
      options?.requireWallet ?? false,
    );
  }

  return false;
}

export function canSignStudentReception(
  role: Role,
  certificate: Certificate,
  student: Student | undefined,
  options?: WalletPermissionOptions,
) {
  if (role !== "student" || !student) {
    return false;
  }

  if (certificate.studentId !== student.id) {
    return false;
  }

  if (certificate.receptionSignature) {
    return false;
  }

  return walletAuthorized(
    student.walletAddress,
    options?.walletAddress,
    options?.requireWallet ?? false,
  );
}

export function canVerifyCertificate(certificate?: Certificate) {
  return Boolean(certificate?.documentHash && certificate?.transactionHash);
}
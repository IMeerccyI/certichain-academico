import type { Certificate, Issuer, Role } from "@/types/domain";

export function canIssueCertificate(issuer: Issuer | undefined, role: Role = "authorized_issuer") {
  return Boolean(
    issuer?.active && (role === "academic_admin" || role === "authorized_issuer"),
  );
}

export function canRevokeCertificate(
  issuer: Issuer | undefined,
  certificate: Certificate,
  role: Role = "authorized_issuer",
) {
  return Boolean(
    issuer?.active &&
      issuer.id === certificate.issuerId &&
      certificate.status !== "revoked" &&
      (role === "academic_admin" || role === "authorized_issuer"),
  );
}

export function canVerifyCertificate(certificate?: Certificate) {
  return Boolean(certificate?.documentHash && certificate?.transactionHash);
}

import type { Certificate, UniversityIssuer } from "@/types/domain";

export function canIssueCertificate(issuer?: UniversityIssuer) {
  return Boolean(issuer?.active);
}

export function canRevokeCertificate(issuer: UniversityIssuer | undefined, certificate: Certificate) {
  return Boolean(issuer?.active && issuer.id === certificate.issuerId && certificate.status !== "revoked");
}

export function canVerifyCertificate(certificate?: Certificate) {
  return Boolean(certificate?.pdfHash && certificate?.txHash);
}

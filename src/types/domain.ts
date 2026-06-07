export type CertificateStatus = "valid" | "revoked" | "pending_reception";

export type CertificateKind =
  | "grade_report"
  | "academic_diploma"
  | "professional_title"
  | "study_record";

export type UniversityIssuer = {
  id: string;
  name: string;
  city: string;
  walletAddress: string;
  active: boolean;
  authorityLevel: "rectorate" | "faculty" | "registry";
};

export type Student = {
  id: string;
  fullName: string;
  documentId: string;
  career: string;
  universityId: string;
  walletAddress: string;
};

export type Certificate = {
  id: string;
  kind: CertificateKind;
  title: string;
  studentId: string;
  issuerId: string;
  status: CertificateStatus;
  issuedAt: string;
  receivedAt?: string;
  revokedAt?: string;
  revocationReason?: string;
  pdfHash: string;
  txHash: string;
  blockNumber: number;
  signature: string;
};

export type LedgerEventType =
  | "issuer_authorized"
  | "certificate_issued"
  | "student_received"
  | "certificate_verified"
  | "certificate_revoked";

export type LedgerEvent = {
  id: string;
  type: LedgerEventType;
  actor: string;
  certificateId?: string;
  txHash: string;
  blockNumber: number;
  createdAt: string;
  detail: string;
};

export type ChainNode = {
  id: string;
  label: string;
  location: string;
  status: "synced" | "lagging" | "offline";
  latencyMs: number;
};

export type AnalyticsPoint = {
  label: string;
  issued: number;
  verified: number;
  revoked: number;
};

export type ToastIntent = "success" | "warning" | "error" | "info";

export type AppToast = {
  id: string;
  title: string;
  description?: string;
  intent: ToastIntent;
};

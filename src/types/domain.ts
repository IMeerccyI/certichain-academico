import type { RouteId } from "@/app/routes";

export type Role =
  | "academic_admin"
  | "authorized_issuer"
  | "student"
  | "public_verifier"
  | "auditor";

export type NetworkType = "ganache" | "hardhat" | "sepolia";

export type WalletState = {
  connected: boolean;
  address: string;
  balanceEth: number;
  network: NetworkType;
};

export type Student = {
  id: string;
  fullName: string;
  identityDocument: string;
  documentId: string;
  career: string;
  faculty: string;
  university: string;
  universityId: string;
  email: string;
  walletAddress: string;
  enrollmentCode: string;
};

export type IssuerRole =
  | "Rector"
  | "Secretario Academico"
  | "Director de Carrera"
  | "Responsable de Registro"
  | "Auditor Academico";

export type Issuer = {
  id: string;
  name: string;
  role: IssuerRole;
  city: string;
  institution: string;
  walletAddress: string;
  active: boolean;
  authorizedAt: string;
  deactivatedAt?: string;
  authorityLevel: "rectorate" | "faculty" | "registry" | "audit";
};

export type VerifierEntityType =
  | "private_company"
  | "university"
  | "government"
  | "professional_board"
  | "human_resources"
  | "scholarship_unit";

export type VerifierEntity = {
  id: string;
  name: string;
  type: VerifierEntityType;
  contact: string;
  city: string;
  walletAddress: string;
};

export type CertificateStatus =
  | "valid"
  | "revoked"
  | "manipulated"
  | "pending_reception"
  | "not_found";

export type CertificateType =
  | "grade_certificate"
  | "academic_diploma"
  | "professional_title"
  | "study_record"
  | "graduation_certificate";

export type Certificate = {
  id: string;
  code: string;
  type: CertificateType;
  studentId: string;
  studentName: string;
  identityDocument: string;
  career: string;
  faculty: string;
  university: string;
  issueDate: string;
  issuerId: string;
  issuerName: string;
  issuerRole: IssuerRole;
  documentHash: string;
  blockchainHash: string;
  transactionHash: string;
  blockNumber: number;
  status: Exclude<CertificateStatus, "not_found">;
  pdfName: string;
  observations: string;
  receptionSignature?: string;
  issuerSignature: string;
  revokedAt?: string;
  revocationReason?: string;
  verificationUrl: string;
  nftTokenId?: string;
  createdAt: string;
  updatedAt: string;
  title: string;
  kind: CertificateType;
  issuedAt: string;
  pdfHash: string;
  txHash: string;
  signature: string;
};

export type BlockchainEventType =
  | "issuer_authorized"
  | "issuer_deactivated"
  | "certificate_issued"
  | "student_received"
  | "certificate_verified"
  | "certificate_revoked"
  | "verification_failed"
  | "nft_minted";

export type BlockchainEvent = {
  id: string;
  type: BlockchainEventType;
  actor: string;
  actorRole: Role;
  certificateId?: string;
  transactionHash: string;
  txHash: string;
  blockNumber: number;
  createdAt: string;
  detail: string;
  nodeId: string;
};

export type WalletTransactionStatus = "pending" | "confirmed" | "failed";

export type WalletTransaction = {
  id: string;
  from: string;
  to: string;
  hash: string;
  method: string;
  network: NetworkType;
  status: WalletTransactionStatus;
  gasUsed: number;
  createdAt: string;
};

export type VerificationSource = "code" | "hash" | "pdf_mock";

export type VerificationAttempt = {
  id: string;
  verifierEntityId: string;
  certificateCode?: string;
  documentHash?: string;
  source: VerificationSource;
  resultStatus: CertificateStatus;
  matchedCertificateId?: string;
  attemptedAt: string;
  ipLabel: string;
  notes: string;
};

export type RevocationRecord = {
  id: string;
  certificateId: string;
  issuerId: string;
  reason: string;
  revokedAt: string;
  transactionHash: string;
  blockNumber: number;
};

export type NftAcademicToken = {
  id: string;
  tokenId: string;
  certificateId: string;
  ownerStudentId: string;
  contractAddress: string;
  metadataUri: string;
  mintedAt: string;
  transactionHash: string;
};

export type AnalyticsSnapshot = {
  label: string;
  issued: number;
  verified: number;
  revoked: number;
  manipulated: number;
  gasCostUsd: number;
};

export type DistributedNode = {
  id: string;
  label: string;
  location: string;
  network: NetworkType;
  status: "synced" | "lagging" | "offline";
  latencyMs: number;
  latestBlock: number;
};

export type AppSettings = {
  demoMode: boolean;
  reducedMotion: boolean;
  autoPersist: boolean;
  defaultNetwork: NetworkType;
  verifierPublicAccess: boolean;
};

export type ToastIntent = "success" | "warning" | "error" | "info";

export type AppToast = {
  id: string;
  title: string;
  description?: string;
  intent: ToastIntent;
};

export type CertificateIssueInput = {
  career: string;
  certificateType: CertificateType;
  faculty: string;
  identityDocument: string;
  issuerId: string;
  observations: string;
  pdfName: string;
  studentId: string;
  university: string;
};

export type VerificationResult = {
  certificate?: Certificate;
  message: string;
  status: CertificateStatus;
};

export type ExportedAppState = {
  activeRole: Role;
  activeRoute: RouteId;
  blockchainEvents: BlockchainEvent[];
  certificates: Certificate[];
  issuers: Issuer[];
  selectedCertificateId?: string;
  selectedNetwork: NetworkType;
  settings: AppSettings;
  students: Student[];
  verificationAttempts: VerificationAttempt[];
  verifierEntities: VerifierEntity[];
};

export type UniversityIssuer = Issuer;
export type LedgerEvent = BlockchainEvent;
export type ChainNode = DistributedNode;
export type AnalyticsPoint = AnalyticsSnapshot;

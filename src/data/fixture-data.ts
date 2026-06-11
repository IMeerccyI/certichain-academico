import {
  certificates,
  issuers,
  manipulatedDocumentCases,
  nftAcademicTokens,
  revocationRecords,
  students,
  verificationAttempts,
  verifierEntities,
} from "@/data/certificate-fixtures";
import { chainNodes, monthlyActivity } from "@/data/analytics-fixtures";
import type { AppSettings, BlockchainEvent } from "@/types/domain";

export {
  certificates,
  chainNodes,
  issuers,
  manipulatedDocumentCases,
  monthlyActivity,
  nftAcademicTokens,
  revocationRecords,
  students,
  verificationAttempts,
  verifierEntities,
};

const tx = (seed: number) => `0x${(seed + 12000).toString(16).padStart(64, "0")}`;

const baseEvents: BlockchainEvent[] = certificates.flatMap((certificate, index) => [
  {
    id: `event-issued-${certificate.code}`,
    type: "certificate_issued",
    actor: certificate.issuerId,
    actorRole: "authorized_issuer",
    certificateId: certificate.id,
    transactionHash: certificate.transactionHash,
    txHash: certificate.transactionHash,
    blockNumber: certificate.blockNumber,
    createdAt: certificate.createdAt,
    detail: `Hash SHA-256 registrado para ${certificate.code}.`,
    nodeId: chainNodes[index % chainNodes.length].id,
  },
  {
    id: `event-verified-${certificate.code}`,
    type: certificate.status === "manipulated" ? "verification_failed" : "certificate_verified",
    actor: verifierEntities[index % verifierEntities.length].id,
    actorRole: "public_verifier",
    certificateId: certificate.id,
    transactionHash: tx(2000 + index),
    txHash: tx(2000 + index),
    blockNumber: certificate.blockNumber + 2,
    createdAt: verificationAttempts[index % verificationAttempts.length].attemptedAt,
    detail:
      certificate.status === "manipulated"
        ? `Documento manipulado detectado para ${certificate.code}.`
        : `Consulta publica confirmo estado de ${certificate.code}.`,
    nodeId: chainNodes[(index + 1) % chainNodes.length].id,
  },
]);

const initialIssuerEvent: BlockchainEvent = {
  id: "event-issuer-authorized-001",
  type: "issuer_authorized",
  actor: "academic-admin",
  actorRole: "academic_admin",
  transactionHash: tx(1001),
  txHash: tx(1001),
  blockNumber: 7433800,
  createdAt: "2026-01-10T08:00:00.000Z",
  detail: "Rectorado UMSA autorizado como emisor academico.",
  nodeId: "node-lpz",
};

export const blockchainEvents: BlockchainEvent[] = [
  initialIssuerEvent,
  ...baseEvents,
].slice(0, 25);

export const ledgerEvents = blockchainEvents;

export const defaultSettings: AppSettings = {
  accessibleMode: false,
  autoPersist: true,
  defaultNetwork: "sepolia",
  demoMode: true,
  intenseEffects: true,
  presentationMode: false,
  reducedMotion: false,
  technicalMode: false,
  verifierPublicAccess: true,
};

export const dashboardMetrics = {
  totalAnchored: certificates.length,
  valid: certificates.filter((certificate) => certificate.status === "valid").length,
  pendingReception: certificates.filter(
    (certificate) => certificate.status === "pending_reception",
  ).length,
  revoked: certificates.filter((certificate) => certificate.status === "revoked").length,
  manipulated: certificates.filter((certificate) => certificate.status === "manipulated").length,
  authorizedIssuers: issuers.filter((issuer) => issuer.active).length,
  verifierQueries: verificationAttempts.length,
  consensusRate: Math.round(
    (chainNodes.filter((node) => node.status === "synced").length / chainNodes.length) * 100,
  ),
  averageLatencyMs: Math.round(
    chainNodes.reduce((sum, node) => sum + node.latencyMs, 0) / chainNodes.length,
  ),
};

export const moduleSnapshots = {
  web3: {
    title: "Conexion Web3",
    description: "Estado operativo de wallet, contrato academico y red Ethereum.",
    primaryMetric: "Sepolia",
    secondaryMetric: "Contrato segun deployment",
  },
  issue: {
    title: "Emitir certificado",
    description: "Flujo de PDF, SHA-256, firma digital y anclaje en contrato inteligente.",
    primaryMetric: "3 pasos activos",
    secondaryMetric: "Requiere rol emisor",
  },
  certificates: {
    title: "Certificados",
    description: "Cola de emision con hashes SHA-256 y firma institucional.",
    primaryMetric: `${dashboardMetrics.totalAnchored} registros`,
    secondaryMetric: `${dashboardMetrics.pendingReception} pendiente de recepcion`,
  },
  verification: {
    title: "Verificacion publica",
    description: "Consulta de autenticidad por hash, transaccion y estado.",
    primaryMetric: `${dashboardMetrics.verifierQueries.toLocaleString("es-BO")} consultas`,
    secondaryMetric: "Disponibilidad independiente de la universidad",
  },
  revocation: {
    title: "Revocacion",
    description: "Correcciones administrativas con historial inmutable.",
    primaryMetric: `${dashboardMetrics.revoked} revocados`,
    secondaryMetric: "Requiere emisor autorizado",
  },
  issuers: {
    title: "Emisores",
    description: "Universidades y unidades academicas autorizadas.",
    primaryMetric: `${dashboardMetrics.authorizedIssuers} activos`,
    secondaryMetric: "Control por wallet institucional",
  },
  students: {
    title: "Estudiantes",
    description: "Recepcion firmada y asociacion academica verificable.",
    primaryMetric: `${students.length} perfiles`,
    secondaryMetric: "Wallet de estudiante vinculada",
  },
  ledger: {
    title: "Ledger",
    description: "Eventos replicados entre nodos academicos.",
    primaryMetric: `${blockchainEvents.length} eventos`,
    secondaryMetric: `Bloque ${Math.max(...certificates.map((item) => item.blockNumber))}`,
  },
  audit: {
    title: "Auditoria",
    description: "Trazabilidad de acciones y evidencia criptografica.",
    primaryMetric: "100% historico",
    secondaryMetric: "Sin borrado de eventos",
  },
  analytics: {
    title: "Analitica",
    description: "Lectura operativa de emision, validacion y riesgo.",
    primaryMetric: `${monthlyActivity.at(-1)?.verified ?? 0} verificaciones`,
    secondaryMetric: "Serie mensual academica",
  },
  nft: {
    title: "NFT academico",
    description: "Extension ERC-721 con metadata del certificado.",
    primaryMetric: `${nftAcademicTokens.length} token`,
    secondaryMetric: "Metadata asociada al hash",
  },
  settings: {
    title: "Configuracion",
    description: "Preferencias locales para red, MetaMask y accesibilidad.",
    primaryMetric: "Datos precargados",
    secondaryMetric: "Contrato configurable",
  },
} as const;

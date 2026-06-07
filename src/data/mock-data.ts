import {
  certificates,
  issuers,
  students,
} from "@/data/certificate-fixtures";
import { chainNodes, monthlyActivity } from "@/data/analytics-fixtures";
import type { LedgerEvent } from "@/types/domain";

export { certificates, chainNodes, issuers, monthlyActivity, students };

export const ledgerEvents: LedgerEvent[] = [
  {
    id: "event-01",
    type: "certificate_issued",
    actor: "issuer-umsa",
    certificateId: "CERT-2026-0004",
    txHash: "0x4c5a7f9e1d8445c83dfe0ae24f40ac1f37558c9bb4c5f0ed9cc9205f1e4477a0",
    blockNumber: 7433928,
    createdAt: "2026-05-29T10:42:00.000Z",
    detail: "Hash SHA-256 registrado y firmado por registro academico.",
  },
  {
    id: "event-02",
    type: "student_received",
    actor: "student-101",
    certificateId: "CERT-2026-0004",
    txHash: "0x84db1f86f7132fd943eb7d6391d037a9345816f288190d8af1cc7cab41819da4",
    blockNumber: 7433979,
    createdAt: "2026-05-29T13:10:00.000Z",
    detail: "Recepcion firmada desde wallet del estudiante.",
  },
  {
    id: "event-03",
    type: "certificate_verified",
    actor: "empresa-verificadora",
    certificateId: "CERT-2026-0001",
    txHash: "0x712adac68f46a3d0508cc6c135c87111f97c4d9833bc1917d20e74a1f014cd2f",
    blockNumber: 7434102,
    createdAt: "2026-06-02T19:04:00.000Z",
    detail: "Consulta publica confirmo hash, emisor y estado vigente.",
  },
  {
    id: "event-04",
    type: "certificate_revoked",
    actor: "issuer-uagrm",
    certificateId: "CERT-2026-0003",
    txHash: "0x12506ed59833105e0eac343cf8be985d87fd985e5e3fb610fcb17b7e1a5cc3a1",
    blockNumber: 7419512,
    createdAt: "2026-04-08T20:15:00.000Z",
    detail: "Revocacion administrativa registrada sin borrar historial.",
  },
];

export const dashboardMetrics = {
  totalAnchored: certificates.length,
  valid: certificates.filter((certificate) => certificate.status === "valid").length,
  pendingReception: certificates.filter(
    (certificate) => certificate.status === "pending_reception",
  ).length,
  revoked: certificates.filter((certificate) => certificate.status === "revoked").length,
  authorizedIssuers: issuers.filter((issuer) => issuer.active).length,
  verifierQueries: 2570,
  consensusRate: 99.7,
  averageLatencyMs: Math.round(
    chainNodes.reduce((sum, node) => sum + node.latencyMs, 0) / chainNodes.length,
  ),
};

export const moduleSnapshots = {
  web3: {
    title: "Conexion Web3",
    description: "Estado operativo de wallet, contrato academico y red Ethereum simulada.",
    primaryMetric: "Sepolia mock",
    secondaryMetric: "Contrato listo para demo",
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
    primaryMetric: `${dashboardMetrics.revoked} revocado`,
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
    description: "Eventos replicados entre nodos academicos simulados.",
    primaryMetric: `${ledgerEvents.length} eventos`,
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
    secondaryMetric: "Serie mensual mock",
  },
  nft: {
    title: "NFT academico",
    description: "Extension ERC-721 con metadata del certificado.",
    primaryMetric: "ERC-721 listo",
    secondaryMetric: "Metadata asociada al hash",
  },
  settings: {
    title: "Configuracion",
    description: "Preferencias locales para demo, red y accesibilidad.",
    primaryMetric: "Modo demo",
    secondaryMetric: "Sin conexion real a Ethereum",
  },
} as const;

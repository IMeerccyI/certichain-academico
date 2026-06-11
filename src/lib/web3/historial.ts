import type { BlockchainEventType, Certificate, Role } from "@/types/domain";
import type { ChainEventoHistorial } from "@/lib/web3/service";

export type CertificateHistorialEntry = {
  id: string;
  codigo: string;
  certificateId?: string;
  tipoEvento: string;
  type: BlockchainEventType;
  actor: string;
  actorRole: Role;
  fecha: string;
  detalle: string;
  source: "onchain";
  method: string;
};

const tipoToEventType: Record<string, BlockchainEventType> = {
  EMISION: "certificate_issued",
  RECEPCION: "student_received",
  VERIFICACION: "certificate_verified",
  REVOCACION: "certificate_revoked",
};

const tipoToMethod: Record<string, string> = {
  EMISION: "emitirCertificado()",
  RECEPCION: "firmarRecepcion()",
  VERIFICACION: "verificarCertificado()",
  REVOCACION: "revocarCertificado()",
};

function inferActorRole(tipoEvento: string): Role {
  switch (tipoEvento) {
    case "EMISION":
    case "REVOCACION":
      return "authorized_issuer";
    case "RECEPCION":
      return "student";
    case "VERIFICACION":
      return "public_verifier";
    default:
      return "auditor";
  }
}

export function mapChainHistorial(
  codigo: string,
  eventos: ChainEventoHistorial[],
  certificate?: Certificate,
): CertificateHistorialEntry[] {
  return eventos.map((evento, index) => ({
    id: `onchain-${codigo}-${index}-${evento.fecha.toString()}`,
    codigo,
    certificateId: certificate?.id,
    tipoEvento: evento.tipoEvento,
    type: tipoToEventType[evento.tipoEvento] ?? "certificate_verified",
    actor: evento.actor,
    actorRole: inferActorRole(evento.tipoEvento),
    fecha: new Date(Number(evento.fecha) * 1000).toISOString(),
    detalle: evento.detalle,
    source: "onchain",
    method: tipoToMethod[evento.tipoEvento] ?? "consultarHistorial()",
  }));
}

export function flattenCertificateHistorial(
  historialByCode: Record<string, CertificateHistorialEntry[]>,
): CertificateHistorialEntry[] {
  return Object.values(historialByCode)
    .flat()
    .sort((left, right) => new Date(right.fecha).getTime() - new Date(left.fecha).getTime());
}
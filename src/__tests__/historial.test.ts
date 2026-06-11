import { describe, expect, it } from "vitest";
import { flattenCertificateHistorial, mapChainHistorial } from "@/lib/web3/historial";

describe("on-chain historial mapping", () => {
  it("maps contract events to ledger-friendly entries", () => {
    const entries = mapChainHistorial("CERT-001", [
      {
        tipoEvento: "EMISION",
        actor: "0xabc123",
        fecha: 1_700_000_000n,
        detalle: "Certificado emitido",
      },
      {
        tipoEvento: "VERIFICACION",
        actor: "0xdef456",
        fecha: 1_700_000_100n,
        detalle: "Verificacion publica",
      },
    ]);

    expect(entries).toHaveLength(2);
    expect(entries[0]).toMatchObject({
      codigo: "CERT-001",
      tipoEvento: "EMISION",
      type: "certificate_issued",
      actorRole: "authorized_issuer",
      source: "onchain",
      method: "emitirCertificado()",
    });
    expect(entries[1]).toMatchObject({
      type: "certificate_verified",
      actorRole: "public_verifier",
      method: "verificarCertificado()",
    });
  });

  it("flattens and sorts historial by fecha descending", () => {
    const flattened = flattenCertificateHistorial({
      "CERT-A": [
        {
          id: "a-1",
          codigo: "CERT-A",
          tipoEvento: "EMISION",
          type: "certificate_issued",
          actor: "0x1",
          actorRole: "authorized_issuer",
          fecha: "2024-01-01T00:00:00.000Z",
          detalle: "older",
          source: "onchain",
          method: "emitirCertificado()",
        },
      ],
      "CERT-B": [
        {
          id: "b-1",
          codigo: "CERT-B",
          tipoEvento: "REVOCACION",
          type: "certificate_revoked",
          actor: "0x2",
          actorRole: "authorized_issuer",
          fecha: "2025-06-01T00:00:00.000Z",
          detalle: "newer",
          source: "onchain",
          method: "revocarCertificado()",
        },
      ],
    });

    expect(flattened.map((entry) => entry.codigo)).toEqual(["CERT-B", "CERT-A"]);
  });
});
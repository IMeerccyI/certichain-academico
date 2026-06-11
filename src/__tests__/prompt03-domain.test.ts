import { describe, expect, it, beforeEach } from "vitest";
import {
  blockchainEvents,
  certificates,
  issuers,
  monthlyActivity,
  nftAcademicTokens,
  revocationRecords,
  students,
  manipulatedDocumentCases,
  verificationAttempts,
  verifierEntities,
} from "@/data/fixture-data";
import { useAppStore } from "@/store/app-store";

describe("Prompt 03 domain data and store", () => {
  beforeEach(() => {
    window.localStorage.clear();
    useAppStore.getState().resetDemoData();
  });

  it("loads the required local fixture dataset", () => {
    expect(certificates).toHaveLength(12);
    expect(students).toHaveLength(5);
    expect(issuers).toHaveLength(5);
    expect(verifierEntities).toHaveLength(6);
    expect(blockchainEvents).toHaveLength(25);
    expect(verificationAttempts).toHaveLength(8);
    expect(revocationRecords).toHaveLength(4);
    expect(manipulatedDocumentCases).toHaveLength(3);
    expect(nftAcademicTokens).toHaveLength(1);
    expect(monthlyActivity.length).toBeGreaterThanOrEqual(6);
  });

  it("lets fixture certificates be verified but blocks writes without a connected contract", async () => {
    const store = useAppStore.getState();
    store.setActiveRole("authorized_issuer");
    const initialEvents = useAppStore.getState().blockchainEvents.length;

    const issued = await store.issueCertificate({
      career: "Ingenieria de Sistemas",
      certificateType: "grade_certificate",
      faculty: "Facultad de Tecnologia",
      identityDocument: "LP-7482910",
      issuerId: "issuer-rector-umsa",
      observations: "Registro emitido desde prueba de dominio.",
      pdfName: "certificado-test.pdf",
      studentId: "student-juan",
      university: "Universidad Mayor de San Andres",
    });

    expect(issued).toBeNull();
    expect(useAppStore.getState().certificates).toHaveLength(12);

    const verified = useAppStore.getState().verifyCertificateByCode("CERT-2026-0001");
    expect(verified.status).toBe("valid");

    const received = await useAppStore.getState().signStudentReception("certificate-002");
    expect(received).toBeUndefined();
    expect(
      useAppStore.getState().certificates.find((certificate) => certificate.id === "certificate-002")?.status,
    ).toBe("pending_reception");

    const revoked = await useAppStore
      .getState()
      .revokeCertificate("certificate-001", "Correccion administrativa de prueba");
    expect(revoked).toBeUndefined();
    expect(useAppStore.getState().revocationRecords.length).toBe(4);
    expect(useAppStore.getState().blockchainEvents).toHaveLength(initialEvents);
    expect(useAppStore.getState().toasts.some((toast) => /contrato no conectado/i.test(toast.title))).toBe(true);
  });

  it("blocks issuer actions for student role and safely handles invalid imports", async () => {
    const store = useAppStore.getState();
    store.setActiveRole("student");

    const denied = await useAppStore.getState().issueCertificate({
      career: "Derecho",
      certificateType: "study_record",
      faculty: "Facultad de Ciencias Juridicas",
      identityDocument: "CB-6259102",
      issuerId: "issuer-secretary-umss",
      observations: "Intento sin permisos.",
      pdfName: "sin-permiso.pdf",
      studentId: "student-valeria",
      university: "Universidad Mayor de San Simon",
    });

    expect(denied).toBeNull();
    expect(useAppStore.getState().certificates).toHaveLength(12);
    expect(() => useAppStore.getState().importState("{ invalid json")).not.toThrow();
    expect(useAppStore.getState().importState("{ invalid json")).toBe(false);

    useAppStore.getState().resetDemoData();
    expect(useAppStore.getState().certificates).toHaveLength(12);
  });
});

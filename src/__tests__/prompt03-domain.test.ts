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
} from "@/data/mock-data";
import { useAppStore } from "@/store/app-store";

describe("Prompt 03 domain data and store", () => {
  beforeEach(() => {
    window.localStorage.clear();
    useAppStore.getState().resetDemoData();
  });

  it("loads the required local mock dataset", () => {
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

  it("lets an authorized role issue, verify, receive and revoke certificates", async () => {
    const store = useAppStore.getState();
    store.setActiveRole("authorized_issuer");

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

    expect(issued).not.toBeNull();
    expect(useAppStore.getState().certificates).toHaveLength(13);

    const verified = useAppStore.getState().verifyCertificateByCode(issued?.code ?? "");
    expect(verified.status).toBe("pending_reception");

    const received = useAppStore.getState().signStudentReception(issued?.id ?? "");
    expect(received?.receptionSignature).toContain("student-reception");
    expect(received?.status).toBe("valid");

    const revoked = useAppStore
      .getState()
      .revokeCertificate(issued?.id ?? "", "Correccion administrativa de prueba");
    expect(revoked?.status).toBe("revoked");
    expect(useAppStore.getState().revocationRecords.length).toBe(5);
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

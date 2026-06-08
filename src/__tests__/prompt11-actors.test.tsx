import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import App from "@/app/App";
import { useAppStore } from "@/store/app-store";

describe("Prompt 11 actor management", () => {
  beforeEach(() => {
    window.localStorage.clear();
    useAppStore.getState().resetDemoData();
    useAppStore.getState().setActiveRole("academic_admin");
  });

  it("renders issuer authority table with permissions, activity and verifier entities", async () => {
    const user = userEvent.setup();
    useAppStore.getState().setRoute("issuers");
    render(<App />);

    const page = screen.getByTestId("issuers-workspace");
    expect(within(page).getByRole("heading", { name: /gestion de actores institucionales/i })).toBeInTheDocument();
    expect(within(page).getByTestId("issuers-table")).toHaveTextContent("Rectorado UMSA");
    expect(within(page).getByTestId("issuers-table")).toHaveTextContent("Emitir");
    expect(within(page).getByTestId("issuers-table")).toHaveTextContent("Revocar");
    expect(within(page).getByTestId("issuers-table")).toHaveTextContent("Ultima actividad");

    await user.click(within(page).getByRole("tab", { name: /entidades verificadoras/i }));

    const verifierPanel = within(page).getByTestId("verifier-entities-panel");
    expect(verifierPanel).toHaveTextContent("Empresa privada");
    expect(verifierPanel).toHaveTextContent("Verificaciones realizadas");
    expect(verifierPanel).toHaveTextContent("Certificados consultados");
    expect(verifierPanel).toHaveTextContent("Resultados validos");
    expect(verifierPanel).toHaveTextContent("Historial de verificaciones");
    expect(verifierPanel).toHaveTextContent("Hash, emisor y estado confirmados.");
  });

  it("deactivates and reactivates an issuer, blocking issue and revoke with that issuer", async () => {
    const user = userEvent.setup();
    useAppStore.getState().setRoute("issuers");
    render(<App />);

    const page = screen.getByTestId("issuers-workspace");
    const issuerRow = within(page).getByTestId("issuer-row-issuer-rector-umsa");

    await user.click(within(issuerRow).getByRole("button", { name: /desactivar emisor/i }));

    await waitFor(() => {
      expect(useAppStore.getState().issuers.find((issuer) => issuer.id === "issuer-rector-umsa")?.active).toBe(false);
    });
    expect(useAppStore.getState().blockchainEvents[0]).toMatchObject({
      actor: "issuer-rector-umsa",
      type: "issuer_deactivated",
    });

    const blockedIssue = await useAppStore.getState().issueCertificate({
      career: "Ingenieria de Sistemas",
      certificateType: "grade_certificate",
      faculty: "Facultad de Tecnologia",
      identityDocument: "LP-7482910",
      issuerId: "issuer-rector-umsa",
      observations: "Debe bloquearse por emisor inactivo.",
      pdfName: "bloqueado.pdf",
      studentId: "student-juan",
      university: "Universidad Mayor de San Andres",
    });
    expect(blockedIssue).toBeNull();

    const blockedRevoke = useAppStore
      .getState()
      .revokeCertificate("certificate-001", "Debe bloquearse por emisor inactivo");
    expect(blockedRevoke).toBeUndefined();
    expect(useAppStore.getState().certificates.find((item) => item.id === "certificate-001")?.status).toBe("valid");

    await user.click(within(issuerRow).getByRole("button", { name: /activar emisor/i }));

    await waitFor(() => {
      expect(useAppStore.getState().issuers.find((issuer) => issuer.id === "issuer-rector-umsa")?.active).toBe(true);
    });
    expect(useAppStore.getState().blockchainEvents[0]).toMatchObject({
      actor: "issuer-rector-umsa",
      type: "issuer_authorized",
    });
  });

  it("renders students with academic history and signs pending reception", async () => {
    const user = userEvent.setup();
    useAppStore.getState().setActiveRole("student");
    useAppStore.getState().setRoute("students");
    render(<App />);

    const page = screen.getByTestId("students-workspace");
    expect(within(page).getByRole("heading", { name: /gestion de estudiantes/i })).toBeInTheDocument();
    expect(within(page).getByTestId("students-table")).toHaveTextContent("Valeria Torres");
    expect(within(page).getByTestId("students-table")).toHaveTextContent("Firma de recepcion");
    expect(within(page).getByTestId("students-table")).toHaveTextContent("Estado academico");

    await user.click(within(page).getByTestId("student-row-student-valeria"));

    const detail = within(page).getByTestId("student-detail-panel");
    expect(detail).toHaveTextContent("Historial academico");
    expect(detail).toHaveTextContent("CERT-2026-0002");
    expect(detail).toHaveTextContent("Pendiente de recepcion");

    await user.click(within(detail).getByRole("button", { name: /firmar recepcion/i }));

    await waitFor(() => {
      const signed = useAppStore.getState().certificates.find((item) => item.id === "certificate-002");
      expect(signed?.status).toBe("valid");
      expect(signed?.receptionSignature).toContain("student-reception");
    });
    expect(useAppStore.getState().blockchainEvents[0]).toMatchObject({
      certificateId: "certificate-002",
      type: "student_received",
    });
    expect(detail).toHaveTextContent("Recepcion firmada");
  });
});

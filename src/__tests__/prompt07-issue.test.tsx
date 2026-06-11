import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import App from "@/app/App";
import { useAppStore } from "@/store/app-store";

describe("Certificate issuance module", () => {
  beforeEach(() => {
    Reflect.deleteProperty(window, "ethereum");
    window.localStorage.clear();
    useAppStore.getState().resetDemoData();
    useAppStore.getState().setRoute("issue");
  });

  it("renders the full academic certificate issuing workspace", () => {
    render(<App />);
    const page = screen.getByTestId("issue-flow");

    expect(screen.getByRole("heading", { name: /emitir certificado/i })).toBeInTheDocument();

    for (const label of [
      /codigo del certificado/i,
      /tipo de documento/i,
      /nombre del estudiante/i,
      /documento de identidad/i,
      /carrera/i,
      /facultad/i,
      /universidad/i,
      /fecha de emision/i,
      /emisor autorizado/i,
      /cargo del emisor/i,
      /archivo pdf/i,
      /observaciones/i,
    ]) {
      expect(within(page).getAllByText(label).length).toBeGreaterThan(0);
    }

    expect(within(page).getByText(/panel lateral de previsualizacion/i)).toBeInTheDocument();
    expect(within(page).getByText(/hash generado/i)).toBeInTheDocument();
    expect(within(page).getByText(/tarjeta de transaccion/i)).toBeInTheDocument();
    expect(within(page).getByText(/estado del contrato/i)).toBeInTheDocument();
    expect(within(page).getByText(/barra de progreso/i)).toBeInTheDocument();

    for (const step of [
      /validar datos/i,
      /preparar pdf/i,
      /calcular hash sha-256/i,
      /firmar digitalmente la emision/i,
      /enviar transaccion ethereum/i,
      /esperar confirmacion de bloque/i,
      /registrar certificado/i,
      /agregar evento al ledger/i,
      /mostrar resultado/i,
    ]) {
      expect(within(page).getByText(step)).toBeInTheDocument();
    }
  });

  it("blocks issuing when wallet, role or required data are invalid", async () => {
    const user = userEvent.setup();
    const initialCount = useAppStore.getState().certificates.length;

    render(<App />);
    const page = screen.getByTestId("issue-flow");

    await user.click(within(page).getByRole("button", { name: /^emitir certificado$/i }));

    expect(screen.getByText(/conecta metamask con el contrato academico/i)).toBeInTheDocument();
    expect(screen.getByText(/carga un archivo pdf real/i)).toBeInTheDocument();
    expect(screen.getByText(/completa los campos obligatorios/i)).toBeInTheDocument();
    expect(useAppStore.getState().certificates).toHaveLength(initialCount);

    useAppStore.getState().setActiveRole("student");

    const blockedIssue = await useAppStore.getState().issueCertificate({
      career: "Ingenieria de Sistemas",
      certificateType: "grade_certificate",
      faculty: "Facultad de Tecnologia",
      identityDocument: "LP-7482910",
      issuerId: "issuer-rector-umsa",
      observations: "Debe bloquearse por rol estudiante.",
      pdfName: "bloqueado.pdf",
      studentId: "student-juan",
      university: "Universidad Mayor de San Andres",
    });

    expect(blockedIssue).toBeNull();
    expect(
      useAppStore.getState().toasts.some((toast) => /emision bloqueada/i.test(toast.title)),
    ).toBe(true);
    expect(useAppStore.getState().certificates).toHaveLength(initialCount);
  });

  it("does not create a fake transaction when the contract is not connected", async () => {
    const user = userEvent.setup();
    const initialCertificates = useAppStore.getState().certificates.length;
    const initialEvents = useAppStore.getState().blockchainEvents.length;
    useAppStore.getState().setActiveRole("authorized_issuer");

    render(<App />);
    const page = screen.getByTestId("issue-flow");

    await user.click(within(page).getByRole("button", { name: /seleccionar estudiante juan perez/i }));
    await user.click(within(page).getByRole("button", { name: /usar emisor rectorado umsa/i }));
    await user.upload(
      within(page).getByLabelText(/archivo pdf/i),
      new File(["certificado sin contrato"], "certificado.pdf", { type: "application/pdf" }),
    );
    await user.click(within(page).getByRole("button", { name: /^emitir certificado$/i }));

    expect(screen.getByText(/conecta metamask con el contrato academico/i)).toBeInTheDocument();
    expect(useAppStore.getState().certificates).toHaveLength(initialCertificates);
    expect(useAppStore.getState().blockchainEvents).toHaveLength(initialEvents);
    expect(screen.queryByText(/certificado emitido/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/tx mock/i)).not.toBeInTheDocument();
  });
});

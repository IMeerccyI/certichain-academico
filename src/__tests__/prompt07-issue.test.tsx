import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import App from "@/app/App";
import { useAppStore } from "@/store/app-store";

describe("Prompt 07 certificate issuing flow", () => {
  beforeEach(() => {
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
      /archivo pdf simulado/i,
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
      /preparar pdf simulado/i,
      /calcular hash sha-256/i,
      /firmar digitalmente la emision/i,
      /enviar transaccion mock/i,
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

    expect(screen.getByText(/conecta una wallet institucional/i)).toBeInTheDocument();
    expect(screen.getByText(/completa los campos obligatorios/i)).toBeInTheDocument();
    expect(useAppStore.getState().certificates).toHaveLength(initialCount);

    useAppStore.getState().connectWalletMock();
    useAppStore.getState().setActiveRole("student");
    await user.click(within(page).getByRole("button", { name: /^emitir certificado$/i }));

    expect(screen.getByText(/el rol activo no puede emitir certificados/i)).toBeInTheDocument();
    expect(useAppStore.getState().certificates).toHaveLength(initialCount);
  });

  it("issues a certificate, appends ledger event and exposes post-issue actions", async () => {
    const user = userEvent.setup();
    const initialCertificates = useAppStore.getState().certificates.length;
    const initialEvents = useAppStore.getState().blockchainEvents.length;
    useAppStore.getState().connectWalletMock();
    useAppStore.getState().setActiveRole("authorized_issuer");

    render(<App />);
    const page = screen.getByTestId("issue-flow");

    await user.click(within(page).getByRole("button", { name: /seleccionar estudiante juan perez/i }));
    await user.click(within(page).getByRole("button", { name: /usar emisor rectorado umsa/i }));
    await user.click(within(page).getByRole("button", { name: /^emitir certificado$/i }));

    await waitFor(() => {
      expect(screen.getByText(/certificado emitido/i)).toBeInTheDocument();
    });

    expect(useAppStore.getState().certificates).toHaveLength(initialCertificates + 1);
    expect(useAppStore.getState().blockchainEvents.length).toBeGreaterThan(initialEvents);
    expect(screen.getByText(/hash generado/i)).toBeInTheDocument();
    expect(screen.getByText(/transaction hash/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /copiar hash/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /copiar transaction hash/i })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /ver detalle/i }));
    expect(useAppStore.getState().currentRouteId).toBe("certificates");
  });
});

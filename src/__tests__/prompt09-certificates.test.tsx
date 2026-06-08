import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import App from "@/app/App";
import { useAppStore } from "@/store/app-store";

describe("Prompt 09 certificates list and detail", () => {
  beforeEach(() => {
    window.localStorage.clear();
    useAppStore.getState().resetDemoData();
    useAppStore.getState().setRoute("certificates");

    Object.defineProperty(window.navigator, "clipboard", {
      configurable: true,
      value: {
        writeText: async () => undefined,
      },
    });
  });

  it("renders the emitted certificates workspace with advanced filters and table columns", () => {
    render(<App />);
    const page = screen.getByTestId("certificates-workspace");

    expect(within(page).getByRole("heading", { name: /certificados emitidos/i })).toBeInTheDocument();

    for (const label of [
      /buscar certificado/i,
      /estado/i,
      /tipo/i,
      /facultad/i,
      /carrera/i,
      /emisor/i,
      /fecha/i,
      /ordenar/i,
    ]) {
      expect(within(page).getByLabelText(label)).toBeInTheDocument();
    }

    const table = within(page).getByTestId("certificates-table");
    for (const column of [
      "Codigo",
      "Estudiante",
      "Carrera",
      "Tipo",
      "Fecha",
      "Estado",
      "Emisor",
      "Hash parcial",
      "Bloque",
      "Acciones",
    ]) {
      expect(within(table).getByText(column)).toBeInTheDocument();
    }

    expect(within(table).getByTestId("certificate-row-certificate-001")).toBeInTheDocument();
    expect(within(page).getAllByText(/pagina 1/i).length).toBeGreaterThan(0);
  });

  it("filters by search, status and issuer while keeping pagination controls coherent", async () => {
    const user = userEvent.setup();
    render(<App />);
    const page = screen.getByTestId("certificates-workspace");
    const table = within(page).getByTestId("certificates-table");

    await user.clear(within(page).getByLabelText(/buscar certificado/i));
    await user.type(within(page).getByLabelText(/buscar certificado/i), "Valeria Torres");

    await waitFor(() => {
      expect(within(table).getAllByText("Valeria Torres").length).toBeGreaterThan(0);
      expect(within(table).queryByText("Juan Perez")).not.toBeInTheDocument();
    });

    await user.selectOptions(within(page).getByLabelText(/estado/i), "revoked");

    await waitFor(() => {
      expect(within(table).getByText(/sin certificados para estos filtros/i)).toBeInTheDocument();
    });

    await user.clear(within(page).getByLabelText(/buscar certificado/i));
    await user.selectOptions(within(page).getByLabelText(/emisor/i), "issuer-director-uagrm");

    await waitFor(() => {
      expect(within(table).getAllByText("Direccion de Carrera UAGRM").length).toBeGreaterThan(0);
      expect(within(table).queryByText("Rectorado UMSA")).not.toBeInTheDocument();
    });
  });

  it("opens a coherent detail view and executes row/detail actions", async () => {
    const user = userEvent.setup();
    const certificate = useAppStore.getState().certificates[0];
    render(<App />);
    const page = screen.getByTestId("certificates-workspace");
    const row = within(page).getByTestId(`certificate-row-${certificate.id}`);

    await user.click(within(row).getByRole("button", { name: /ver detalle/i }));

    const detail = within(page).getByTestId("certificate-detail");
    expect(within(detail).getByRole("heading", { name: certificate.code })).toBeInTheDocument();
    expect(within(detail).getAllByText(certificate.studentName).length).toBeGreaterThan(0);
    expect(within(detail).getAllByText(certificate.issuerName).length).toBeGreaterThan(0);
    expect(within(detail).getByText(certificate.documentHash)).toBeInTheDocument();
    expect(within(detail).getByText(certificate.blockchainHash)).toBeInTheDocument();
    expect(within(detail).getByText(certificate.issuerSignature)).toBeInTheDocument();
    expect(within(detail).getByText(certificate.receptionSignature ?? /sin firma/i)).toBeInTheDocument();
    expect(within(detail).getByText(/vista tipo documento/i)).toBeInTheDocument();
    expect(within(detail).getByText(/qr simulado/i)).toBeInTheDocument();
    expect(within(detail).getByText(/panel tecnico de smart contract/i)).toBeInTheDocument();
    expect(within(detail).getByText(/emitirCertificado/i)).toBeInTheDocument();
    expect(within(detail).getByText(/gas simulado/i)).toBeInTheDocument();

    await user.click(within(row).getByRole("button", { name: /copiar hash/i }));
    expect(useAppStore.getState().toasts.some((toast) => /hash copiado/i.test(toast.title))).toBe(true);

    await user.click(within(row).getByRole("button", { name: /copiar enlace publico/i }));
    expect(
      useAppStore.getState().toasts.some((toast) => /enlace publico copiado/i.test(toast.title)),
    ).toBe(true);

    await user.click(within(row).getByRole("button", { name: /simular descarga pdf/i }));
    await user.click(within(row).getByRole("button", { name: /simular qr/i }));
    expect(useAppStore.getState().toasts.some((toast) => /pdf preparado/i.test(toast.title))).toBe(true);
    expect(useAppStore.getState().toasts.some((toast) => /qr simulado/i.test(toast.title))).toBe(true);

    await user.click(within(detail).getByRole("button", { name: /revocar/i }));
    expect(useAppStore.getState().currentRouteId).toBe("revocation");
  });
});

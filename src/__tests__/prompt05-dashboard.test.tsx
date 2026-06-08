import { render, screen, within } from "@testing-library/react";
import { act } from "react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import App from "@/app/App";
import {
  certificates,
  issuers,
  manipulatedDocumentCases,
  verificationAttempts,
} from "@/data/mock-data";
import { useAppStore } from "@/store/app-store";

describe("Prompt 05 functional dashboard", () => {
  beforeEach(() => {
    window.localStorage.clear();
    useAppStore.getState().resetDemoData();
  });

  it("renders the dashboard as a real operational first screen backed by mock data", () => {
    render(<App />);

    expect(
      screen.getByRole("heading", { name: /certichain academico/i }),
    ).toBeInTheDocument();
    expect(screen.getByText(/contrato academico/i)).toBeInTheDocument();
    expect(screen.getByText(/^wallet institucional$/i)).toBeInTheDocument();
    expect(screen.getAllByText(/^red ethereum$/i).length).toBeGreaterThan(0);

    const dashboard = screen.getByTestId("dashboard-general");
    expect(within(dashboard).getByTestId("metric-total-certificates")).toHaveTextContent(
      String(certificates.length),
    );
    expect(
      within(dashboard).getByTestId("metric-valid-certificates"),
    ).toHaveTextContent(
        String(certificates.filter((certificate) => certificate.status === "valid").length),
      );
    expect(
      within(dashboard).getByTestId("metric-revoked-certificates"),
    ).toHaveTextContent(
        String(certificates.filter((certificate) => certificate.status === "revoked").length),
      );
    expect(within(dashboard).getByTestId("metric-public-verifications")).toHaveTextContent(
      String(verificationAttempts.length),
    );
    expect(
      within(dashboard).getByTestId("metric-active-issuers"),
    ).toHaveTextContent(String(issuers.filter((issuer) => issuer.active).length));
    expect(within(dashboard).getByTestId("metric-risk-avoided")).toHaveTextContent(
      String(manipulatedDocumentCases.length),
    );

    expect(screen.getByText(/ultimas transacciones/i)).toBeInTheDocument();
    expect(screen.getByText(/ultimos certificados emitidos/i)).toBeInTheDocument();
    expect(screen.getAllByText(/riesgo documental evitado/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/certificados por estado/i)).toBeInTheDocument();
    expect(screen.getByText(/certificados por facultad/i)).toBeInTheDocument();
    expect(screen.getByText(/actividad mensual/i)).toBeInTheDocument();
    expect(screen.getByText(/verificaciones por entidad/i)).toBeInTheDocument();
  });

  it("shows the academic-blockchain timeline and navigates from quick actions", async () => {
    const user = userEvent.setup();
    render(<App />);

    for (const step of [
      /generar pdf/i,
      /calcular sha-256/i,
      /registrar hash en ethereum/i,
      /firmar emision/i,
      /firma de recepcion/i,
      /replicacion blockchain/i,
      /verificacion por empresa/i,
    ]) {
      expect(screen.getByText(step)).toBeInTheDocument();
    }

    await user.click(screen.getByRole("button", { name: /acceso rapido: emitir certificado/i }));
    expect(useAppStore.getState().currentRouteId).toBe("issue");

    act(() => {
      useAppStore.getState().setRoute("dashboard");
    });
    await user.click(screen.getByRole("button", { name: /acceso rapido: verificar certificado/i }));
    expect(useAppStore.getState().currentRouteId).toBe("verification");

    act(() => {
      useAppStore.getState().setRoute("dashboard");
    });
    await user.click(screen.getByRole("button", { name: /acceso rapido: ledger blockchain/i }));
    expect(useAppStore.getState().currentRouteId).toBe("ledger");

    act(() => {
      useAppStore.getState().setRoute("dashboard");
    });
    await user.click(screen.getByRole("button", { name: /acceso rapido: auditoria distribuida/i }));
    expect(useAppStore.getState().currentRouteId).toBe("audit");
  });

  it("keeps the dashboard available when a legacy browser state has no ledger events", () => {
    useAppStore.setState({ blockchainEvents: undefined as never });

    expect(() => render(<App />)).not.toThrow();
    expect(screen.getByText(/ultimas transacciones/i)).toBeInTheDocument();
  });
});

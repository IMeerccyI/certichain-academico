import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import App from "@/app/App";

describe("CertiChain application shell", () => {
  it("renders the operational academic blockchain dashboard", () => {
    render(<App />);

    expect(
      screen.getByRole("heading", { name: /certichain academico/i }),
    ).toBeInTheDocument();
    expect(screen.getByText(/timeline academico-blockchain/i)).toBeInTheDocument();
    expect(screen.getByText(/certificados por estado/i)).toBeInTheDocument();
    expect(screen.getByText(/ultimas transacciones/i)).toBeInTheDocument();
    expect(screen.getByText(/ultimos certificados emitidos/i)).toBeInTheDocument();
  });

  it("exposes the prompt 02 navigation and product shell controls", () => {
    render(<App />);

    expect(screen.getAllByText(/conexion web3/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/emitir certificado/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/verificacion publica/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/ledger blockchain/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/auditoria distribuida/i).length).toBeGreaterThan(0);
    expect(screen.getByLabelText(/rol activo/i)).toBeInTheDocument();
    expect(screen.getByText(/panel contextual/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/navegacion movil/i)).toBeInTheDocument();
  });
});

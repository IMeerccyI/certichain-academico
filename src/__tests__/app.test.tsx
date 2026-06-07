import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import App from "@/app/App";

describe("CertiChain application shell", () => {
  it("renders the reference-style certificate pipeline dashboard", () => {
    render(<App />);

    expect(
      screen.getByRole("heading", { name: /academic certificate pipeline/i }),
    ).toBeInTheDocument();
    expect(screen.getByText(/endpoint traffic & health/i)).toBeInTheDocument();
    expect(screen.getByText(/active certificate architecture/i)).toBeInTheDocument();
    expect(screen.getByText(/guardrail exceptions/i)).toBeInTheDocument();
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

import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import App from "@/app/App";
import { useAppStore } from "@/store/app-store";

describe("CertiChain application shell", () => {
  beforeEach(() => {
    window.localStorage.clear();
    useAppStore.getState().resetDemoData("dashboard");
  });

  it("renders the operational academic blockchain dashboard", () => {
    render(<App />);

    expect(
      screen.getByRole("heading", { name: /certichain academico/i }),
    ).toBeInTheDocument();
    expect(screen.getByText(/flujo academico-blockchain/i)).toBeInTheDocument();
    expect(screen.getByText(/ultimas transacciones/i)).toBeInTheDocument();
    expect(screen.getByText(/ultimos certificados emitidos/i)).toBeInTheDocument();
  });

  it("exposes navigation and product shell controls", () => {
    useAppStore.getState().setActiveRole("academic_admin");
    render(<App />);

    expect(screen.getAllByText(/conexion web3/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/emitir certificado/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/verificacion publica/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/ledger blockchain/i).length).toBeGreaterThan(0);
    expect(screen.queryByText(/auditoria distribuida/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/analitica/i)).not.toBeInTheDocument();
    expect(screen.getByLabelText(/persona activa/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/rol activo/i)).toBeInTheDocument();
    expect(screen.queryByText(/panel contextual/i)).not.toBeInTheDocument();
    expect(screen.getByLabelText(/navegacion movil/i)).toBeInTheDocument();
  });

  it("adds a local-only animated theme toggle beside the notification control", () => {
    render(<App />);

    const notifications = screen.getByRole("button", { name: /notificaciones/i });
    const toggle = screen.getByRole("button", {
      name: /alternar vista visual del tema/i,
    });

    expect(toggle).toHaveAttribute("aria-pressed", "false");
    expect(notifications.nextElementSibling).toBe(toggle);

    fireEvent.click(toggle);

    expect(toggle).toHaveAttribute("aria-pressed", "true");
  });
});

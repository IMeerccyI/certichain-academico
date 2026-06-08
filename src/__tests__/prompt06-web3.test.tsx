import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import App from "@/app/App";
import { useAppStore } from "@/store/app-store";

describe("Prompt 06 simulated Web3 connection", () => {
  beforeEach(() => {
    window.localStorage.clear();
    useAppStore.getState().resetDemoData();
    useAppStore.getState().setRoute("web3");
  });

  it("renders a credible MetaMask and Ethereum connection console", () => {
    render(<App />);

    expect(screen.getByRole("heading", { name: /conexion web3/i })).toBeInTheDocument();
    expect(screen.getAllByText(/desconectado/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/wallet address simulada/i)).toBeInTheDocument();
    expect(screen.getByText(/balance eth simulado/i)).toBeInTheDocument();
    expect(screen.getByText(/red seleccionada/i)).toBeInTheDocument();
    expect(screen.getByText(/chain id/i)).toBeInTheDocument();
    expect(screen.getByText(/direccion del smart contract/i)).toBeInTheDocument();
    expect(screen.getByText(/contrato desplegado/i)).toBeInTheDocument();
    expect(screen.getByText(/ultimo bloque simulado/i)).toBeInTheDocument();
    expect(screen.getByText(/gas estimado simulado/i)).toBeInTheDocument();
    expect(screen.getByText(/abi resumida/i)).toBeInTheDocument();

    for (const method of [
      /emitirCertificado\(\)/i,
      /verificarCertificado\(\)/i,
      /revocarCertificado\(\)/i,
      /consultarHistorial\(\)/i,
      /autorizarEmisor\(\)/i,
      /desactivarEmisor\(\)/i,
    ]) {
      expect(screen.getByText(method)).toBeInTheDocument();
    }
  });

  it("connects the mock wallet, changes the global network and shows resilient error states", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole("button", { name: /conectar wallet mock/i }));
    expect(screen.getAllByText(/conectando/i).length).toBeGreaterThan(0);

    await waitFor(() => {
      expect(useAppStore.getState().wallet.connected).toBe(true);
    });
    expect(screen.getAllByText(/conectado/i).length).toBeGreaterThan(0);

    await user.click(screen.getByRole("button", { name: /cambiar red a hardhat local/i }));
    expect(useAppStore.getState().selectedNetwork).toBe("hardhat");
    expect(screen.getAllByText(/hardhat local/i).length).toBeGreaterThan(0);

    await user.click(screen.getByRole("button", { name: /simular error de red/i }));
    expect(screen.getAllByText(/error de red/i).length).toBeGreaterThan(0);
    expect(screen.getByRole("heading", { name: /conexion web3/i })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /simular red no soportada/i }));
    expect(screen.getAllByText(/red no soportada/i).length).toBeGreaterThan(0);
  });

  it("signs a mock message and copies wallet and contract addresses", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole("button", { name: /firmar mensaje/i }));
    expect(screen.getByText(/firma mock generada/i)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /copiar direccion wallet/i }));
    await user.click(screen.getByRole("button", { name: /copiar direccion de contrato/i }));

    await waitFor(() => {
      expect(
        useAppStore.getState().toasts.some((toast) => /direccion wallet copiada/i.test(toast.title)),
      ).toBe(true);
      expect(
        useAppStore
          .getState()
          .toasts.some((toast) => /direccion de contrato copiada/i.test(toast.title)),
      ).toBe(true);
    });
  });
});

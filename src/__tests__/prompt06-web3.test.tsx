import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import App from "@/app/App";
import { useAppStore } from "@/store/app-store";

describe("Prompt 06 real Web3 connection", () => {
  beforeEach(() => {
    Reflect.deleteProperty(window, "ethereum");
    window.localStorage.clear();
    useAppStore.getState().resetDemoData();
    useAppStore.getState().setRoute("web3");
  });

  it("renders a real MetaMask and Ethereum connection console", () => {
    render(<App />);

    expect(screen.getByRole("heading", { name: /conexion web3/i })).toBeInTheDocument();
    expect(screen.getAllByText(/desconectado/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/wallet address/i)).toBeInTheDocument();
    expect(screen.getByText(/balance eth/i)).toBeInTheDocument();
    expect(screen.getByText(/red seleccionada/i)).toBeInTheDocument();
    expect(screen.getByText(/chain id/i)).toBeInTheDocument();
    expect(screen.getByText(/direccion del smart contract/i)).toBeInTheDocument();
    expect(screen.getByText(/contrato desplegado/i)).toBeInTheDocument();
    expect(screen.getByText(/estado de metamask/i)).toBeInTheDocument();
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

  it("does not create a fake wallet when MetaMask is unavailable", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole("button", { name: /conectar metamask/i }));

    await waitFor(() => {
      expect(useAppStore.getState().wallet.connected).toBe(false);
      expect(
        useAppStore.getState().toasts.some((toast) => /metamask no detectado/i.test(toast.title)),
      ).toBe(true);
    });
  });

  it("changes the selected target network without creating simulated chain data", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole("button", { name: /cambiar red a hardhat local/i }));
    expect(useAppStore.getState().selectedNetwork).toBe("hardhat");
    expect(screen.getAllByText(/hardhat local/i).length).toBeGreaterThan(0);
  });

  it("protects wallet copy without MetaMask and copies deployed contract addresses", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole("button", { name: /firmar mensaje/i }));
    expect(screen.getAllByText(/conecta metamask para firmar/i).length).toBeGreaterThan(0);

    await user.click(screen.getByRole("button", { name: /copiar direccion wallet/i }));
    await user.click(screen.getByRole("button", { name: /cambiar red a hardhat local/i }));
    await user.click(screen.getByRole("button", { name: /copiar direccion de contrato/i }));

    await waitFor(() => {
      expect(
        useAppStore.getState().toasts.some((toast) => /sin wallet conectada/i.test(toast.title)),
      ).toBe(true);
      expect(
        useAppStore
          .getState()
          .toasts.some((toast) => /direccion de contrato copiada/i.test(toast.title)),
      ).toBe(true);
    });
  });
});

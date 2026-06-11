import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import App from "@/app/App";
import { useAppStore } from "@/store/app-store";

describe("Prompt 15 configuracion, importacion/exportacion y permisos", () => {
  beforeEach(() => {
    window.localStorage.clear();
    useAppStore.getState().resetDemoData();
    useAppStore.getState().setRoute("settings");
  });

  it("renders all operational settings sections and the permissions matrix", () => {
    render(<App />);

    const page = screen.getByTestId("settings-workspace");
    expect(within(page).getByRole("heading", { name: /configuracion operativa/i })).toBeInTheDocument();

    for (const section of [
      "Perfil academico",
      "Rol activo",
      "Red activa",
      "Wallet",
      "Contrato desplegado",
      "Preferencias visuales",
      "Accesibilidad",
      "Datos precargados",
      "Importar/exportar",
      "Seguridad de sesion Web3",
      "Matriz de permisos",
    ]) {
      expect(within(page).getByText(section)).toBeInTheDocument();
    }

    const matrix = within(page).getByTestId("settings-permission-matrix");
    for (const label of [
      "Administrador academico",
      "Emisor autorizado",
      "Estudiante",
      "Verificador publico",
      "Auditor",
      "Emitir certificado",
      "Revocar certificado",
      "Verificacion publica",
      "Mint NFT",
      "Gestionar emisores",
    ]) {
      expect(matrix).toHaveTextContent(label);
    }
  });

  it("changes role, network, wallet and visual accessibility preferences", async () => {
    const user = userEvent.setup();
    render(<App />);

    const page = screen.getByTestId("settings-workspace");

    await user.click(within(page).getByRole("button", { name: /cambiar rol a estudiante/i }));
    expect(useAppStore.getState().activeRole).toBe("student");
    expect(within(page).getByTestId("settings-active-role")).toHaveTextContent("Estudiante");
    expect(within(page).getByTestId("settings-role-guard")).toHaveTextContent("acciones bloqueadas");

    await user.click(within(page).getByRole("button", { name: /cambiar red a hardhat/i }));
    expect(useAppStore.getState().selectedNetwork).toBe("hardhat");
    expect(within(page).getByTestId("settings-active-network")).toHaveTextContent("hardhat");

    await user.click(within(page).getByRole("button", { name: /conectar metamask/i }));
    expect(useAppStore.getState().wallet.connected).toBe(false);
    expect(within(page).getByTestId("settings-wallet-state")).toHaveTextContent("Desconectada");
    expect(
      useAppStore.getState().toasts.some((toast) => /metamask no detectado/i.test(toast.title)),
    ).toBe(true);

    await user.click(within(page).getByRole("button", { name: /activar modo presentacion/i }));
    await user.click(within(page).getByRole("button", { name: /activar modo accesible/i }));
    await user.click(within(page).getByRole("button", { name: /reducir animaciones/i }));
    await user.click(within(page).getByRole("button", { name: /desactivar efectos intensos/i }));

    expect(useAppStore.getState().settings.presentationMode).toBe(true);
    expect(useAppStore.getState().settings.accessibleMode).toBe(true);
    expect(useAppStore.getState().settings.reducedMotion).toBe(true);
    expect(useAppStore.getState().settings.intenseEffects).toBe(false);
    expect(within(page).getByTestId("settings-mode-summary")).toHaveTextContent("Presentacion");
    expect(within(page).getByTestId("settings-mode-summary")).toHaveTextContent("Accesible");
  });

  it("exports JSON, rejects invalid imports, imports valid state and confirms reset", async () => {
    const user = userEvent.setup();
    render(<App />);

    const page = screen.getByTestId("settings-workspace");

    await user.click(within(page).getByRole("button", { name: /exportar estado json/i }));
    const exportBox = within(page).getByTestId("settings-export-json") as HTMLTextAreaElement;
    expect(exportBox.value).toContain('"certificates"');
    expect(exportBox.value).toContain('"students"');
    expect(exportBox.value).toContain('"issuers"');
    expect(exportBox.value).toContain('"blockchainEvents"');
    expect(exportBox.value).toContain('"settings"');

    const importBox = within(page).getByLabelText("JSON para importar");
    fireEvent.change(importBox, { target: { value: "{ json roto" } });
    await user.click(within(page).getByRole("button", { name: /importar estado json/i }));
    expect(within(page).getByTestId("settings-import-status")).toHaveTextContent("JSON invalido");
    expect(useAppStore.getState().activeRole).toBe("authorized_issuer");

    const validState = {
      ...JSON.parse(useAppStore.getState().exportState()),
      activeRole: "auditor",
      selectedNetwork: "ganache",
    };
    fireEvent.change(importBox, { target: { value: JSON.stringify(validState) } });
    await user.click(within(page).getByRole("button", { name: /importar estado json/i }));
    expect(
      await screen.findByRole("dialog", { name: /confirmar importacion de estado/i }),
    ).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /confirmar reemplazo/i }));

    await waitFor(() => {
      expect(useAppStore.getState().activeRole).toBe("auditor");
      expect(useAppStore.getState().selectedNetwork).toBe("ganache");
    });
    expect(within(page).getByTestId("settings-import-status")).toHaveTextContent("Estado importado");

    await user.click(within(page).getByRole("button", { name: /resetear datos precargados/i }));
    expect(await screen.findByRole("dialog", { name: /confirmar reset de demo/i })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /confirmar reset/i }));

    await waitFor(() => {
      expect(useAppStore.getState().activeRole).toBe("authorized_issuer");
      expect(useAppStore.getState().certificates).toHaveLength(12);
    });
    expect(within(page).getByTestId("settings-reset-status")).toHaveTextContent("Datos precargados reiniciados");
  });
});

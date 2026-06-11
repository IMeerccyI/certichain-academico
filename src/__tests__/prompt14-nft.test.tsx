import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import App from "@/app/App";
import { useAppStore } from "@/store/app-store";

describe("Academic NFT module", () => {
  beforeEach(() => {
    window.localStorage.clear();
    Object.defineProperty(window.navigator, "clipboard", {
      configurable: true,
      value: {
        writeText: async () => undefined,
      },
    });
    useAppStore.getState().resetDemoData();
    useAppStore.getState().setRoute("nft");
  });

  it("renders the academic token workspace with an existing NFT, metadata and permanent history", async () => {
    const user = userEvent.setup();
    render(<App />);

    const page = screen.getByTestId("nft-workspace");
    expect(within(page).getByRole("heading", { name: /nft academico erc-721/i })).toBeInTheDocument();
    expect(within(page).getByText(/credencial academica tokenizada/i)).toBeInTheDocument();
    expect(within(page).getByText(/no es venta ni activo economico real/i)).toBeInTheDocument();

    await user.click(within(page).getByRole("button", { name: /seleccionar certificado cert-2026-0008/i }));

    expect(within(page).getByTestId("nft-token-card")).toHaveTextContent("NFT-ACAD-0001");
    expect(within(page).getByTestId("nft-token-card")).toHaveTextContent("Propietario actual");
    expect(within(page).getByTestId("nft-token-card")).toHaveTextContent("Valeria Torres");
    expect(within(page).getByTestId("nft-related-certificate")).toHaveTextContent("CERT-2026-0008");
    expect(within(page).getByTestId("nft-related-certificate")).toHaveTextContent("Hash del documento");
    expect(within(page).getByTestId("nft-token-timeline")).toHaveTextContent("Historial permanente");

    await user.click(within(page).getByRole("button", { name: /ver metadata/i }));
    const metadataPanel = within(page).getByTestId("nft-metadata-json");
    expect(metadataPanel).toHaveTextContent('"estudiante": "Valeria Torres"');
    expect(metadataPanel).toHaveTextContent('"carrera": "Derecho"');
    expect(metadataPanel).toHaveTextContent('"universidad": "Universidad Mayor de San Simon"');
    expect(metadataPanel).toHaveTextContent('"hash":');

    await user.click(within(page).getByRole("button", { name: /copiar metadata/i }));
    expect(within(page).getByTestId("nft-copy-status")).toHaveTextContent("Metadata copiada");
  });

  it("blocks manual minting because ERC-721 tokens are minted during on-chain issuance", async () => {
    const user = userEvent.setup();
    render(<App />);

    const page = screen.getByTestId("nft-workspace");
    await user.click(within(page).getByRole("button", { name: /seleccionar certificado cert-2026-0001/i }));
    const initialTokens = useAppStore.getState().nftAcademicTokens.length;

    await user.click(within(page).getByRole("button", { name: /mint desde contrato/i }));

    expect(useAppStore.getState().nftAcademicTokens).toHaveLength(initialTokens);
    expect(useAppStore.getState().certificates.find((item) => item.id === "certificate-001")?.nftTokenId).toBeUndefined();
    expect(within(page).getByTestId("nft-related-certificate")).toHaveTextContent("CERT-2026-0001");
    expect(within(page).getByTestId("nft-token-timeline")).toHaveTextContent("Mint pendiente");
    expect(
      useAppStore.getState().toasts.some((toast) => /mint se genera al emitir/i.test(toast.title)),
    ).toBe(true);
  });

  it("shows controlled transfer rules as blocked or administratively allowed", async () => {
    const user = userEvent.setup();
    useAppStore.getState().setActiveRole("academic_admin");
    render(<App />);

    const page = screen.getByTestId("nft-workspace");
    await user.click(within(page).getByRole("button", { name: /seleccionar certificado cert-2026-0008/i }));

    await user.click(within(page).getByRole("button", { name: /transferencia bloqueada/i }));
    expect(within(page).getByTestId("nft-transfer-status")).toHaveTextContent("Transferencia bloqueada");

    await user.click(within(page).getByRole("button", { name: /transferencia permitida/i }));
    expect(within(page).getByTestId("nft-transfer-status")).toHaveTextContent("Transferencia permitida");
    expect(within(page).getByTestId("nft-token-timeline")).toHaveTextContent(
      "correccion administrativa de wallet",
    );
  });
});

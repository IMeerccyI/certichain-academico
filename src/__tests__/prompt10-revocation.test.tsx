import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import App from "@/app/App";
import { useAppStore } from "@/store/app-store";

describe("Prompt 10 revocation flow", () => {
  beforeEach(() => {
    window.localStorage.clear();
    useAppStore.getState().resetDemoData();
    useAppStore.getState().setActiveRole("authorized_issuer");
    useAppStore.getState().setRoute("revocation");
  });

  async function searchCertificate(code: string) {
    const user = userEvent.setup();
    const page = screen.getByTestId("revocation-workspace");

    await user.clear(within(page).getByLabelText(/buscar certificado por codigo/i));
    await user.type(within(page).getByLabelText(/buscar certificado por codigo/i), code);
    await user.click(within(page).getByRole("button", { name: /buscar certificado/i }));

    return { page, user };
  }

  it("renders the critical revocation workspace with required controls", () => {
    render(<App />);
    const page = screen.getByTestId("revocation-workspace");

    expect(within(page).getByRole("heading", { name: /revocacion de certificados/i })).toBeInTheDocument();
    expect(within(page).getByLabelText(/buscar certificado por codigo/i)).toBeInTheDocument();
    expect(within(page).getByRole("button", { name: /buscar certificado/i })).toBeInTheDocument();
    expect(within(page).getByText(/panel de datos del certificado/i)).toBeInTheDocument();
    expect(within(page).getByLabelText(/motivo de revocacion/i)).toBeInTheDocument();
    expect(within(page).getByLabelText(/emisor responsable/i)).toBeInTheDocument();
    expect(within(page).getByLabelText(/confirmo la revocacion/i)).toBeInTheDocument();
    expect(within(page).getByRole("button", { name: /^revocar$/i })).toBeInTheDocument();
    expect(within(page).getByText(/timeline de revocacion/i)).toBeInTheDocument();
  });

  it("blocks incorrect role, empty reason and already revoked certificates", async () => {
    const user = userEvent.setup();
    useAppStore.getState().setActiveRole("student");
    const firstRender = render(<App />);

    let page = screen.getByTestId("revocation-workspace");
    await user.type(within(page).getByLabelText(/buscar certificado por codigo/i), "CERT-2026-0001");
    await user.click(within(page).getByRole("button", { name: /buscar certificado/i }));
    await user.type(within(page).getByLabelText(/motivo de revocacion/i), "Error administrativo");
    await user.click(within(page).getByLabelText(/confirmo la revocacion/i));
    await user.click(within(page).getByRole("button", { name: /^revocar$/i }));

    expect(within(page).getByText(/permiso insuficiente/i)).toBeInTheDocument();
    expect(useAppStore.getState().certificates.find((item) => item.code === "CERT-2026-0001")?.status).toBe(
      "valid",
    );

    firstRender.unmount();
    useAppStore.getState().setActiveRole("authorized_issuer");
    useAppStore.getState().setRoute("revocation");
    render(<App />);

    ({ page } = await searchCertificate("CERT-2026-0001"));
    await user.click(within(page).getByLabelText(/confirmo la revocacion/i));
    await user.click(within(page).getByRole("button", { name: /^revocar$/i }));
    expect(within(page).getByText(/motivo requerido/i)).toBeInTheDocument();

    ({ page } = await searchCertificate("CERT-2026-0003"));
    await user.type(within(page).getByLabelText(/motivo de revocacion/i), "Intento duplicado");
    await user.click(within(page).getByLabelText(/confirmo la revocacion/i));
    await user.click(within(page).getByRole("button", { name: /^revocar$/i }));
    expect(within(page).getByText(/certificado ya revocado/i)).toBeInTheDocument();
  });

  it("revokes a valid certificate with confirmation, transaction result and ledger trace", async () => {
    const user = userEvent.setup();
    render(<App />);
    const beforeRevoked = useAppStore
      .getState()
      .certificates.filter((certificate) => certificate.status === "revoked").length;

    const { page } = await searchCertificate("CERT-2026-0001");
    await user.type(
      within(page).getByLabelText(/motivo de revocacion/i),
      "Correccion administrativa detectada por registro central",
    );
    await user.click(within(page).getByLabelText(/confirmo la revocacion/i));
    await user.click(within(page).getByRole("button", { name: /^revocar$/i }));

    const modal = await screen.findByRole("dialog", { name: /advertencia de revocacion/i });
    expect(within(modal).getByText(/esta accion no elimina el certificado/i)).toBeInTheDocument();
    await user.click(within(modal).getByRole("button", { name: /firmar y enviar revocacion/i }));

    await waitFor(() => {
      expect(within(page).getByText(/transaccion mock confirmada/i)).toBeInTheDocument();
    });

    const state = useAppStore.getState();
    const revokedCertificate = state.certificates.find((item) => item.code === "CERT-2026-0001");
    expect(revokedCertificate?.status).toBe("revoked");
    expect(state.certificates.filter((certificate) => certificate.status === "revoked")).toHaveLength(
      beforeRevoked + 1,
    );
    expect(state.revocationRecords.some((record) => record.certificateId === revokedCertificate?.id)).toBe(true);
    expect(state.blockchainEvents[0]).toMatchObject({
      certificateId: revokedCertificate?.id,
      type: "certificate_revoked",
    });
    expect(state.verifyCertificateByCode("CERT-2026-0001").status).toBe("revoked");
    expect(within(page).getAllByText(/certificate_revoked/i).length).toBeGreaterThan(0);
    expect(within(page).getAllByText(/bloque confirmado/i).length).toBeGreaterThan(0);
  });
});

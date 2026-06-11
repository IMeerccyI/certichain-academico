import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import App from "@/app/App";
import { useAppStore } from "@/store/app-store";

describe("Prompt 10 revocation flow", () => {
  beforeEach(() => {
    Reflect.deleteProperty(window, "ethereum");
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
    expect(within(page).queryByText(/mock/i)).not.toBeInTheDocument();
  });

  it("blocks incorrect role, empty reason and already revoked certificates", async () => {
    const user = userEvent.setup();
    useAppStore.getState().setActiveRole("student");
    const studentView = render(<App />);

    expect(useAppStore.getState().currentRouteId).toBe("students");
    expect(screen.queryByTestId("revocation-workspace")).not.toBeInTheDocument();

    const blockedRevoke = await useAppStore
      .getState()
      .revokeCertificate("certificate-001", "Error administrativo");
    expect(blockedRevoke).toBeUndefined();
    expect(useAppStore.getState().certificates.find((item) => item.code === "CERT-2026-0001")?.status).toBe(
      "valid",
    );

    studentView.unmount();
    useAppStore.getState().setActiveRole("authorized_issuer");
    useAppStore.getState().setRoute("revocation");
    render(<App />);

    let { page } = await searchCertificate("CERT-2026-0001");
    await user.click(within(page).getByLabelText(/confirmo la revocacion/i));
    await user.click(within(page).getByRole("button", { name: /^revocar$/i }));
    expect(within(page).getByText(/motivo requerido/i)).toBeInTheDocument();

    ({ page } = await searchCertificate("CERT-2026-0003"));
    await user.type(within(page).getByLabelText(/motivo de revocacion/i), "Intento duplicado");
    await user.click(within(page).getByLabelText(/confirmo la revocacion/i));
    await user.click(within(page).getByRole("button", { name: /^revocar$/i }));
    expect(within(page).getByText(/certificado ya revocado/i)).toBeInTheDocument();
  });

  it("does not revoke or create a fake transaction when the contract is not connected", async () => {
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

    const state = useAppStore.getState();
    const certificate = state.certificates.find((item) => item.code === "CERT-2026-0001");
    expect(within(page).getByText(/contrato no conectado/i)).toBeInTheDocument();
    expect(screen.queryByRole("dialog", { name: /advertencia de revocacion/i })).not.toBeInTheDocument();
    expect(certificate?.status).toBe("valid");
    expect(state.certificates.filter((certificate) => certificate.status === "revoked")).toHaveLength(
      beforeRevoked,
    );
    expect(state.revocationRecords.some((record) => record.certificateId === certificate?.id)).toBe(false);
    expect(state.blockchainEvents[0]).not.toMatchObject({
      certificateId: certificate?.id,
      type: "certificate_revoked",
    });
    expect(within(page).queryByText(/transaccion mock confirmada/i)).not.toBeInTheDocument();
  });
});

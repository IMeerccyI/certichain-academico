import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import App from "@/app/App";
import { calculateSha256, normalizeHash } from "@/lib/hash";
import { useAppStore } from "@/store/app-store";

describe("Public verification module", () => {
  beforeEach(() => {
    window.localStorage.clear();
    useAppStore.getState().resetDemoData();
    useAppStore.getState().setRoute("verification");
  });

  it("renders the public verification workspace with four methods and clear public copy", () => {
    render(<App />);
    const page = screen.getByTestId("public-verification");

    expect(screen.getByRole("heading", { name: /verificacion publica/i })).toBeInTheDocument();

    for (const method of [
      /por codigo/i,
      /por hash/i,
      /por pdf/i,
      /por qr/i,
    ]) {
      expect(within(page).getByText(method)).toBeInTheDocument();
    }

    for (const caseLabel of [
      "Certificado valido",
      "Certificado revocado",
      "Documento manipulado",
      "Certificado inexistente",
    ]) {
      expect(within(page).getByRole("button", { name: caseLabel })).toBeInTheDocument();
    }

    expect(within(page).getByRole("button", { name: /verificar/i })).toBeInTheDocument();
    expect(within(page).getByRole("button", { name: /limpiar/i })).toBeInTheDocument();
    expect(within(page).getByRole("button", { name: /copiar resultado/i })).toBeInTheDocument();
    expect(within(page).getByRole("button", { name: /ver detalle/i })).toBeInTheDocument();
    expect(
      within(page).getByRole("button", { name: /probar documento manipulado/i }),
    ).toBeInTheDocument();
    expect(within(page).getByText(/seccion tecnica/i)).toBeInTheDocument();
    expect(
      within(page).getByText(/funciona aunque la universidad este fuera de linea/i),
    ).toBeInTheDocument();
    expect(within(page).queryByText(/pdf simulado/i)).not.toBeInTheDocument();
  });

  it("produces the correct result for every preloaded verification case", async () => {
    const user = userEvent.setup();
    render(<App />);
    const page = screen.getByTestId("public-verification");

    const cases = [
      ["Certificado valido", /certificado valido/i],
      ["Certificado revocado", /certificado revocado/i],
      ["Documento manipulado", /certificado no valido/i],
      ["Certificado inexistente", /certificado no encontrado/i],
    ] as const;

    for (const [caseButton, expectedResult] of cases) {
      await user.click(within(page).getByRole("button", { name: caseButton }));
      await user.click(within(page).getByRole("button", { name: /verificar/i }));

      await waitFor(() => {
        expect(within(page).getByTestId("verification-status")).toHaveTextContent(expectedResult);
      });

      expect(within(page).getAllByText(/hash calculado/i).length).toBeGreaterThan(0);
      expect(within(page).getAllByText(/hash registrado/i).length).toBeGreaterThan(0);
      expect(within(page).getAllByText(/coincidencia/i).length).toBeGreaterThan(0);
      expect(within(page).getAllByText(/historial de eventos/i).length).toBeGreaterThan(0);
    }
  });

  it("verifies by hash, detects manipulated documents and exposes post-result actions", async () => {
    const user = userEvent.setup();
    const validCertificate = useAppStore.getState().certificates[0];
    render(<App />);
    const page = screen.getByTestId("public-verification");

    await user.click(within(page).getByRole("button", { name: /por hash/i }));
    await user.clear(within(page).getByLabelText(/hash del documento/i));
    await user.type(within(page).getByLabelText(/hash del documento/i), validCertificate.documentHash);
    await user.click(within(page).getByRole("button", { name: /verificar/i }));

    await waitFor(() => {
      expect(within(page).getByTestId("verification-status")).toHaveTextContent(/certificado valido/i);
    });

    expect(within(page).getByText(validCertificate.studentName)).toBeInTheDocument();
    expect(within(page).getByText(validCertificate.career)).toBeInTheDocument();
    expect(within(page).getByText(validCertificate.university)).toBeInTheDocument();
    expect(within(page).getByText(/transaction hash/i)).toBeInTheDocument();
    expect(within(page).getByText(/numero de bloque/i)).toBeInTheDocument();

    await user.click(within(page).getByRole("button", { name: /probar documento manipulado/i }));
    await user.click(within(page).getByRole("button", { name: /verificar/i }));

    await waitFor(() => {
      expect(within(page).getByTestId("verification-status")).toHaveTextContent(
        /certificado no valido/i,
      );
    });

    await user.click(within(page).getByRole("button", { name: /copiar resultado/i }));
    expect(useAppStore.getState().toasts.some((toast) => /resultado copiado/i.test(toast.title))).toBe(
      true,
    );

    await user.click(within(page).getByRole("button", { name: /ver detalle/i }));
    expect(useAppStore.getState().currentRouteId).toBe("certificates");
  });

  it("verifies an uploaded PDF by hashing the real file", async () => {
    const user = userEvent.setup();
    const pdfFile = new File(["certichain-real-pdf-content-001"], "certificado-real.pdf", {
      type: "application/pdf",
    });
    const pdfHash = normalizeHash(await calculateSha256(pdfFile));

    useAppStore.setState((state) => {
      const base = state.certificates[0];
      const certificate = {
        ...base,
        blockchainHash: pdfHash,
        code: "CERT-2026-0100",
        documentHash: pdfHash,
        id: "certificate-pdf-real",
        pdfHash,
        pdfName: pdfFile.name,
        status: "valid" as const,
        title: `Constancia de estudios - ${base.studentName}`,
        transactionHash: `0x${"1".repeat(64)}`,
        txHash: `0x${"1".repeat(64)}`,
      };

      return {
        certificates: [certificate, ...state.certificates],
      };
    });

    render(<App />);
    const page = screen.getByTestId("public-verification");

    await user.click(within(page).getByRole("button", { name: /por pdf/i }));
    await user.upload(within(page).getByLabelText(/archivo pdf/i), pdfFile);
    await user.click(within(page).getByRole("button", { name: /verificar/i }));

    await waitFor(() => {
      expect(within(page).getByTestId("verification-status")).toHaveTextContent(/certificado valido/i);
    });

    expect(within(page).getAllByText("certificado-real.pdf").length).toBeGreaterThan(0);
    expect(within(page).getAllByText(/hash calculado/i).length).toBeGreaterThan(0);
    expect(within(page).queryByText(/pdf simulado/i)).not.toBeInTheDocument();
  });
});

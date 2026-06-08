import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import App from "@/app/App";
import { useAppStore } from "@/store/app-store";

describe("Prompt 12 ledger and distributed audit", () => {
  beforeEach(() => {
    window.localStorage.clear();
    useAppStore.getState().resetDemoData();
  });

  it("renders ledger events from the store with filters, timeline and expandable detail", async () => {
    const user = userEvent.setup();
    const event = useAppStore.getState().blockchainEvents.find((item) => item.certificateId);
    useAppStore.getState().setRoute("ledger");

    render(<App />);

    const page = screen.getByTestId("ledger-workspace");
    expect(within(page).getByRole("heading", { name: /ledger blockchain/i })).toBeInTheDocument();
    expect(within(page).getByTestId("ledger-events-table")).toHaveTextContent(event?.id ?? "");
    expect(within(page).getByTestId("ledger-events-table")).toHaveTextContent(event?.transactionHash.slice(0, 8) ?? "");
    expect(within(page).getByTestId("ledger-events-table")).toHaveTextContent("Metodo");
    expect(within(page).getByText(/timeline de eventos/i)).toBeInTheDocument();

    await user.type(within(page).getByLabelText(/filtro por actor/i), "verifier");
    expect(within(page).getByTestId("ledger-events-table")).toHaveTextContent("certificate_verified");

    await user.click(within(page).getByRole("button", { name: /verification_failed/i }));
    expect(within(page).getByTestId("ledger-events-table")).toHaveTextContent("verification_failed");

    await user.click(within(page).getByRole("button", { name: /expandir detalle/i }));
    const detail = within(page).getByTestId("ledger-event-detail");
    expect(detail).toHaveTextContent("Datos resumidos");
    expect(detail).toHaveTextContent("Hash de transaccion");
    expect(detail).toHaveTextContent("Certificado relacionado");
  });

  it("renders an interactive distributed audit network with resilience simulations", async () => {
    const user = userEvent.setup();
    useAppStore.getState().setRoute("audit");

    render(<App />);

    const page = screen.getByTestId("distributed-audit-workspace");
    expect(within(page).getByRole("heading", { name: /auditoria distribuida/i })).toBeInTheDocument();
    expect(within(page).getByTestId("distributed-network")).toHaveTextContent("Universidad emisora");
    expect(within(page).getByTestId("distributed-network")).toHaveTextContent("Blockchain Ethereum");
    expect(within(page).getByTestId("distributed-network")).toHaveTextContent("Estudiante");
    expect(within(page).getByTestId("distributed-network")).toHaveTextContent("Entidad verificadora");
    expect(within(page).getByText(/ledger replicado/i)).toBeInTheDocument();
    expect(within(page).getByText(/sistema tradicional/i)).toBeInTheDocument();
    expect(within(page).getByText(/sistema descentralizado/i)).toBeInTheDocument();

    await user.click(within(page).getByRole("button", { name: /simular caida universidad/i }));
    expect(within(page).getByTestId("distributed-network")).toHaveTextContent("Fuera de linea");
    expect(within(page).getByText(/verificacion sigue disponible/i)).toBeInTheDocument();

    await user.click(within(page).getByRole("button", { name: /simular consenso/i }));
    expect(within(page).getByTestId("consensus-timeline")).toHaveTextContent("Propuesta");
    expect(within(page).getByTestId("consensus-timeline")).toHaveTextContent("Confirmacion");

    await user.click(within(page).getByRole("button", { name: /simular replicacion/i }));
    expect(within(page).getByTestId("replicated-ledger")).toHaveTextContent("Replica sincronizada");

    await user.click(within(page).getByRole("button", { name: /simular inmutabilidad/i }));
    expect(within(page).getByText(/bloque protegido/i)).toBeInTheDocument();

    for (const concept of [
      "Replicacion",
      "Consenso",
      "Tolerancia a fallos",
      "Inmutabilidad",
      "Transparencia",
      "Escalabilidad",
      "Disponibilidad",
      "Seguridad distribuida",
    ]) {
      expect(within(page).getByText(concept)).toBeInTheDocument();
    }
  });
});

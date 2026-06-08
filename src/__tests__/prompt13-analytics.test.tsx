import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import App from "@/app/App";
import { useAppStore } from "@/store/app-store";

describe("Prompt 13 system analytics", () => {
  beforeEach(() => {
    window.localStorage.clear();
    useAppStore.getState().resetDemoData();
    useAppStore.getState().setRoute("analytics");
  });

  it("renders analytics metrics, chart panels and summary data from mock records", () => {
    render(<App />);

    const page = screen.getByTestId("analytics-workspace");
    expect(within(page).getByRole("heading", { name: /analitica del sistema/i })).toBeInTheDocument();

    for (const metric of [
      "Certificados emitidos",
      "Certificados validos",
      "Certificados revocados",
      "Verificaciones publicas",
      "Intentos no validos",
      "Emisores activos",
      "Carrera lider",
      "Facultad lider",
      "Tiempo promedio",
      "Actividad blockchain mensual",
    ]) {
      expect(within(page).getAllByText(metric).length).toBeGreaterThan(0);
    }

    expect(within(page).getByTestId("metric-total-certificates")).toHaveTextContent("12");
    expect(within(page).getByTestId("metric-valid-certificates")).toHaveTextContent("4");
    expect(within(page).getByTestId("metric-revoked-certificates")).toHaveTextContent("4");
    expect(within(page).getByTestId("metric-public-verifications")).toHaveTextContent("8");
    expect(within(page).getByTestId("metric-invalid-attempts")).toHaveTextContent("5");
    expect(within(page).getByTestId("metric-active-issuers")).toHaveTextContent("4");
    expect(within(page).getByTestId("metric-top-career")).toHaveTextContent("Ingenieria de Sistemas");
    expect(within(page).getByTestId("metric-top-faculty")).toHaveTextContent("Facultad de Tecnologia");

    for (const chartId of [
      "chart-certificates-by-status",
      "chart-certificates-by-type",
      "chart-verifications-by-entity",
      "chart-monthly-activity",
      "chart-revocations-by-reason",
      "chart-top-issuers",
    ]) {
      expect(within(page).getByTestId(chartId)).toBeInTheDocument();
    }

    const summary = within(page).getByTestId("analytics-summary-table");
    expect(within(summary).getByText("Facultad de Tecnologia")).toBeInTheDocument();
    expect(within(summary).getByText("Rectorado UMSA")).toBeInTheDocument();
    expect(within(summary).getAllByText("3").length).toBeGreaterThan(0);
  });

  it("updates analytics when filters change and exports a simulated report", async () => {
    const user = userEvent.setup();
    render(<App />);

    const page = screen.getByTestId("analytics-workspace");

    await user.click(within(page).getByRole("button", { name: /facultad de ciencias juridicas/i }));
    expect(within(page).getByTestId("metric-total-certificates")).toHaveTextContent("3");
    expect(within(page).getByTestId("metric-top-career")).toHaveTextContent("Derecho");
    expect(within(page).getByTestId("analytics-summary-table")).toHaveTextContent("Secretaria Academica UMSS");

    await user.click(within(page).getByRole("button", { name: /^revocados$/i }));
    expect(within(page).getByTestId("metric-total-certificates")).toHaveTextContent("0");
    expect(within(page).getByTestId("analytics-empty-filter")).toHaveTextContent("No hay certificados para esta combinacion");

    await user.click(within(page).getByRole("button", { name: /todas las facultades/i }));
    expect(within(page).getByTestId("metric-total-certificates")).toHaveTextContent("4");
    expect(within(page).getByTestId("metric-revoked-certificates")).toHaveTextContent("4");

    await user.click(within(page).getByRole("button", { name: /ultimos 3 meses/i }));
    expect(within(page).getByTestId("chart-monthly-activity")).toHaveTextContent("Oct");
    expect(within(page).getByTestId("chart-monthly-activity")).not.toHaveTextContent("Ene");

    await user.click(within(page).getByRole("button", { name: /exportar reporte simulado/i }));
    expect(within(page).getByTestId("analytics-export-result")).toHaveTextContent("Reporte simulado generado");
    expect(within(page).getByTestId("analytics-export-result")).toHaveTextContent("Ultimos 3 meses");
    expect(within(page).getByTestId("analytics-export-result")).toHaveTextContent("Revocados");
  });
});

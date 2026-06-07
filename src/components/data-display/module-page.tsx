import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { DataTable } from "@/components/data-display/data-table";
import { Timeline } from "@/components/data-display/timeline";
import { SectionHeader } from "@/components/layout/section-header";
import { EmptyState } from "@/components/ui/empty-state";
import { Progress } from "@/components/ui/progress";
import { StatusBadge } from "@/components/ui/status-badge";
import { Tabs } from "@/components/ui/tabs";
import { ledgerEvents, moduleSnapshots } from "@/data/mock-data";
import type { RouteId } from "@/app/routes";
import { formatDateTime } from "@/lib/formatters";

type ModulePageProps = {
  routeId: Exclude<RouteId, "dashboard">;
};

export function ModulePage({ routeId }: ModulePageProps) {
  const snapshot = moduleSnapshots[routeId];
  const rows = ledgerEvents.slice(0, 3);

  return (
    <div className="grid min-w-0 gap-3">
      <section className="rounded-lg border border-border bg-card p-4 shadow-[inset_0_1px_0_hsl(var(--foreground)/0.035),0_24px_70px_-46px_hsl(var(--shadow-ledger)/1)]">
        <SectionHeader
          description={snapshot.description}
          eyebrow={
            <>
              <Badge intent="info">Modulo activo</Badge>
              <StatusBadge tone="online">Mock chain</StatusBadge>
            </>
          }
          title={snapshot.title}
          action={
            <div className="rounded-md border border-border/55 bg-black/45 p-3">
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground">
                Lectura del sistema
              </p>
              <p className="mt-2 font-mono text-2xl font-semibold text-foreground">
                {snapshot.primaryMetric}
              </p>
            </div>
          }
        />
      </section>

      <Card>
        <CardContent className="grid gap-4 md:grid-cols-[minmax(0,1fr)_16rem]">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-foreground">Contexto operativo</p>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Los registros comparten hash, firma, wallet y eventos de ledger para
              mantener una lectura consistente durante la simulacion distribuida.
            </p>
            <Progress className="mt-4" value={76} />
          </div>
          <div className="rounded-md border border-border/55 bg-black/45 p-4">
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground">
              Estado
            </p>
            <p className="mt-2 text-sm font-semibold text-foreground">
              {snapshot.secondaryMetric}
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <Tabs
            defaultValue="events"
            items={[
              {
                content: (
                  <DataTable
                    columns={[
                      {
                        header: "Certificado",
                        key: "certificate",
                        render: (event) => (
                          <span className="font-mono text-foreground">{event.certificateId}</span>
                        ),
                      },
                      {
                        header: "Detalle",
                        key: "detail",
                        render: (event) => (
                          <span className="text-muted-foreground">{event.detail}</span>
                        ),
                      },
                      {
                        align: "right",
                        header: "Fecha",
                        key: "date",
                        render: (event) => formatDateTime(event.createdAt),
                      },
                    ]}
                    getRowKey={(event) => event.id}
                    rows={rows}
                  />
                ),
                label: "Eventos",
                value: "events",
              },
              {
                content: (
                  <Timeline
                    items={rows.map((event) => ({
                      description: event.detail,
                      id: event.id,
                      meta: event.blockNumber.toLocaleString("es-BO"),
                      title: event.type,
                    }))}
                  />
                ),
                label: "Timeline",
                value: "timeline",
              },
              {
                content: (
                  <EmptyState
                    description="Los datos mock disponibles no registran alertas bloqueantes para esta vista en la sesion actual."
                    title="Sin bloqueos activos"
                  />
                ),
                label: "Siguiente",
                value: "next",
              },
            ]}
          />
        </CardContent>
      </Card>
    </div>
  );
}

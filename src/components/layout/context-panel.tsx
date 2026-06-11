import { Activity, ArrowUpRight, Blocks, ShieldCheck } from "lucide-react";
import { getRouteById } from "@/app/routes";
import { Timeline } from "@/components/data-display/timeline";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { StatusBadge } from "@/components/ui/status-badge";
import { chainNodes } from "@/data/fixture-data";
import { formatLatency } from "@/lib/formatters";
import { getDeploymentByNetwork } from "@/lib/web3/deployments";
import { personaLabel, ROLE_LABELS } from "@/lib/roles";
import { canNavigateToRoute, suggestedActionRoute } from "@/lib/ui-permissions";
import { useAppStore } from "@/store/app-store";

export function ContextPanel() {
  const activeRole = useAppStore((state) => state.activeRole);
  const activePersona = useAppStore((state) => state.activePersona);
  const issuers = useAppStore((state) => state.issuers);
  const students = useAppStore((state) => state.students);
  const verifierEntities = useAppStore((state) => state.verifierEntities);
  const addToast = useAppStore((state) => state.addToast);
  const blockchainEvents = useAppStore((state) => state.blockchainEvents) ?? [];
  const chainConnected = useAppStore((state) => state.chainConnected);
  const currentRouteId = useAppStore((state) => state.currentRouteId);
  const selectedNetwork = useAppStore((state) => state.selectedNetwork);
  const setRoute = useAppStore((state) => state.setRoute);
  const route = getRouteById(currentRouteId);
  const RouteIcon = route.icon;
  const deployment = getDeploymentByNetwork(selectedNetwork);
  const latestBlock = Math.max(0, ...blockchainEvents.map((event) => event.blockNumber));
  const averageLatencyMs = Math.round(
    chainNodes.reduce((sum, node) => sum + node.latencyMs, 0) / chainNodes.length,
  );
  const consensusRate = Math.round(
    (chainNodes.filter((node) => node.status === "synced").length / chainNodes.length) * 100,
  );

  return (
    <aside className="hidden min-w-0 lg:block" data-layout-reveal>
      <div className="sticky top-[3.75rem] grid gap-3">
        <section className="rounded-lg border border-border bg-card p-3 shadow-[inset_0_1px_0_hsl(var(--foreground)/0.035),0_24px_70px_-46px_hsl(var(--shadow-ledger)/1)]">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-foreground">Panel contextual</p>
              <p className="mt-1 text-xs text-muted-foreground">{route.title}</p>
            </div>
            <StatusBadge tone={chainConnected ? "online" : "warning"}>
              {chainConnected ? "On-chain" : "Lectura local"}
            </StatusBadge>
          </div>
          <div className="mt-3 rounded-md border border-border/55 bg-muted/55 p-3">
            <div className="flex items-center gap-2">
              <RouteIcon className="h-4 w-4 text-primary" aria-hidden="true" />
              <p className="text-xs font-semibold text-foreground">{route.shortTitle}</p>
            </div>
            <p className="mt-2 text-xs leading-5 text-muted-foreground">{route.description}</p>
          </div>
        </section>

        <section className="rounded-lg border border-border bg-card p-3 shadow-[inset_0_1px_0_hsl(var(--foreground)/0.035),0_24px_70px_-46px_hsl(var(--shadow-ledger)/1)]">
          <div className="flex items-center gap-2">
            <Blocks className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
            <p className="text-sm font-semibold text-foreground">Red Ethereum</p>
          </div>
          <div className="mt-3 grid gap-2 rounded-md border border-border/55 bg-muted/55 p-3 text-xs">
            <div className="flex items-center justify-between gap-3">
              <span className="text-muted-foreground">Network</span>
              <span className="font-mono text-foreground">{deployment?.chainName ?? selectedNetwork}</span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-muted-foreground">Latencia ref.</span>
              <span className="font-mono text-foreground">{formatLatency(averageLatencyMs)}</span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-muted-foreground">Bloque</span>
              <span className="font-mono text-foreground">
                {latestBlock.toLocaleString("es-BO")}
              </span>
            </div>
            <Progress value={consensusRate} />
          </div>
        </section>

        <section className="rounded-lg border border-border bg-card p-3 shadow-[inset_0_1px_0_hsl(var(--foreground)/0.035),0_24px_70px_-46px_hsl(var(--shadow-ledger)/1)]">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
            <p className="text-sm font-semibold text-foreground">Rol y permisos</p>
          </div>
          <div className="mt-3 rounded-md border border-border/55 bg-muted/55 p-3">
            <p className="text-xs text-muted-foreground">Rol activo</p>
            <p className="mt-1 text-sm font-semibold text-foreground">{ROLE_LABELS[activeRole]}</p>
            <p className="mt-2 text-[11px] text-muted-foreground">Persona activa</p>
            <p className="mt-1 text-xs font-medium text-foreground">
              {personaLabel(activeRole, activePersona, issuers, students, verifierEntities)}
            </p>
          </div>
          {canNavigateToRoute(activeRole, suggestedActionRoute(activeRole)) ? (
            <Button
              className="mt-3 w-full"
              icon={<ArrowUpRight className="h-4 w-4" aria-hidden="true" />}
              onClick={() => {
                setRoute(suggestedActionRoute(activeRole));
                addToast({
                  title: "Accion contextual",
                  description: "La vista cambio segun el rol activo.",
                  intent: "info",
                });
              }}
              variant="secondary"
            >
              Accion sugerida
            </Button>
          ) : null}
        </section>

        <section className="rounded-lg border border-border bg-card p-3 shadow-[inset_0_1px_0_hsl(var(--foreground)/0.035),0_24px_70px_-46px_hsl(var(--shadow-ledger)/1)]">
          <div className="mb-3 flex items-center gap-2">
            <Activity className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
            <p className="text-sm font-semibold text-foreground">Trazabilidad reciente</p>
          </div>
          <Timeline
            items={blockchainEvents.slice(0, 3).map((event) => ({
              description: event.detail,
              id: event.id,
              meta: event.blockNumber.toLocaleString("es-BO"),
              title: event.certificateId ?? event.type,
            }))}
          />
        </section>
      </div>
    </aside>
  );
}

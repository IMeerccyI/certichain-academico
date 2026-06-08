import { Activity, ArrowUpRight, Blocks, ShieldCheck } from "lucide-react";
import { getRouteById } from "@/app/routes";
import { Timeline } from "@/components/data-display/timeline";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { StatusBadge } from "@/components/ui/status-badge";
import { chainNodes, ledgerEvents } from "@/data/mock-data";
import { formatLatency } from "@/lib/formatters";
import { getMockChainHealth } from "@/lib/mock-chain";
import { useAppStore, type ActiveRole } from "@/store/app-store";

const roleLabels: Record<ActiveRole, string> = {
  academic_admin: "Administrador academico",
  authorized_issuer: "Universidad emisora",
  auditor: "Auditor",
  student: "Estudiante",
  public_verifier: "Verificador publico",
};

export function ContextPanel() {
  const activeRole = useAppStore((state) => state.activeRole);
  const addToast = useAppStore((state) => state.addToast);
  const currentRouteId = useAppStore((state) => state.currentRouteId);
  const setRoute = useAppStore((state) => state.setRoute);
  const route = getRouteById(currentRouteId);
  const RouteIcon = route.icon;
  const chainHealth = getMockChainHealth();
  const averageLatencyMs = Math.round(
    chainNodes.reduce((sum, node) => sum + node.latencyMs, 0) / chainNodes.length,
  );
  const consensusRate = Math.round((chainHealth.syncedNodes / chainHealth.totalNodes) * 100);

  return (
    <aside className="hidden min-w-0 lg:block" data-layout-reveal>
      <div className="sticky top-[3.75rem] grid gap-3">
        <section className="rounded-lg border border-border bg-card p-3 shadow-[inset_0_1px_0_hsl(var(--foreground)/0.035),0_24px_70px_-46px_hsl(var(--shadow-ledger)/1)]">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-foreground">Panel contextual</p>
              <p className="mt-1 text-xs text-muted-foreground">{route.title}</p>
            </div>
            <StatusBadge tone="online">Live</StatusBadge>
          </div>
          <div className="mt-3 rounded-md border border-border/55 bg-black/45 p-3">
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
          <div className="mt-3 grid gap-2 rounded-md border border-border/55 bg-black/45 p-3 text-xs">
            <div className="flex items-center justify-between gap-3">
              <span className="text-muted-foreground">Network</span>
              <span className="font-mono text-foreground">Sepolia academica</span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-muted-foreground">Finalidad</span>
              <span className="font-mono text-foreground">{formatLatency(averageLatencyMs)}</span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-muted-foreground">Bloque</span>
              <span className="font-mono text-foreground">
                {chainHealth.latestBlock.toLocaleString("es-BO")}
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
          <div className="mt-3 rounded-md border border-border/55 bg-black/45 p-3">
            <p className="text-xs text-muted-foreground">Rol activo</p>
            <p className="mt-1 text-sm font-semibold text-foreground">{roleLabels[activeRole]}</p>
          </div>
          <Button
            className="mt-3 w-full"
            icon={<ArrowUpRight className="h-4 w-4" aria-hidden="true" />}
            onClick={() => {
              setRoute(
                activeRole === "authorized_issuer" || activeRole === "academic_admin"
                  ? "issue"
                  : "verification",
              );
              addToast({
                title: "Accion contextual",
                description: "La vista cambio segun el rol activo de la demo.",
                intent: "info",
              });
            }}
            variant="secondary"
          >
            Accion sugerida
          </Button>
        </section>

        <section className="rounded-lg border border-border bg-card p-3 shadow-[inset_0_1px_0_hsl(var(--foreground)/0.035),0_24px_70px_-46px_hsl(var(--shadow-ledger)/1)]">
          <div className="mb-3 flex items-center gap-2">
            <Activity className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
            <p className="text-sm font-semibold text-foreground">Trazabilidad reciente</p>
          </div>
          <Timeline
            items={ledgerEvents.slice(0, 3).map((event) => ({
              description: event.detail,
              id: event.id,
              meta: event.blockNumber.toLocaleString("es-BO"),
              title: event.certificateId,
            }))}
          />
        </section>
      </div>
    </aside>
  );
}

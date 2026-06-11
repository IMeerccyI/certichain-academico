import { Bell, ChevronLeft, ChevronRight, Plus, Search } from "lucide-react";
import { getRouteById } from "@/app/routes";
import { Button } from "@/components/ui/button";
import { IconButton } from "@/components/ui/icon-button";
import { Input } from "@/components/ui/input";
import { StatusBadge } from "@/components/ui/status-badge";
import { PersonaSelector } from "@/components/layout/persona-selector";
import { RoleSelector } from "@/components/layout/role-selector";
import { VisualThemeToggle } from "@/components/layout/visual-theme-toggle";
import { WalletStatus } from "@/components/web3/wallet-status";
import { getDeploymentByNetwork, isDeploymentReady } from "@/lib/web3/deployments";
import { useAppStore } from "@/store/app-store";

export function Topbar() {
  const addToast = useAppStore((state) => state.addToast);
  const blockchainEvents = useAppStore((state) => state.blockchainEvents) ?? [];
  const chainConnected = useAppStore((state) => state.chainConnected);
  const currentRouteId = useAppStore((state) => state.currentRouteId);
  const selectedNetwork = useAppStore((state) => state.selectedNetwork);
  const setRoute = useAppStore((state) => state.setRoute);
  const route = getRouteById(currentRouteId);
  const deployment = getDeploymentByNetwork(selectedNetwork);
  const latestBlock = Math.max(0, ...blockchainEvents.map((event) => event.blockNumber));
  const networkLabel = deployment?.chainName ?? selectedNetwork;
  const contractLabel = chainConnected
    ? "contrato conectado"
    : isDeploymentReady(deployment)
      ? "contrato disponible"
      : "contrato pendiente";

  return (
    <header className="flex min-h-12 flex-col gap-2 border-b border-border bg-background/95 px-3 py-1.5 backdrop-blur md:flex-row md:items-center md:justify-between lg:px-4">
      <div className="flex min-w-0 items-center gap-2">
        <IconButton
          icon={<ChevronLeft className="h-4 w-4" aria-hidden="true" />}
          label="Volver"
          onClick={() =>
            addToast({
              title: "Navegacion local",
              description: "Usa el menu lateral para moverte entre las pantallas de la DApp.",
              intent: "info",
            })
          }
        />
        <IconButton
          icon={<ChevronRight className="h-4 w-4" aria-hidden="true" />}
          label="Avanzar"
          onClick={() =>
            addToast({
              title: "Navegacion local",
              description: "La DApp mantiene el estado actual mientras cambias de modulo.",
              intent: "info",
            })
          }
        />
        <div className="hidden min-w-0 items-center gap-2 text-sm text-muted-foreground sm:flex">
          <span>CertiChain</span>
          <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
          <span className="truncate font-medium text-foreground">{route.title}</span>
        </div>
        <span className="rounded-md border border-border bg-secondary px-2 py-1 font-mono text-[11px] text-muted-foreground sm:hidden">
          Block {latestBlock.toLocaleString("es-BO")}
        </span>
      </div>
      <div className="flex flex-wrap items-center justify-end gap-2">
        <StatusBadge className="hidden lg:inline-flex" tone={chainConnected ? "online" : "warning"}>
          {networkLabel} / {contractLabel}
        </StatusBadge>
        <RoleSelector />
        <PersonaSelector />
        <label className="hidden min-w-[15rem] items-center gap-2 rounded-md border border-border/80 bg-secondary px-3 text-xs text-muted-foreground shadow-[inset_0_1px_0_hsl(var(--foreground)/0.035)] 2xl:flex">
          <Search className="h-4 w-4" aria-hidden="true" />
          <span className="sr-only">Buscar</span>
          <Input
            className="h-7 border-0 bg-transparent px-0 shadow-none focus:ring-0"
            placeholder="Buscar hash, estudiante o tx..."
            type="search"
          />
        </label>
        <IconButton
          icon={<Bell className="h-4 w-4" aria-hidden="true" />}
          label="Notificaciones"
          onClick={() =>
            addToast({
              title: "Notificaciones",
              description: "No hay alertas pendientes en la sesion actual.",
              intent: "success",
            })
          }
        />
        <VisualThemeToggle />
        <Button
          className="hidden md:inline-flex"
          icon={<Plus className="h-4 w-4" aria-hidden="true" />}
          onClick={() => {
            setRoute("issue");
            addToast({
              title: "Nuevo certificado",
              description: "Abri el flujo de emision para cargar PDF y firmar con MetaMask.",
              intent: "info",
            });
          }}
          title="Acciones rapidas"
        >
          Emitir
        </Button>
        <div className="hidden lg:block">
          <WalletStatus />
        </div>
      </div>
    </header>
  );
}

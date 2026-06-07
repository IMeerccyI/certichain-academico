import { Bell, ChevronLeft, ChevronRight, Plus, Search } from "lucide-react";
import { getRouteById } from "@/app/routes";
import { Button } from "@/components/ui/button";
import { IconButton } from "@/components/ui/icon-button";
import { Input } from "@/components/ui/input";
import { StatusBadge } from "@/components/ui/status-badge";
import { RoleSelector } from "@/components/layout/role-selector";
import { WalletStatus } from "@/components/web3/wallet-status";
import { getMockChainHealth } from "@/lib/mock-chain";
import { useAppStore } from "@/store/app-store";

export function Topbar() {
  const chainHealth = getMockChainHealth();
  const addToast = useAppStore((state) => state.addToast);
  const currentRouteId = useAppStore((state) => state.currentRouteId);
  const route = getRouteById(currentRouteId);

  return (
    <header className="flex min-h-12 flex-col gap-2 border-b border-border bg-background/95 px-3 py-1.5 backdrop-blur md:flex-row md:items-center md:justify-between lg:px-4">
      <div className="flex min-w-0 items-center gap-2">
        <IconButton
          icon={<ChevronLeft className="h-4 w-4" aria-hidden="true" />}
          label="Volver"
          onClick={() =>
            addToast({
              title: "Navigation",
              description: "Back navigation is simulated in this single-page mockup.",
              intent: "info",
            })
          }
        />
        <IconButton
          icon={<ChevronRight className="h-4 w-4" aria-hidden="true" />}
          label="Avanzar"
          onClick={() =>
            addToast({
              title: "Navigation",
              description: "Forward navigation is simulated in this single-page mockup.",
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
          Block {chainHealth.latestBlock.toLocaleString("es-BO")}
        </span>
      </div>
      <div className="flex flex-wrap items-center justify-end gap-2">
        <StatusBadge className="hidden lg:inline-flex" tone="online">
          ETH {chainHealth.consensusLabel}
        </StatusBadge>
        <RoleSelector />
        <label className="hidden min-w-[15rem] items-center gap-2 rounded-md border border-border/80 bg-secondary px-3 text-xs text-muted-foreground shadow-[inset_0_1px_0_hsl(var(--foreground)/0.035)] 2xl:flex">
          <Search className="h-4 w-4" aria-hidden="true" />
          <span className="sr-only">Buscar</span>
          <Input
            className="h-7 border-0 bg-transparent px-0 shadow-none focus:ring-0"
            placeholder="Search hash, student, tx..."
            type="search"
          />
        </label>
        <IconButton
          icon={<Bell className="h-4 w-4" aria-hidden="true" />}
          label="Notificaciones"
          onClick={() =>
            addToast({
              title: "Notifications",
              description: "No pending alerts in the current demo session.",
              intent: "success",
            })
          }
        />
        <Button
          className="hidden md:inline-flex"
          icon={<Plus className="h-4 w-4" aria-hidden="true" />}
          onClick={() =>
            addToast({
              title: "New flow",
              description: "Use Issue flow on the dashboard to simulate a new certificate.",
              intent: "info",
            })
          }
          title="Acciones rapidas"
        >
          New Flow
        </Button>
        <div className="hidden lg:block">
          <WalletStatus />
        </div>
      </div>
    </header>
  );
}

import { Boxes, CircleUserRound, Settings2 } from "lucide-react";
import { routes } from "@/app/routes";
import { cn } from "@/lib/cn";
import { useAppStore } from "@/store/app-store";

export function Sidebar() {
  const currentRouteId = useAppStore((state) => state.currentRouteId);
  const setRoute = useAppStore((state) => state.setRoute);
  const sidebarExpanded = useAppStore((state) => state.sidebarExpanded);
  const sidebarPinned = useAppStore((state) => state.sidebarPinned);
  const setSidebarExpanded = useAppStore((state) => state.setSidebarExpanded);
  const toggleSidebarPinned = useAppStore((state) => state.toggleSidebarPinned);

  const collapseSidebar = () => {
    if (!sidebarPinned) {
      setSidebarExpanded(false);
    }
  };

  return (
    <aside
      data-shell-sidebar
      className={cn(
        "hidden max-w-full overflow-hidden border-b border-border bg-background px-2 py-2 lg:flex lg:min-h-screen lg:flex-col lg:border-b-0 lg:border-r lg:transition-all lg:duration-300 lg:ease-out",
        sidebarExpanded ? "lg:items-stretch lg:px-2.5" : "lg:items-center lg:px-0",
      )}
      onBlurCapture={(event) => {
        const nextTarget = event.relatedTarget;

        if (!(nextTarget instanceof Node) || !event.currentTarget.contains(nextTarget)) {
          collapseSidebar();
        }
      }}
      onFocusCapture={() => setSidebarExpanded(true)}
      onMouseEnter={() => setSidebarExpanded(true)}
      onMouseLeave={collapseSidebar}
    >
      <div
        className={cn(
          "flex items-center justify-between gap-3 lg:flex lg:h-9 lg:w-full",
          sidebarExpanded ? "lg:justify-start" : "lg:justify-center",
        )}
      >
        <button
          className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-border bg-foreground text-background shadow-ledger transition-colors hover:bg-foreground/90 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/25 lg:h-9 lg:w-9"
          aria-pressed={sidebarPinned}
          onClick={() => {
            if (window.matchMedia("(min-width: 1024px)").matches) {
              toggleSidebarPinned();
              return;
            }

            setRoute("dashboard");
          }}
          title={sidebarPinned ? "Contraer navegacion" : "Expandir navegacion"}
          type="button"
        >
          <Boxes className="h-4 w-4" aria-hidden="true" />
          <span className="sr-only">
            {sidebarPinned ? "Contraer navegacion" : "Expandir navegacion"}
          </span>
        </button>
        <div
          className={cn(
            "hidden min-w-0 leading-tight opacity-0 transition-opacity duration-200",
            sidebarExpanded && "lg:block lg:opacity-100",
          )}
        >
          <p className="truncate text-sm font-semibold text-foreground">CertiChain</p>
          <p className="truncate font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
            Demo Web3
          </p>
        </div>
        <span className="rounded-md border border-border bg-secondary px-2 py-1 font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground lg:hidden">
          Demo Web3
        </span>
      </div>

      <nav aria-label="Navegacion principal" className="mt-3 lg:mt-8 lg:w-full">
        <div
          className={cn(
            "flex w-full max-w-full gap-2 overflow-x-auto pb-2 lg:grid lg:overflow-visible lg:pb-0",
            sidebarExpanded ? "lg:justify-items-stretch" : "lg:justify-items-center",
          )}
        >
          {routes.map((route) => {
            const Icon = route.icon;
            const active = currentRouteId === route.id;

            return (
              <button
                className={cn(
                  "group flex min-w-max items-center gap-2 rounded-md px-3 py-2 text-left text-xs font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/25 lg:h-9 lg:min-w-0",
                  sidebarExpanded
                    ? "lg:w-full lg:justify-start lg:px-3"
                    : "lg:w-8 lg:justify-center lg:px-0",
                  active
                    ? "bg-secondary text-foreground shadow-[inset_0_1px_0_hsl(var(--foreground)/0.04),0_14px_32px_-26px_hsl(var(--shadow-ledger)/1)] ring-1 ring-border"
                    : "text-muted-foreground hover:bg-secondary hover:text-foreground",
                )}
                key={route.id}
                onClick={() => setRoute(route.id)}
                title={route.title}
                type="button"
              >
                <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                <span
                  className={cn(
                    "truncate",
                    sidebarExpanded ? "lg:not-sr-only lg:inline" : "lg:sr-only",
                  )}
                >
                  {route.title}
                </span>
              </button>
            );
          })}
        </div>
      </nav>

      <div
        className={cn(
          "mt-auto hidden gap-2 pb-3 lg:grid",
          sidebarExpanded ? "lg:justify-items-stretch" : "lg:justify-items-center",
        )}
      >
        <button
          className={cn(
            "flex h-9 items-center gap-2 rounded-md text-xs font-medium text-muted-foreground transition-all hover:bg-secondary hover:text-foreground",
            sidebarExpanded
              ? "w-full justify-start px-3"
              : "w-9 justify-center px-0",
          )}
          onClick={() => setRoute("settings")}
          title="Configuracion"
          type="button"
        >
          <Settings2 className="h-4 w-4" aria-hidden="true" />
          <span
            className={cn(
              "truncate",
              sidebarExpanded ? "lg:not-sr-only lg:inline" : "lg:sr-only",
            )}
          >
            Configuracion
          </span>
        </button>
        <span
          className={cn(
            "flex h-9 items-center gap-2 rounded-md text-xs font-medium text-muted-foreground",
            sidebarExpanded ? "w-full justify-start px-3" : "w-9 justify-center px-0",
          )}
        >
          <CircleUserRound className="h-4 w-4" aria-hidden="true" />
          <span
            className={cn(
              "truncate",
              sidebarExpanded ? "lg:not-sr-only lg:inline" : "lg:sr-only",
            )}
          >
            Demo user
          </span>
        </span>
      </div>
    </aside>
  );
}

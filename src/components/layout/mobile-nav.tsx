import { routes } from "@/app/routes";
import { cn } from "@/lib/cn";
import { useAppStore } from "@/store/app-store";

export function MobileNav() {
  const currentRouteId = useAppStore((state) => state.currentRouteId);
  const setRoute = useAppStore((state) => state.setRoute);

  return (
    <nav
      aria-label="Navegacion movil"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 px-2 py-2 backdrop-blur lg:hidden"
    >
      <div className="flex gap-2 overflow-x-auto pb-1">
        {routes.map((route) => {
          const Icon = route.icon;
          const active = currentRouteId === route.id;

          return (
            <button
              className={cn(
                "flex min-w-[4.75rem] flex-col items-center justify-center gap-1 rounded-md border px-2 py-2 text-[10px] font-semibold transition-colors",
                active
                  ? "border-border bg-secondary text-foreground shadow-[inset_0_1px_0_hsl(var(--foreground)/0.04)]"
                  : "border-transparent text-muted-foreground hover:border-border/70 hover:bg-secondary hover:text-foreground",
              )}
              key={route.id}
              onClick={() => setRoute(route.id)}
              type="button"
            >
              <Icon className="h-4 w-4" aria-hidden="true" />
              <span className="max-w-full truncate">{route.shortTitle}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}

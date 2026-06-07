import { create } from "zustand";
import type { RouteId } from "@/app/routes";
import type { AppToast } from "@/types/domain";

type WalletState = {
  connected: boolean;
  address: string;
  network: string;
  balanceEth: number;
};

export type ActiveRole = "issuer" | "student" | "verifier" | "auditor";

type AppStore = {
  currentRouteId: RouteId;
  activeRole: ActiveRole;
  sidebarExpanded: boolean;
  sidebarPinned: boolean;
  wallet: WalletState;
  toasts: AppToast[];
  setRoute: (routeId: RouteId) => void;
  setActiveRole: (role: ActiveRole) => void;
  setSidebarExpanded: (expanded: boolean) => void;
  toggleSidebarPinned: () => void;
  connectWallet: () => void;
  disconnectWallet: () => void;
  addToast: (toast: Omit<AppToast, "id">) => void;
  removeToast: (toastId: string) => void;
};

const defaultWallet: WalletState = {
  connected: false,
  address: "0x6a9E5E7f42aB0061E9dD73461bA7C2382D0A5294",
  network: "Ethereum Sepolia academica",
  balanceEth: 4.28,
};

let toastIndex = 0;

export const useAppStore = create<AppStore>((set) => ({
  currentRouteId: "dashboard",
  activeRole: "issuer",
  sidebarExpanded: false,
  sidebarPinned: false,
  wallet: defaultWallet,
  toasts: [],
  setRoute: (routeId) => set({ currentRouteId: routeId }),
  setActiveRole: (role) =>
    set((state) => ({
      activeRole: role,
      toasts: [
        ...state.toasts,
        {
          id: `toast-${toastIndex += 1}`,
          title: "Rol activo actualizado",
          description: "La simulacion ajusto permisos y lectura contextual.",
          intent: "info",
        },
      ],
    })),
  setSidebarExpanded: (expanded) => set({ sidebarExpanded: expanded }),
  toggleSidebarPinned: () =>
    set((state) => {
      const nextPinned = !state.sidebarPinned;

      return {
        sidebarExpanded: nextPinned,
        sidebarPinned: nextPinned,
      };
    }),
  connectWallet: () =>
    set((state) => ({
      wallet: { ...state.wallet, connected: true },
      toasts: [
        ...state.toasts,
        {
          id: `toast-${toastIndex += 1}`,
          title: "Wallet conectada",
          description: "Sesion Web3 simulada para la defensa academica.",
          intent: "success",
        },
      ],
    })),
  disconnectWallet: () =>
    set((state) => ({
      wallet: { ...state.wallet, connected: false },
      toasts: [
        ...state.toasts,
        {
          id: `toast-${toastIndex += 1}`,
          title: "Wallet desconectada",
          description: "La demo queda en modo solo lectura.",
          intent: "info",
        },
      ],
    })),
  addToast: (toast) =>
    set((state) => ({
      toasts: [
        ...state.toasts,
        {
          ...toast,
          id: `toast-${toastIndex += 1}`,
        },
      ],
    })),
  removeToast: (toastId) =>
    set((state) => ({
      toasts: state.toasts.filter((toast) => toast.id !== toastId),
    })),
}));

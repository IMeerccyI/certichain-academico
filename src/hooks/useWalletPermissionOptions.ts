import { useAppStore } from "@/store/app-store";

export function useWalletPermissionOptions() {
  const activePersona = useAppStore((state) => state.activePersona);
  const wallet = useAppStore((state) => state.wallet);

  return {
    persona: activePersona,
    walletAddress: wallet.connected ? wallet.address : undefined,
    requireWallet: wallet.connected,
  };
}
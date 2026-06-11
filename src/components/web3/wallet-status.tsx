import { useState } from "react";
import { Loader2, LogOut, PlugZap, WalletCards } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { shortenHash } from "@/lib/hash";
import { useAppStore } from "@/store/app-store";

export function WalletStatus() {
  const wallet = useAppStore((state) => state.wallet);
  const connectWallet = useAppStore((state) => state.connectWallet);
  const disconnectWallet = useAppStore((state) => state.disconnectWallet);
  const [connecting, setConnecting] = useState(false);

  const handleConnect = async () => {
    setConnecting(true);
    try {
      await connectWallet();
    } finally {
      setConnecting(false);
    }
  };

  if (!wallet.connected) {
    return (
      <Button
        className="rounded-md border-foreground/30 px-3"
        disabled={connecting}
        icon={
          connecting ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          ) : (
            <PlugZap className="h-4 w-4" aria-hidden="true" />
          )
        }
        onClick={() => void handleConnect()}
      >
        {connecting ? "Conectando..." : "Conectar wallet"}
      </Button>
    );
  }

  return (
    <div className="flex min-h-8 items-center gap-2 rounded-md border border-border/80 bg-secondary px-3 py-1.5 shadow-[inset_0_1px_0_hsl(var(--foreground)/0.04),0_12px_28px_-24px_hsl(var(--shadow-ledger)/0.9)]">
      <div className="hidden sm:block">
        <Badge intent={wallet.isContractReady ? "success" : "warning"}>
          {wallet.isContractReady ? "Wallet activa" : "Red pendiente"}
        </Badge>
      </div>
      <WalletCards className="h-4 w-4 text-primary" aria-hidden="true" />
      <span className="font-mono text-xs font-semibold text-foreground">
        {shortenHash(wallet.address, 6)}
      </span>
      <Button
        aria-label="Desconectar wallet"
        className="min-h-7 px-2"
        icon={<LogOut className="h-4 w-4" aria-hidden="true" />}
        onClick={disconnectWallet}
        variant="ghost"
      />
    </div>
  );
}
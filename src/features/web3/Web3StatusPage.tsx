import { useMemo, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  CircleOff,
  Clipboard,
  Code2,
  Database,
  FileSignature,
  Gauge,
  KeyRound,
  Network,
  PlugZap,
  ShieldCheck,
  WalletCards,
} from "lucide-react";
import { HashChip } from "@/components/data-display/hash-chip";
import { MotionPage } from "@/components/motion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { StatusBadge } from "@/components/ui/status-badge";
import { formatEth } from "@/lib/formatters";
import { shortenHash } from "@/lib/hash";
import { cn } from "@/lib/cn";
import {
  getDeploymentByNetwork,
  isDeploymentReady,
  type RuntimeDeployment,
} from "@/lib/web3/deployments";
import { extraerMensajeError, hasMetaMask, signMessageWithWallet } from "@/lib/web3/service";
import { useAppStore } from "@/store/app-store";
import type { NetworkType } from "@/types/domain";

type AbiFunction = {
  inputs?: readonly { type: string }[];
  name?: string;
  stateMutability?: string;
  type?: string;
};

const networkOptions: NetworkType[] = ["hardhat", "ganache", "sepolia"];

const featuredMethods = [
  "emitirCertificado",
  "verificarCertificado",
  "revocarCertificado",
  "consultarHistorial",
  "autorizarEmisor",
  "desactivarEmisor",
  "firmarRecepcion",
  "ownerOf",
  "tokenURI",
];

function InfoTile({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-border/55 bg-muted/45 p-3 shadow-[inset_0_1px_0_hsl(var(--foreground)/0.035)]">
      <div className="flex items-center gap-2 text-muted-foreground">
        {icon}
        <p className="text-xs">{label}</p>
      </div>
      <div className="mt-2 min-w-0 font-mono text-sm font-semibold text-foreground">{value}</div>
    </div>
  );
}

function deploymentTone(deployment: RuntimeDeployment | undefined) {
  return isDeploymentReady(deployment) ? "online" : "warning";
}

function deploymentLabel(deployment: RuntimeDeployment | undefined) {
  return isDeploymentReady(deployment) ? "desplegado" : "pendiente";
}

function methodSignature(method: AbiFunction) {
  const params = method.inputs?.map((input) => input.type).join(", ") ?? "";
  return `${method.name ?? "method"}(${params})`;
}

function getFeaturedAbiMethods(deployment: RuntimeDeployment | undefined) {
  const abi = (deployment?.abi ?? []) as readonly AbiFunction[];
  const methods = abi.filter(
    (fragment) =>
      typeof fragment === "object" &&
      fragment !== null &&
      fragment.type === "function" &&
      Boolean(fragment.name),
  );

  return featuredMethods.flatMap((name) => {
    const method = methods.find((item) => item.name === name);
    return method ? [method] : [];
  });
}

function getContractAddress(
  walletAddress: string | undefined,
  selectedDeployment: RuntimeDeployment | undefined,
) {
  if (walletAddress && /^0x[a-fA-F0-9]{40}$/.test(walletAddress)) {
    return walletAddress;
  }
  return isDeploymentReady(selectedDeployment) ? selectedDeployment.address : "";
}

export function Web3StatusPage() {
  const wallet = useAppStore((state) => state.wallet);
  const selectedNetwork = useAppStore((state) => state.selectedNetwork);
  const connectWallet = useAppStore((state) => state.connectWallet);
  const disconnectWallet = useAppStore((state) => state.disconnectWallet);
  const switchNetwork = useAppStore((state) => state.switchNetwork);
  const addToast = useAppStore((state) => state.addToast);
  const [connecting, setConnecting] = useState(false);
  const [signature, setSignature] = useState<string | null>(null);
  const [signatureError, setSignatureError] = useState<string | null>(null);

  const selectedDeployment = getDeploymentByNetwork(selectedNetwork);
  const contractAddress = getContractAddress(wallet.contractAddress, selectedDeployment);
  const metaMaskAvailable = hasMetaMask();
  const contractReady = isDeploymentReady(selectedDeployment);
  const abiMethods = getFeaturedAbiMethods(selectedDeployment);
  const abiFragmentCount = selectedDeployment?.abi.length ?? 0;

  const status = useMemo(() => {
    if (connecting) {
      return {
        badge: "Conectando",
        description: "MetaMask esta solicitando permisos de cuenta.",
        label: "Conectando",
        progress: 58,
        tone: "syncing" as const,
      };
    }

    if (!wallet.connected) {
      return {
        badge: "Desconectado",
        description: metaMaskAvailable
          ? "MetaMask esta disponible; conecta una cuenta para firmar transacciones."
          : "MetaMask no esta disponible en este navegador.",
        label: "Desconectado",
        progress: metaMaskAvailable ? 36 : 20,
        tone: "offline" as const,
      };
    }

    if (!wallet.isSupportedNetwork) {
      return {
        badge: "Red no soportada",
        description: "Cambia a Hardhat Local, Ganache Local o Sepolia Testnet.",
        label: "Red no soportada",
        progress: 42,
        tone: "warning" as const,
      };
    }

    if (!wallet.isContractReady) {
      return {
        badge: "Contrato pendiente",
        description: "La wallet esta conectada, pero no hay contrato desplegado para esta red.",
        label: "Contrato pendiente",
        progress: 66,
        tone: "warning" as const,
      };
    }

    return {
      badge: "Conectado",
      description: "Wallet y contrato real listos para operar.",
      label: "Conectado",
      progress: 100,
      tone: "online" as const,
    };
  }, [connecting, metaMaskAvailable, wallet.connected, wallet.isContractReady, wallet.isSupportedNetwork]);

  const connect = async () => {
    setConnecting(true);
    setSignatureError(null);
    try {
      await connectWallet();
    } finally {
      setConnecting(false);
    }
  };

  const changeNetwork = (networkId: NetworkType) => {
    switchNetwork(networkId);
    setSignature(null);
    setSignatureError(null);
  };

  const signMessage = async () => {
    if (!wallet.connected) {
      const message = "Conecta MetaMask para firmar.";
      setSignatureError(message);
      addToast({
        title: "Firma no disponible",
        description: message,
        intent: "warning",
      });
      return;
    }

    try {
      setSignatureError(null);
      const value = await signMessageWithWallet(
        `CertiChain Academico | ${selectedNetwork} | ${new Date().toISOString()}`,
      );
      setSignature(value);
      addToast({
        title: "Mensaje firmado",
        description: shortenHash(value, 12),
        intent: "success",
      });
    } catch (error) {
      const message = extraerMensajeError(error);
      setSignatureError(message);
      addToast({
        title: "Firma rechazada",
        description: message,
        intent: "error",
      });
    }
  };

  const copyValue = async (value: string, label: string, missingTitle: string) => {
    if (!value) {
      addToast({
        title: missingTitle,
        description: "No hay una direccion real disponible para copiar.",
        intent: "warning",
      });
      return;
    }

    await window.navigator.clipboard?.writeText(value);
    addToast({
      title: `${label} copiada`,
      description: shortenHash(value, 12),
      intent: "info",
    });
  };

  return (
    <div className="min-w-0">
      <MotionPage className="grid min-w-0 gap-3" data-testid="web3-console">
        <section className="grid min-w-0 gap-3 xl:grid-cols-[minmax(0,1.1fr)_minmax(22rem,0.8fr)]">
          <Card className="overflow-hidden">
            <CardContent className="grid gap-5 p-4 lg:grid-cols-[minmax(0,1fr)_18rem] lg:p-5">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge intent="info">MetaMask</Badge>
                  <StatusBadge tone={status.tone}>{status.badge}</StatusBadge>
                  <StatusBadge tone={contractReady ? "online" : "warning"}>
                    Contrato {contractReady ? "detectado" : "pendiente"}
                  </StatusBadge>
                </div>
                <h1 className="mt-4 text-3xl font-semibold leading-tight text-foreground">
                  Conexion Web3
                </h1>
                <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
                  Consola de conexion para MetaMask, red Ethereum seleccionada y contrato
                  CertificadoAcademico desplegado.
                </p>
                <div className="mt-5 flex flex-wrap gap-2">
                  {!wallet.connected ? (
                    <Button
                      aria-label="Conectar MetaMask"
                      disabled={connecting}
                      icon={<PlugZap className="h-4 w-4" aria-hidden="true" />}
                      onClick={connect}
                    >
                      {connecting ? "Conectando" : "Conectar MetaMask"}
                    </Button>
                  ) : (
                    <Button
                      aria-label="Desconectar wallet"
                      icon={<CircleOff className="h-4 w-4" aria-hidden="true" />}
                      onClick={disconnectWallet}
                      variant="secondary"
                    >
                      Desconectar wallet
                    </Button>
                  )}
                  <Button
                    aria-label="Firmar mensaje"
                    icon={<FileSignature className="h-4 w-4" aria-hidden="true" />}
                    onClick={signMessage}
                    variant="secondary"
                  >
                    Firmar mensaje
                  </Button>
                </div>
              </div>

              <div className="rounded-lg border border-border/60 bg-muted/55 p-3 shadow-[inset_0_1px_0_hsl(var(--foreground)/0.035)]">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs text-muted-foreground">Estado actual</p>
                    <p className="mt-2 text-lg font-semibold text-foreground">{status.label}</p>
                  </div>
                  <span
                    className={cn(
                      "grid h-10 w-10 place-items-center rounded-lg border border-border bg-secondary",
                      status.tone === "online" && "border-success/30 bg-success/10 text-success",
                      status.tone === "warning" && "border-warning/35 bg-warning/10 text-warning",
                    )}
                  >
                    {status.tone === "warning" ? (
                      <AlertTriangle className="h-5 w-5" aria-hidden="true" />
                    ) : wallet.connected ? (
                      <CheckCircle2 className="h-5 w-5" aria-hidden="true" />
                    ) : (
                      <WalletCards className="h-5 w-5" aria-hidden="true" />
                    )}
                  </span>
                </div>
                <p className="mt-3 text-xs leading-5 text-muted-foreground">{status.description}</p>
                <Progress
                  className="mt-4"
                  indicatorClassName={cn(
                    status.tone === "online" && "bg-success",
                    status.tone === "warning" && "bg-warning",
                    status.tone === "offline" && "bg-destructive",
                  )}
                  value={status.progress}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <p className="text-sm font-semibold text-foreground">Redes configuradas</p>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">
                El selector usa el registry local de deployments por chainId.
              </p>
            </CardHeader>
            <CardContent className="grid gap-2">
              {networkOptions.map((networkId) => {
                const deployment = getDeploymentByNetwork(networkId);
                const isActive = selectedNetwork === networkId;

                return (
                  <button
                    aria-label={`Cambiar red a ${deployment?.chainName ?? networkId}`}
                    className={cn(
                      "grid w-full grid-cols-[1fr_auto] items-center gap-3 rounded-lg border border-border/55 bg-muted/45 p-3 text-left transition-colors hover:border-foreground/25 hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/25",
                      isActive && "border-primary/35 bg-primary/10",
                    )}
                    key={networkId}
                    onClick={() => changeNetwork(networkId)}
                    type="button"
                  >
                    <span className="min-w-0">
                      <span className="block text-sm font-semibold text-foreground">
                        {deployment?.chainName ?? networkId}
                      </span>
                      <span className="mt-1 block truncate font-mono text-[11px] text-muted-foreground">
                        chainId {deployment?.chainId ?? "?"} | {deployment?.rpcUrl || "RPC pendiente"}
                      </span>
                    </span>
                    <StatusBadge tone={isActive ? "online" : deploymentTone(deployment)}>
                      {isActive ? "activa" : deploymentLabel(deployment)}
                    </StatusBadge>
                  </button>
                );
              })}
            </CardContent>
          </Card>
        </section>

        <section className="grid min-w-0 gap-3 md:grid-cols-2 xl:grid-cols-4">
          <InfoTile
            icon={<WalletCards className="h-4 w-4" aria-hidden="true" />}
            label="Wallet address"
            value={
              <span className="inline-flex min-w-0 items-center gap-2">
                <span className="truncate">
                  {wallet.address ? shortenHash(wallet.address, 8) : "Sin wallet conectada"}
                </span>
                <Button
                  aria-label="Copiar direccion wallet"
                  className="min-h-0 rounded p-1"
                  icon={<Clipboard className="h-3.5 w-3.5" aria-hidden="true" />}
                  onClick={() => copyValue(wallet.address, "Direccion wallet", "Sin wallet conectada")}
                  variant="ghost"
                />
              </span>
            }
          />
          <InfoTile
            icon={<Gauge className="h-4 w-4" aria-hidden="true" />}
            label="Balance ETH"
            value={formatEth(wallet.balanceEth)}
          />
          <InfoTile
            icon={<Network className="h-4 w-4" aria-hidden="true" />}
            label="Red seleccionada"
            value={selectedDeployment?.chainName ?? selectedNetwork}
          />
          <InfoTile
            icon={<KeyRound className="h-4 w-4" aria-hidden="true" />}
            label="Chain ID"
            value={wallet.chainId ?? selectedDeployment?.chainId ?? "?"}
          />
          <InfoTile
            icon={<Database className="h-4 w-4" aria-hidden="true" />}
            label="Direccion del smart contract"
            value={
              <span className="inline-flex min-w-0 items-center gap-2">
                <span className="truncate">
                  {contractAddress ? shortenHash(contractAddress, 8) : "Sin despliegue"}
                </span>
                <Button
                  aria-label="Copiar direccion de contrato"
                  className="min-h-0 rounded p-1"
                  icon={<Clipboard className="h-3.5 w-3.5" aria-hidden="true" />}
                  onClick={() =>
                    copyValue(contractAddress, "Direccion de contrato", "Contrato no desplegado")
                  }
                  variant="ghost"
                />
              </span>
            }
          />
          <InfoTile
            icon={<ShieldCheck className="h-4 w-4" aria-hidden="true" />}
            label="Contrato desplegado"
            value={contractReady ? "Detectado" : "Pendiente"}
          />
          <InfoTile
            icon={<PlugZap className="h-4 w-4" aria-hidden="true" />}
            label="Estado de MetaMask"
            value={metaMaskAvailable ? "Disponible" : "No detectado"}
          />
          <InfoTile
            icon={<Code2 className="h-4 w-4" aria-hidden="true" />}
            label="ABI"
            value={`${abiFragmentCount} fragments`}
          />
        </section>

        <section className="grid min-w-0 gap-3 xl:grid-cols-[minmax(0,0.72fr)_minmax(0,1fr)]">
          <Card>
            <CardHeader>
              <p className="text-sm font-semibold text-foreground">Firma de mensaje</p>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">
                La firma se solicita desde la wallet conectada mediante EIP-191.
              </p>
            </CardHeader>
            <CardContent>
              <div className="rounded-lg border border-border/55 bg-muted/55 p-4">
                <div className="flex items-center gap-2">
                  <Code2 className="h-4 w-4 text-primary" aria-hidden="true" />
                  <p className="font-mono text-xs text-muted-foreground">
                    CertiChain solicita firma para operar con el contrato academico.
                  </p>
                </div>
                {signature ? (
                  <div className="mt-4 rounded-md border border-success/25 bg-success/10 p-3">
                    <p className="text-xs font-semibold text-success">Firma generada</p>
                    <p className="mt-2 break-all font-mono text-xs text-foreground">{signature}</p>
                  </div>
                ) : signatureError ? (
                  <div className="mt-4 rounded-md border border-warning/30 bg-warning/10 p-3">
                    <p className="text-xs font-semibold text-warning">{signatureError}</p>
                  </div>
                ) : (
                  <p className="mt-4 text-xs leading-5 text-muted-foreground">
                    Conecta MetaMask para firmar.
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <p className="text-sm font-semibold text-foreground">Panel tecnico</p>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">
                ABI y direccion cargadas desde el deployment activo.
              </p>
            </CardHeader>
            <CardContent className="grid gap-3">
              <div className="rounded-lg border border-border/55 bg-muted/50 p-3">
                <p className="text-xs text-muted-foreground">Contrato</p>
                <div className="mt-2">
                  {contractAddress ? (
                    <HashChip hash={contractAddress} size={9} />
                  ) : (
                    <span className="font-mono text-xs text-muted-foreground">
                      Sin direccion para {selectedDeployment?.chainName ?? selectedNetwork}
                    </span>
                  )}
                </div>
              </div>
              <div className="grid gap-2">
                {abiMethods.map((method) => (
                  <div
                    className="grid grid-cols-[1fr_auto] items-center gap-3 rounded-lg border border-border/45 bg-muted/45 px-3 py-2"
                    key={methodSignature(method)}
                  >
                    <div className="min-w-0">
                      <p className="font-mono text-xs font-semibold text-foreground">
                        {method.name}()
                      </p>
                      <p className="mt-1 truncate font-mono text-[11px] text-muted-foreground">
                        {methodSignature(method)}
                      </p>
                    </div>
                    <span className="rounded-md border border-border bg-secondary px-2 py-1 font-mono text-[11px] text-muted-foreground">
                      {method.stateMutability ?? "call"}
                    </span>
                  </div>
                ))}
              </div>
              <details className="group rounded-lg border border-border/55 bg-muted/50 p-3 open:bg-muted/60">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-sm font-semibold text-foreground">
                  ABI resumida
                  <span className="rounded-md border border-border bg-secondary px-2 py-1 font-mono text-[11px] text-muted-foreground">
                    {abiFragmentCount} fragments
                  </span>
                </summary>
                <pre className="mt-3 max-h-64 overflow-auto rounded-md border border-border/60 bg-muted/65 p-3 text-[11px] leading-5 text-muted-foreground">
                  {JSON.stringify(abiMethods.map((method) => methodSignature(method)), null, 2)}
                </pre>
              </details>
            </CardContent>
          </Card>
        </section>
      </MotionPage>
    </div>
  );
}

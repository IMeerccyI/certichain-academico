import { useEffect, useMemo, useRef, useState } from "react";
import { useGSAP } from "@gsap/react";
import { gsap } from "gsap";
import {
  AlertTriangle,
  CheckCircle2,
  CircleOff,
  Clipboard,
  Code2,
  Cpu,
  Database,
  FileSignature,
  Gauge,
  KeyRound,
  Network,
  PlugZap,
  Radio,
  ShieldCheck,
  WalletCards,
  WifiOff,
} from "lucide-react";
import { HashChip } from "@/components/data-display/hash-chip";
import { MotionPage } from "@/components/motion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { StatusBadge } from "@/components/ui/status-badge";
import { chainNodes } from "@/data/mock-data";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { formatEth, numberFormatter } from "@/lib/formatters";
import { shortenHash } from "@/lib/hash";
import { createMockTransaction, getMockChainHealth } from "@/lib/mock-chain";
import { setMotionCompleteState, shouldSkipMotion } from "@/lib/motion";
import {
  academicContractAddress,
  mockAbiSummary,
  mockContractMethods,
  mockNetworkConfigs,
} from "@/lib/web3-mock";
import { cn } from "@/lib/cn";
import { useAppStore } from "@/store/app-store";
import type { NetworkType } from "@/types/domain";

type ConnectionStatus =
  | "connected"
  | "connecting"
  | "contract_detected"
  | "disconnected"
  | "network_error"
  | "unsupported";

const statusCopy: Record<
  ConnectionStatus,
  {
    badge: string;
    description: string;
    label: string;
    progress: number;
    tone: "offline" | "online" | "syncing" | "warning";
  }
> = {
  connected: {
    badge: "Conectado",
    description: "Wallet mock enlazada y lista para firmar operaciones academicas.",
    label: "Conectado",
    progress: 88,
    tone: "online",
  },
  connecting: {
    badge: "Conectando",
    description: "Solicitando cuentas, chain id y permisos de firma simulados.",
    label: "Conectando",
    progress: 58,
    tone: "syncing",
  },
  contract_detected: {
    badge: "Contrato detectado",
    description: "ABI academica encontrada en la red seleccionada.",
    label: "Contrato detectado",
    progress: 100,
    tone: "online",
  },
  disconnected: {
    badge: "Desconectado",
    description: "La demo esta en modo lectura; conecta la wallet mock para operar.",
    label: "Desconectado",
    progress: 24,
    tone: "offline",
  },
  network_error: {
    badge: "Error de red",
    description: "Se simulo un fallo RPC. La aplicacion conserva estado y permite reintentar.",
    label: "Error de red",
    progress: 36,
    tone: "warning",
  },
  unsupported: {
    badge: "Red no soportada",
    description: "La wallet reporto una cadena fuera de Ganache, Hardhat o Sepolia.",
    label: "Red no soportada",
    progress: 18,
    tone: "warning",
  },
};

const networkOptions: NetworkType[] = ["sepolia", "hardhat", "ganache"];

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
    <div className="rounded-lg border border-border/55 bg-black/40 p-3 shadow-[inset_0_1px_0_hsl(var(--foreground)/0.035)]">
      <div className="flex items-center gap-2 text-muted-foreground">
        {icon}
        <p className="text-xs">{label}</p>
      </div>
      <div className="mt-2 min-w-0 font-mono text-sm font-semibold text-foreground">{value}</div>
    </div>
  );
}

function NetworkNode({
  active,
  label,
  status,
}: {
  active?: boolean;
  label: string;
  status: string;
}) {
  return (
    <div
      className={cn(
        "grid grid-cols-[auto_1fr] items-center gap-3 rounded-lg border border-border/50 bg-black/35 px-3 py-2",
        active && "border-primary/35 bg-primary/10",
      )}
    >
      <span
        className={cn(
          "h-2.5 w-2.5 rounded-full bg-muted-foreground shadow-[0_0_18px_currentColor]",
          active && "bg-primary text-primary",
        )}
      />
      <div className="min-w-0">
        <p className="truncate text-xs font-semibold text-foreground">{label}</p>
        <p className="mt-1 text-[11px] text-muted-foreground">{status}</p>
      </div>
    </div>
  );
}

function AbiSummary() {
  return (
    <details className="group rounded-lg border border-border/55 bg-black/40 p-3 open:bg-black/50">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-sm font-semibold text-foreground">
        ABI resumida
        <span className="rounded-md border border-border bg-secondary px-2 py-1 font-mono text-[11px] text-muted-foreground">
          {mockAbiSummary.length} fragments
        </span>
      </summary>
      <pre className="mt-3 max-h-64 overflow-auto rounded-md border border-border/60 bg-black/55 p-3 text-[11px] leading-5 text-muted-foreground">
        {JSON.stringify(mockAbiSummary, null, 2)}
      </pre>
    </details>
  );
}

export function Web3StatusPage() {
  const wallet = useAppStore((state) => state.wallet);
  const selectedNetwork = useAppStore((state) => state.selectedNetwork);
  const connectWallet = useAppStore((state) => state.connectWalletMock);
  const disconnectWallet = useAppStore((state) => state.disconnectWallet);
  const switchNetwork = useAppStore((state) => state.switchNetwork);
  const addToast = useAppStore((state) => state.addToast);
  const reducedMotion = useReducedMotion();
  const scopeRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<number | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>(
    wallet.connected ? "connected" : "disconnected",
  );
  const [signature, setSignature] = useState<string | null>(null);
  const chainHealth = getMockChainHealth();
  const network = mockNetworkConfigs[selectedNetwork];
  const effectiveStatus =
    !wallet.connected && (connectionStatus === "connected" || connectionStatus === "contract_detected")
      ? "disconnected"
      : connectionStatus;
  const status = statusCopy[effectiveStatus];

  const activeChainNode = useMemo(
    () => chainNodes.find((node) => node.network === selectedNetwork) ?? chainNodes[0],
    [selectedNetwork],
  );

  useEffect(
    () => () => {
      if (timerRef.current) {
        window.clearTimeout(timerRef.current);
      }
    },
    [],
  );

  useGSAP(
    () => {
      if (!scopeRef.current) {
        return;
      }

      if (shouldSkipMotion(reducedMotion)) {
        setMotionCompleteState("[data-web3-card], [data-web3-node], [data-web3-line]");
        return;
      }

      const timeline = gsap.timeline({ defaults: { duration: 0.34, ease: "power2.out" } });

      timeline
        .from("[data-web3-card]", {
          autoAlpha: 0,
          clearProps: "transform,visibility,opacity",
          y: 12,
          stagger: 0.045,
        })
        .from(
          "[data-web3-node]",
          {
            autoAlpha: 0,
            clearProps: "transform,visibility,opacity",
            scale: 0.92,
            stagger: 0.05,
          },
          "-=0.18",
        )
        .from(
          "[data-web3-line]",
          {
            autoAlpha: 0,
            clearProps: "transform,visibility,opacity",
            scaleX: 0.4,
            transformOrigin: "left center",
            stagger: 0.04,
          },
          "-=0.2",
        );
    },
    { dependencies: [reducedMotion], scope: scopeRef },
  );

  useGSAP(
    () => {
      if (!scopeRef.current || shouldSkipMotion(reducedMotion)) {
        return;
      }

      if (effectiveStatus === "network_error" || effectiveStatus === "unsupported") {
        gsap.fromTo(
          "[data-web3-status-panel]",
          { x: 0 },
          { clearProps: "transform", duration: 0.08, ease: "power1.inOut", repeat: 3, x: 6, yoyo: true },
        );
      }

      if (wallet.connected) {
        gsap.fromTo(
          "[data-web3-confirm]",
          { scale: 0.94 },
          { clearProps: "transform", duration: 0.45, ease: "power3.out", scale: 1 },
        );
      }
    },
    { dependencies: [effectiveStatus, reducedMotion, wallet.connected], scope: scopeRef },
  );

  const connect = () => {
    if (timerRef.current) {
      window.clearTimeout(timerRef.current);
    }

    setConnectionStatus("connecting");
    timerRef.current = window.setTimeout(() => {
      connectWallet();
      setConnectionStatus("connected");
      addToast({
        title: "Wallet conectada",
        description: "MetaMask mock autorizo la cuenta institucional.",
        intent: "success",
      });
    }, shouldSkipMotion(reducedMotion) ? 0 : 360);
  };

  const disconnect = () => {
    if (timerRef.current) {
      window.clearTimeout(timerRef.current);
    }

    disconnectWallet();
    setConnectionStatus("disconnected");
    setSignature(null);
  };

  const changeNetwork = (networkId: NetworkType) => {
    switchNetwork(networkId);
    setConnectionStatus(wallet.connected ? "contract_detected" : "disconnected");
  };

  const simulateError = () => {
    setConnectionStatus("network_error");
    addToast({
      title: "Error RPC simulado",
      description: "La DApp conserva el estado y permite reintentar la conexion.",
      intent: "warning",
    });
  };

  const simulateUnsupported = () => {
    setConnectionStatus("unsupported");
    addToast({
      title: "Red no soportada",
      description: "Solo Ganache local, Hardhat local y Sepolia Testnet estan habilitadas.",
      intent: "warning",
    });
  };

  const signMessage = () => {
    const nextSignature = createMockTransaction("0xsignature");
    setSignature(nextSignature);
    setConnectionStatus(wallet.connected ? "contract_detected" : "connected");
    addToast({
      title: "Mensaje firmado",
      description: shortenHash(nextSignature, 12),
      intent: "success",
    });
  };

  const copyValue = async (value: string, label: string) => {
    await window.navigator.clipboard?.writeText(value);
    addToast({
      title: `${label} copiada`,
      description: shortenHash(value, 12),
      intent: "info",
    });
  };

  return (
    <div className="min-w-0" ref={scopeRef}>
      <MotionPage className="grid min-w-0 gap-3" data-testid="web3-console">
      <section
        className="grid min-w-0 gap-3 xl:grid-cols-[minmax(0,1.1fr)_minmax(22rem,0.8fr)]"
        data-web3-card
      >
        <Card className="overflow-hidden">
          <CardContent className="grid gap-5 p-4 lg:grid-cols-[minmax(0,1fr)_18rem] lg:p-5">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <Badge intent="info">MetaMask mock</Badge>
                <StatusBadge tone={status.tone}>{status.badge}</StatusBadge>
                {wallet.connected ? (
                  <StatusBadge tone="online">Contrato detectado</StatusBadge>
                ) : (
                  <StatusBadge tone="neutral">Contrato en espera</StatusBadge>
                )}
              </div>
              <h1 className="mt-4 text-3xl font-semibold leading-tight text-foreground">
                Conexion Web3
              </h1>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
                Consola simulada para probar wallet institucional, redes Ethereum, contrato
                academico y firma digital sin usar una conexion real a MetaMask.
              </p>
              <div className="mt-5 flex flex-wrap gap-2">
                {!wallet.connected ? (
                  <Button
                    aria-label="Conectar wallet mock"
                    disabled={effectiveStatus === "connecting"}
                    icon={<PlugZap className="h-4 w-4" aria-hidden="true" />}
                    onClick={connect}
                  >
                    {effectiveStatus === "connecting" ? "Conectando" : "Conectar wallet mock"}
                  </Button>
                ) : (
                  <Button
                    aria-label="Desconectar wallet"
                    icon={<CircleOff className="h-4 w-4" aria-hidden="true" />}
                    onClick={disconnect}
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
                <Button
                  aria-label="Simular error de red"
                  icon={<WifiOff className="h-4 w-4" aria-hidden="true" />}
                  onClick={simulateError}
                  variant="secondary"
                >
                  Error RPC
                </Button>
                <Button
                  aria-label="Simular red no soportada"
                  icon={<AlertTriangle className="h-4 w-4" aria-hidden="true" />}
                  onClick={simulateUnsupported}
                  variant="secondary"
                >
                  Red no soportada
                </Button>
              </div>
            </div>

            <div
              className="rounded-lg border border-border/60 bg-black/45 p-3 shadow-[inset_0_1px_0_hsl(var(--foreground)/0.035)]"
              data-web3-status-panel
            >
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs text-muted-foreground">Estado actual</p>
                  <p className="mt-2 text-lg font-semibold text-foreground">{status.label}</p>
                </div>
                <span
                  className={cn(
                    "grid h-10 w-10 place-items-center rounded-lg border border-border bg-secondary",
                    wallet.connected && "border-success/30 bg-success/10 text-success",
                    (effectiveStatus === "network_error" || effectiveStatus === "unsupported") &&
                      "border-warning/35 bg-warning/10 text-warning",
                  )}
                  data-web3-confirm
                >
                  {wallet.connected ? (
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

        <Card data-web3-card>
          <CardHeader>
            <p className="text-sm font-semibold text-foreground">Redes disponibles</p>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">
              Cambiar red actualiza el estado global y el indicador del header.
            </p>
          </CardHeader>
          <CardContent className="grid gap-2">
            {networkOptions.map((networkId) => {
              const item = mockNetworkConfigs[networkId];
              const isActive = selectedNetwork === networkId;

              return (
                <button
                  aria-label={`Cambiar red a ${item.label}`}
                  className={cn(
                    "grid w-full grid-cols-[1fr_auto] items-center gap-3 rounded-lg border border-border/55 bg-black/35 p-3 text-left transition-colors hover:border-foreground/25 hover:bg-black/50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/25",
                    isActive && "border-primary/35 bg-primary/10",
                  )}
                  key={networkId}
                  onClick={() => changeNetwork(networkId)}
                  type="button"
                >
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold text-foreground">{item.label}</span>
                    <span className="mt-1 block font-mono text-[11px] text-muted-foreground">
                      chainId {item.chainId} | {item.rpcUrl}
                    </span>
                  </span>
                  <StatusBadge tone={isActive ? "online" : "neutral"}>
                    {isActive ? "activa" : "lista"}
                  </StatusBadge>
                </button>
              );
            })}
          </CardContent>
        </Card>
      </section>

      <section className="grid min-w-0 gap-3 md:grid-cols-2 xl:grid-cols-4" data-web3-card>
        <InfoTile
          icon={<WalletCards className="h-4 w-4" aria-hidden="true" />}
          label="Wallet address simulada"
          value={
            <span className="inline-flex min-w-0 items-center gap-2">
              <span className="truncate">{shortenHash(wallet.address, 8)}</span>
              <Button
                aria-label="Copiar direccion wallet"
                className="min-h-0 rounded p-1"
                icon={<Clipboard className="h-3.5 w-3.5" aria-hidden="true" />}
                onClick={() => copyValue(wallet.address, "Direccion wallet")}
                variant="ghost"
              />
            </span>
          }
        />
        <InfoTile
          icon={<Gauge className="h-4 w-4" aria-hidden="true" />}
          label="Balance ETH simulado"
          value={formatEth(wallet.balanceEth)}
        />
        <InfoTile
          icon={<Network className="h-4 w-4" aria-hidden="true" />}
          label="Red seleccionada"
          value={network.label}
        />
        <InfoTile
          icon={<Cpu className="h-4 w-4" aria-hidden="true" />}
          label="Chain ID"
          value={network.chainId}
        />
        <InfoTile
          icon={<Database className="h-4 w-4" aria-hidden="true" />}
          label="Direccion del smart contract"
          value={
            <span className="inline-flex min-w-0 items-center gap-2">
              <span className="truncate">{shortenHash(academicContractAddress, 8)}</span>
              <Button
                aria-label="Copiar direccion de contrato"
                className="min-h-0 rounded p-1"
                icon={<Clipboard className="h-3.5 w-3.5" aria-hidden="true" />}
                onClick={() => copyValue(academicContractAddress, "Direccion de contrato")}
                variant="ghost"
              />
            </span>
          }
        />
        <InfoTile
          icon={<ShieldCheck className="h-4 w-4" aria-hidden="true" />}
          label="Contrato desplegado"
          value={network.contractDeployed ? "Detectado" : "No encontrado"}
        />
        <InfoTile
          icon={<Radio className="h-4 w-4" aria-hidden="true" />}
          label="Ultimo bloque simulado"
          value={numberFormatter.format(chainHealth.latestBlock)}
        />
        <InfoTile
          icon={<KeyRound className="h-4 w-4" aria-hidden="true" />}
          label="Gas estimado simulado"
          value={network.estimatedGas}
        />
      </section>

      <section className="grid min-w-0 gap-3 xl:grid-cols-[minmax(0,1fr)_minmax(22rem,0.72fr)]">
        <Card data-web3-card>
          <CardHeader>
            <p className="text-sm font-semibold text-foreground">Handshake distribuido</p>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">
              Secuencia visible: wallet, RPC, contrato, ABI y permisos de firma.
            </p>
          </CardHeader>
          <CardContent>
            <div className="relative min-h-[21rem] overflow-hidden rounded-lg border border-border/60 bg-black/55 p-4">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,hsl(var(--border))_1px,transparent_0)] [background-size:18px_18px] opacity-45" />
              <div className="relative grid h-full min-h-[18rem] gap-3 md:grid-cols-[1fr_auto_1fr] md:items-center">
                <div className="grid gap-3">
                  <div data-web3-node>
                    <NetworkNode
                      active={wallet.connected}
                      label="MetaMask mock"
                      status={wallet.connected ? "accounts[0] autorizado" : "esperando permiso"}
                    />
                  </div>
                  <div data-web3-node>
                    <NetworkNode
                      active={effectiveStatus !== "network_error"}
                      label={network.explorerLabel}
                      status={`${network.blockTime} block time`}
                    />
                  </div>
                </div>
                <div className="hidden w-24 grid-cols-1 gap-10 md:grid">
                  <span className="h-px w-full bg-primary/45" data-web3-line />
                  <span className="h-px w-full bg-success/45" data-web3-line />
                </div>
                <div className="grid gap-3">
                  <div data-web3-node>
                    <NetworkNode
                      active={network.contractDeployed}
                      label="CertiChainAcademic.sol"
                      status={network.contractDeployed ? "bytecode detectado" : "sin despliegue"}
                    />
                  </div>
                  <div data-web3-node>
                    <NetworkNode
                      active={Boolean(signature)}
                      label="Firma EIP-191 mock"
                      status={signature ? shortenHash(signature, 10) : "mensaje pendiente"}
                    />
                  </div>
                </div>
              </div>
              <div className="relative mt-4 grid gap-2 border-t border-border/60 pt-4 sm:grid-cols-2 xl:grid-cols-3">
                {[
                  "Desconectado",
                  "Conectando",
                  "Conectado",
                  "Error de red",
                  "Red no soportada",
                  "Contrato detectado",
                ].map((item) => (
                  <span
                    className="rounded-md border border-border/55 bg-black/40 px-2 py-1.5 text-[11px] font-semibold text-muted-foreground"
                    key={item}
                  >
                    {item}
                  </span>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card data-web3-card>
          <CardHeader>
            <p className="text-sm font-semibold text-foreground">Panel tecnico</p>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">
              Lectura compacta del contrato inteligente usado por la simulacion.
            </p>
          </CardHeader>
          <CardContent className="grid gap-3">
            <div className="rounded-lg border border-border/55 bg-black/40 p-3">
              <p className="text-xs text-muted-foreground">Contrato</p>
              <div className="mt-2">
                <HashChip hash={academicContractAddress} size={9} />
              </div>
            </div>
            <div className="grid gap-2">
              {mockContractMethods.map((method) => (
                <div
                  className="grid grid-cols-[1fr_auto] items-center gap-3 rounded-lg border border-border/45 bg-black/35 px-3 py-2"
                  key={method.name}
                >
                  <div className="min-w-0">
                    <p className="font-mono text-xs font-semibold text-foreground">{method.name}</p>
                    <p className="mt-1 truncate font-mono text-[11px] text-muted-foreground">
                      {method.signature}
                    </p>
                  </div>
                  <span className="rounded-md border border-border bg-secondary px-2 py-1 font-mono text-[11px] text-muted-foreground">
                    {method.gas}
                  </span>
                </div>
              ))}
            </div>
            <AbiSummary />
          </CardContent>
        </Card>
      </section>

      <section className="grid min-w-0 gap-3 xl:grid-cols-[minmax(0,0.72fr)_minmax(0,1fr)]">
        <Card data-web3-card>
          <CardHeader>
            <p className="text-sm font-semibold text-foreground">Firma de mensaje</p>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">
              La firma es local y demuestra autorizacion institucional sin transmitir datos.
            </p>
          </CardHeader>
          <CardContent>
            <div className="rounded-lg border border-border/55 bg-black/45 p-4">
              <div className="flex items-center gap-2">
                <Code2 className="h-4 w-4 text-primary" aria-hidden="true" />
                <p className="font-mono text-xs text-muted-foreground">
                  CertiChain solicita firma para emitir o verificar certificados.
                </p>
              </div>
              {signature ? (
                <div className="mt-4 rounded-md border border-success/25 bg-success/10 p-3">
                  <p className="text-xs font-semibold text-success">Firma mock generada</p>
                  <p className="mt-2 break-all font-mono text-xs text-foreground">{signature}</p>
                </div>
              ) : (
                <p className="mt-4 text-xs leading-5 text-muted-foreground">
                  Presiona Firmar mensaje para crear una firma simulada asociada a la wallet.
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card data-web3-card>
          <CardHeader>
            <p className="text-sm font-semibold text-foreground">Replica de nodos</p>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">
              La disponibilidad se conserva aunque una universidad salga de linea.
            </p>
          </CardHeader>
          <CardContent className="grid gap-2 md:grid-cols-2">
            {chainNodes.map((node) => (
              <div
                className="grid grid-cols-[1fr_auto] items-center gap-3 rounded-lg border border-border/45 bg-black/35 px-3 py-2"
                key={node.id}
              >
                <div className="min-w-0">
                  <p className="truncate text-xs font-semibold text-foreground">{node.label}</p>
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    {node.location} | bloque {numberFormatter.format(node.latestBlock)}
                  </p>
                </div>
                <StatusBadge
                  tone={
                    node.id === activeChainNode.id
                      ? "online"
                      : node.status === "offline"
                        ? "offline"
                        : node.status === "lagging"
                          ? "warning"
                          : "neutral"
                  }
                >
                  {node.id === activeChainNode.id ? "activa" : node.status}
                </StatusBadge>
              </div>
            ))}
          </CardContent>
        </Card>
      </section>
      </MotionPage>
    </div>
  );
}

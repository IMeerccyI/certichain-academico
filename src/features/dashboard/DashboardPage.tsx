import { cloneElement, useMemo, useRef } from "react";
import { useGSAP } from "@gsap/react";
import { gsap } from "gsap";
import {
  Activity,
  ArrowUpRight,
  BadgeCheck,
  Building2,
  Database,
  FileCheck2,
  FileSignature,
  Fingerprint,
  Globe2,
  PlugZap,
  RotateCcw,
  ShieldCheck,
  TrendingUp,
  WalletCards,
} from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip as ChartTooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { ReactElement, ReactNode } from "react";
import type { RouteId } from "@/app/routes";
import { HashChip } from "@/components/data-display/hash-chip";
import { MetricCard } from "@/components/data-display/metric-card";
import { MotionPage } from "@/components/motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import {
  blockchainEvents as blockchainEventFixtures,
  manipulatedDocumentCases,
  monthlyActivity,
} from "@/data/fixture-data";
import { formatDateTime, numberFormatter } from "@/lib/formatters";
import { shortenHash } from "@/lib/hash";
import { motionPresets, shouldSkipMotion } from "@/lib/motion";
import { cn } from "@/lib/cn";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { getDeploymentByNetwork, isDeploymentReady } from "@/lib/web3/deployments";
import { canNavigateToRoute } from "@/lib/ui-permissions";
import { useAppStore } from "@/store/app-store";
import type { Certificate, CertificateStatus, NetworkType } from "@/types/domain";

const statusLabels: Record<CertificateStatus, string> = {
  manipulated: "Manipulado",
  not_found: "No encontrado",
  pending_reception: "Pendiente recepcion",
  revoked: "Revocado",
  valid: "Valido",
};

const typeLabels: Record<Certificate["type"], string> = {
  academic_diploma: "Diploma academico",
  grade_certificate: "Certificado de notas",
  graduation_certificate: "Certificado de egreso",
  professional_title: "Titulo profesional",
  study_record: "Constancia de estudios",
};

const networkLabels: Record<NetworkType, string> = {
  ganache: "Ganache local",
  hardhat: "Hardhat local",
  sepolia: "Sepolia Testnet",
};

const chartPalette = [
  "hsl(var(--primary))",
  "hsl(var(--success))",
  "hsl(var(--warning))",
  "hsl(var(--accent))",
  "hsl(var(--destructive))",
];

const testChartSize = { height: 160, width: 320 };

const flowSteps = [
  { title: "PDF + SHA-256", detail: "Documento y huella.", icon: FileSignature },
  { title: "Anclaje Ethereum", detail: "Hash en contrato.", icon: Database },
  { title: "Firma recepcion", detail: "Estudiante acepta.", icon: WalletCards },
  { title: "Verificacion", detail: "Consulta publica.", icon: ShieldCheck },
];

type StatusTone = "danger" | "neutral" | "primary" | "success" | "warning";

const toneBadgeClass: Record<StatusTone, string> = {
  danger: "border-destructive/25 bg-destructive/10 text-destructive",
  neutral: "border-border/70 bg-secondary/80 text-muted-foreground",
  primary: "border-primary/25 bg-primary/10 text-primary",
  success: "border-success/25 bg-success/10 text-success",
  warning: "border-warning/25 bg-warning/10 text-warning",
};

const metricBars = {
  activeIssuers: [38, 48, 58, 72, 76, 80],
  emitted: [42, 56, 61, 70, 86, 92],
  revoked: [18, 30, 42, 35, 50, 44],
  risk: [54, 66, 70, 62, 76, 82],
  valid: [34, 50, 67, 79, 74, 88],
  verified: [28, 44, 58, 65, 78, 84],
};

function StatusPill({ children, tone = "neutral" }: { children: ReactNode; tone?: StatusTone }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em]",
        toneBadgeClass[tone],
      )}
    >
      {children}
    </span>
  );
}

function PulseDot({ tone = "success" }: { tone?: "primary" | "success" | "warning" }) {
  const ref = useRef<HTMLSpanElement>(null);
  const reducedMotion = useReducedMotion();

  useGSAP(
    () => {
      if (!ref.current || shouldSkipMotion(reducedMotion)) return;
      const tween = gsap.to(ref.current, motionPresets.blockchainPulse.to);
      return () => tween.kill();
    },
    { dependencies: [reducedMotion], scope: ref },
  );

  return (
    <span
      className={cn(
        "h-1.5 w-1.5 rounded-full",
        tone === "primary" && "bg-primary shadow-[0_0_10px_hsl(var(--primary))]",
        tone === "success" && "bg-success shadow-[0_0_10px_hsl(var(--success))]",
        tone === "warning" && "bg-warning shadow-[0_0_10px_hsl(var(--warning))]",
      )}
      ref={ref}
    />
  );
}

function ResponsiveChart({ children }: { children: ReactElement<{ height?: number; width?: number }> }) {
  if (import.meta.env.MODE === "test") {
    return (
      <div className="h-36 w-full overflow-hidden">
        {cloneElement(children, testChartSize)}
      </div>
    );
  }

  return (
    <ResponsiveContainer height="100%" minHeight={128} minWidth={200} width="100%">
      {children}
    </ResponsiveContainer>
  );
}

function ChartTooltipContent({
  active,
  label,
  payload,
}: {
  active?: boolean;
  label?: string;
  payload?: Array<{ color?: string; name?: string; value?: number }>;
}) {
  if (!active || !payload?.length) {
    return null;
  }

  return (
    <div className="rounded-lg border border-border/80 bg-card/95 px-3 py-2 text-xs shadow-lg backdrop-blur">
      <p className="mb-1.5 font-medium text-foreground">{label}</p>
      <div className="space-y-1">
        {payload.map((entry) => (
          <div className="flex items-center justify-between gap-4" key={entry.name}>
            <span className="flex items-center gap-1.5 text-muted-foreground">
              <span
                className="h-2 w-2 rounded-full"
                style={{ background: entry.color }}
              />
              {entry.name}
            </span>
            <span className="font-mono font-semibold text-foreground">{entry.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function statusTone(status: CertificateStatus): StatusTone {
  if (status === "valid") return "success";
  if (status === "revoked" || status === "manipulated") return "danger";
  if (status === "pending_reception") return "warning";
  return "neutral";
}

function countBy<T>(items: T[], getKey: (item: T) => string) {
  const counts = new Map<string, number>();
  for (const item of items) {
    const key = getKey(item);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return Array.from(counts, ([name, value]) => ({ name, value }));
}

export function DashboardPage() {
  const certificates = useAppStore((state) =>
    Array.isArray(state.certificates) ? state.certificates : [],
  );
  const issuers = useAppStore((state) => (Array.isArray(state.issuers) ? state.issuers : []));
  const verificationAttempts = useAppStore((state) =>
    Array.isArray(state.verificationAttempts) ? state.verificationAttempts : [],
  );
  const ledgerEvents = useAppStore((state) =>
    Array.isArray(state.blockchainEvents) && state.blockchainEvents.length > 0
      ? state.blockchainEvents
      : blockchainEventFixtures,
  );
  const activeRole = useAppStore((state) => state.activeRole);
  const wallet = useAppStore((state) => state.wallet);
  const chainConnected = useAppStore((state) => state.chainConnected);
  const selectedNetwork = useAppStore((state) => state.selectedNetwork);
  const connectWallet = useAppStore((state) => state.connectWallet);
  const setRoute = useAppStore((state) => state.setRoute);
  const addToast = useAppStore((state) => state.addToast);
  const deployment = getDeploymentByNetwork(selectedNetwork);
  const contractAddress = isDeploymentReady(deployment) ? deployment.address : "";

  const summary = useMemo(() => {
    const valid = certificates.filter((c) => c.status === "valid").length;
    const revoked = certificates.filter((c) => c.status === "revoked").length;
    const pending = certificates.filter((c) => c.status === "pending_reception").length;
    const activeIssuers = issuers.filter((i) => i.active).length;
    return { activeIssuers, pending, revoked, valid };
  }, [certificates, issuers]);

  const quickActions = useMemo(
    () =>
      [
        {
          ariaLabel: "Acceso rapido: emitir certificado",
          icon: FileSignature,
          label: "Emitir",
          routeId: "issue" as const,
        },
        {
          ariaLabel: "Acceso rapido: verificar certificado",
          icon: ShieldCheck,
          label: "Verificar",
          routeId: "verification" as const,
        },
        {
          ariaLabel: "Acceso rapido: ledger blockchain",
          icon: Database,
          label: "Ledger",
          routeId: "ledger" as const,
        },
        {
          ariaLabel: "Acceso rapido: certificados emitidos",
          icon: FileCheck2,
          label: "Certificados",
          routeId: "certificates" as const,
        },
      ].filter((action) => canNavigateToRoute(activeRole, action.routeId)),
    [activeRole],
  );

  const statusDistribution = useMemo(
    () =>
      countBy(certificates, (c) => statusLabels[c.status]).map((item, index) => ({
        ...item,
        fill: chartPalette[index % chartPalette.length],
      })),
    [certificates],
  );

  const monthlyChartData = useMemo(
    () =>
      monthlyActivity.slice(-6).map((item) => ({
        issued: item.issued,
        month: item.label,
        revoked: item.revoked,
        verified: item.verified,
      })),
    [],
  );

  const latestCertificates = useMemo(
    () =>
      [...certificates]
        .sort((a, b) => new Date(b.issueDate).getTime() - new Date(a.issueDate).getTime())
        .slice(0, 4),
    [certificates],
  );

  const latestEvents = ledgerEvents.slice(0, 4);
  const latestBlock =
    ledgerEvents.length > 0 ? Math.max(...ledgerEvents.map((e) => e.blockNumber)) : 0;
  const statusTotal = statusDistribution.reduce((sum, item) => sum + item.value, 0);
  const totalCertificateCount = Math.max(certificates.length, 1);
  const totalIssuerCount = Math.max(issuers.length, 1);

  const navigate = (routeId: RouteId, label: string) => {
    setRoute(routeId);
    addToast({
      title: "Vista actualizada",
      description: `El dashboard abrio ${label}.`,
      intent: "info",
    });
  };

  return (
    <MotionPage className="grid min-w-0 gap-2.5" data-testid="dashboard-general">
      <section
        className="overflow-hidden rounded-xl border border-border/70 bg-card/90 shadow-[0_18px_40px_-30px_hsl(var(--shadow-ledger)/1)]"
        data-reveal
      >
        <div className="grid gap-3 p-3.5 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-1.5">
              <StatusPill tone="primary">Dashboard general</StatusPill>
              <StatusPill tone={chainConnected ? "success" : "warning"}>
                <span className="mr-1 inline-flex">
                  <PulseDot tone={chainConnected ? "success" : "warning"} />
                </span>
                {chainConnected ? "Contrato activo" : "Modo lectura"}
              </StatusPill>
              <StatusPill>Bloque {numberFormatter.format(latestBlock)}</StatusPill>
            </div>
            <h1 className="mt-2.5 text-2xl font-semibold tracking-tight text-foreground md:text-[1.65rem]">
              CertiChain Academico
            </h1>
            <p className="mt-1 max-w-xl text-xs leading-5 text-muted-foreground">
              Emision universitaria, hash SHA-256, firma digital y verificacion publica en Ethereum.
            </p>
            {quickActions.length ? (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {quickActions.map((action) => {
                  const Icon = action.icon;
                  return (
                    <Button
                      aria-label={action.ariaLabel}
                      className="min-h-7 px-2.5 text-[11px]"
                      icon={<Icon className="h-3.5 w-3.5" aria-hidden="true" />}
                      key={action.routeId}
                      onClick={() => navigate(action.routeId, action.label)}
                      variant="secondary"
                    >
                      {action.label}
                    </Button>
                  );
                })}
              </div>
            ) : null}
          </div>

          <div className="grid min-w-[14rem] gap-1.5 sm:grid-cols-3 lg:grid-cols-1">
            <div className="rounded-lg border border-border/60 bg-background/50 px-2.5 py-2">
              <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
                Wallet institucional
              </p>
              <div className="mt-1 font-mono text-xs font-semibold text-foreground">
                {wallet.connected ? (
                  <span className="truncate">{shortenHash(wallet.address, 8)}</span>
                ) : (
                  <Button
                    className="mt-0.5 h-7 w-full text-[11px]"
                    icon={<PlugZap className="h-3.5 w-3.5" aria-hidden="true" />}
                    onClick={() => void connectWallet()}
                    variant="primary"
                  >
                    Conectar MetaMask
                  </Button>
                )}
              </div>
            </div>
            <div className="rounded-lg border border-border/60 bg-background/50 px-2.5 py-2">
              <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
                Red Ethereum
              </p>
              <p className="mt-1 flex items-center gap-1.5 text-xs font-medium text-foreground">
                <PulseDot tone="primary" />
                {networkLabels[selectedNetwork]}
              </p>
            </div>
            <div className="rounded-lg border border-border/60 bg-background/50 px-2.5 py-2">
              <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
                Contrato academico
              </p>
              <div className="mt-1">
                {contractAddress ? (
                  <HashChip hash={contractAddress} size={8} />
                ) : (
                  <span className="text-xs text-muted-foreground">Pendiente de despliegue</span>
                )}
              </div>
            </div>
          </div>
        </div>
        {wallet.lastError ? (
          <div className="border-t border-border/50 px-3.5 pb-3">
            <p className="rounded-md border border-destructive/25 bg-destructive/10 px-2.5 py-1.5 text-[11px] text-destructive">
              {wallet.lastError}
            </p>
          </div>
        ) : null}
      </section>

      <section
        className="grid min-w-0 auto-rows-fr gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6"
        data-reveal
      >
        <MetricCard
          actionLabel="Metrica: ver certificados emitidos"
          bars={metricBars.emitted}
          compact
          delta={`${summary.pending} pendiente de recepcion`}
          detail="Registros anclados en ledger"
          icon={<FileCheck2 className="h-4 w-4" aria-hidden="true" />}
          label="Certificados emitidos"
          onClick={
            canNavigateToRoute(activeRole, "certificates")
              ? () => navigate("certificates", "Certificados")
              : undefined
          }
          progress={92}
          testId="metric-total-certificates"
          tone="primary"
          value={String(certificates.length)}
        />
        <MetricCard
          actionLabel="Metrica: ver certificados validos"
          bars={metricBars.valid}
          compact
          delta="Disponibles para verificacion publica"
          detail="Sin revocacion ni alerta de hash"
          icon={<BadgeCheck className="h-4 w-4" aria-hidden="true" />}
          label="Certificados validos"
          onClick={
            canNavigateToRoute(activeRole, "certificates")
              ? () => navigate("certificates", "Certificados")
              : undefined
          }
          progress={Math.round((summary.valid / totalCertificateCount) * 100)}
          testId="metric-valid-certificates"
          tone="success"
          value={String(summary.valid)}
        />
        {canNavigateToRoute(activeRole, "revocation") ? (
          <MetricCard
            actionLabel="Metrica: ver revocacion"
            bars={metricBars.revoked}
            compact
            delta="Historial preservado"
            detail="Revocados por emisor autorizado"
            icon={<RotateCcw className="h-4 w-4" aria-hidden="true" />}
            label="Certificados revocados"
            onClick={() => navigate("revocation", "Revocacion")}
            progress={Math.round((summary.revoked / totalCertificateCount) * 100)}
            testId="metric-revoked-certificates"
            tone="warning"
            value={String(summary.revoked)}
          />
        ) : null}
        <MetricCard
          actionLabel="Metrica: abrir verificacion publica"
          bars={metricBars.verified}
          compact
          delta="Empresas, universidades y gobierno"
          detail="Consultas externas registradas"
          icon={<Globe2 className="h-4 w-4" aria-hidden="true" />}
          label="Verificaciones publicas"
          onClick={
            canNavigateToRoute(activeRole, "verification")
              ? () => navigate("verification", "Verificacion Publica")
              : undefined
          }
          progress={84}
          testId="metric-public-verifications"
          tone="accent"
          value={String(verificationAttempts.length)}
        />
        {canNavigateToRoute(activeRole, "issuers") ? (
          <MetricCard
            actionLabel="Metrica: abrir emisores"
            bars={metricBars.activeIssuers}
            compact
            delta={`${issuers.length - summary.activeIssuers} desactivado(s)`}
            detail="Wallets universitarias activas"
            icon={<Building2 className="h-4 w-4" aria-hidden="true" />}
            label="Emisores activos"
            onClick={() => navigate("issuers", "Emisores")}
            progress={Math.round((summary.activeIssuers / totalIssuerCount) * 100)}
            testId="metric-active-issuers"
            tone="primary"
            value={String(summary.activeIssuers)}
          />
        ) : null}
        <MetricCard
          actionLabel="Metrica: alertas documentales"
          bars={metricBars.risk}
          compact
          delta="Evidencia de falsificacion detectada"
          detail="Alertas por hash no coincidente"
          icon={<Fingerprint className="h-4 w-4" aria-hidden="true" />}
          label="Riesgo documental evitado"
          progress={76}
          testId="metric-risk-avoided"
          tone="danger"
          value={String(manipulatedDocumentCases.length)}
        />
      </section>

      <section className="grid min-w-0 gap-2.5 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]" data-reveal>
        <Card className="overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between gap-2 border-b border-border/60 px-3.5 py-2.5">
            <div>
              <p className="text-xs font-semibold text-foreground">Certificados por estado</p>
              <p className="text-[11px] text-muted-foreground">Distribucion contractual</p>
            </div>
            <StatusBadge tone="neutral">{statusTotal} total</StatusBadge>
          </CardHeader>
          <CardContent className="grid gap-2 p-3.5 sm:grid-cols-[10rem_minmax(0,1fr)] sm:items-center">
            <div className="relative h-36 rounded-xl border border-border/50 bg-muted/30 p-2">
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-3 rounded-full border border-dashed border-border/70"
              />
              <ResponsiveChart>
                <PieChart>
                  <defs>
                    {statusDistribution.map((item, index) => (
                      <linearGradient
                        id={`status-slice-${index}`}
                        key={item.name}
                        x1="0"
                        x2="1"
                        y1="0"
                        y2="1"
                      >
                        <stop offset="0%" stopColor={item.fill} stopOpacity={1} />
                        <stop offset="100%" stopColor={item.fill} stopOpacity={0.55} />
                      </linearGradient>
                    ))}
                  </defs>
                  <Pie
                    cornerRadius={5}
                    data={statusDistribution}
                    dataKey="value"
                    innerRadius={40}
                    outerRadius={60}
                    paddingAngle={3}
                    stroke="hsl(var(--card))"
                    strokeWidth={3}
                  >
                    {statusDistribution.map((item, index) => (
                      <Cell fill={`url(#status-slice-${index})`} key={item.name} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveChart>
              <div className="pointer-events-none absolute inset-0 grid place-items-center">
                <div className="rounded-full border border-border/60 bg-card/90 px-3 py-2 text-center shadow-sm">
                  <p className="font-mono text-base font-semibold text-foreground">{statusTotal}</p>
                  <p className="text-[9px] uppercase tracking-[0.14em] text-muted-foreground">
                    Total
                  </p>
                </div>
              </div>
            </div>
            <div className="grid gap-1.5">
              {statusDistribution.map((item) => {
                const percent = statusTotal > 0 ? Math.round((item.value / statusTotal) * 100) : 0;
                return (
                  <div
                    className="rounded-md border border-border/50 bg-muted/35 px-2.5 py-1.5"
                    key={item.name}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="flex min-w-0 items-center gap-2 text-[11px] text-muted-foreground">
                        <span
                          className="h-2.5 w-2.5 shrink-0 rounded-sm"
                          style={{ background: item.fill }}
                        />
                        <span className="truncate">{item.name}</span>
                      </span>
                      <span className="font-mono text-xs font-semibold text-foreground">
                        {item.value}
                      </span>
                    </div>
                    <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-muted/70">
                      <div
                        className="h-full rounded-full"
                        style={{ background: item.fill, width: `${percent}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <Card className="overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between gap-2 border-b border-border/60 px-3.5 py-2.5">
            <div>
              <p className="text-xs font-semibold text-foreground">Actividad mensual</p>
              <p className="text-[11px] text-muted-foreground">Emisiones, verificaciones y revocaciones</p>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="rounded-full border border-primary/25 bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
                6 meses
              </span>
              <TrendingUp className="h-4 w-4 text-primary" aria-hidden="true" />
            </div>
          </CardHeader>
          <CardContent className="p-3.5 pt-2">
            <div className="mb-2 flex flex-wrap gap-1.5">
              {[
                { color: "hsl(var(--primary))", label: "Emitidos" },
                { color: "hsl(var(--success))", label: "Verificados" },
                { color: "hsl(var(--warning))", label: "Revocados" },
              ].map((item) => (
                <span
                  className="inline-flex items-center gap-1 rounded-full border border-border/60 bg-muted/35 px-2 py-0.5 text-[10px] text-muted-foreground"
                  key={item.label}
                >
                  <span className="h-1.5 w-3 rounded-full" style={{ background: item.color }} />
                  {item.label}
                </span>
              ))}
            </div>
            <div className="h-36 rounded-xl border border-border/50 bg-muted/25 p-2">
              <ResponsiveChart>
                <AreaChart
                  data={monthlyChartData}
                  margin={{ left: -16, right: 6, top: 10, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="issuedFill" x1="0" x2="0" y1="0" y2="1">
                      <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.42} />
                      <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0.02} />
                    </linearGradient>
                    <linearGradient id="verifiedFill" x1="0" x2="0" y1="0" y2="1">
                      <stop offset="0%" stopColor="hsl(var(--success))" stopOpacity={0.34} />
                      <stop offset="100%" stopColor="hsl(var(--success))" stopOpacity={0.02} />
                    </linearGradient>
                    <filter id="areaGlow">
                      <feGaussianBlur result="blur" stdDeviation="1.8" />
                    </filter>
                  </defs>
                  <CartesianGrid
                    stroke="hsl(var(--chart-grid))"
                    strokeDasharray="2 8"
                    vertical={false}
                  />
                  <XAxis
                    axisLine={false}
                    dataKey="month"
                    tick={{ fill: "hsl(var(--chart-muted))", fontSize: 10 }}
                    tickLine={false}
                  />
                  <YAxis
                    axisLine={false}
                    tick={{ fill: "hsl(var(--chart-muted))", fontSize: 10 }}
                    tickLine={false}
                    width={22}
                  />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Area
                    activeDot={{ fill: "hsl(var(--primary))", r: 3, strokeWidth: 0 }}
                    dataKey="issued"
                    dot={false}
                    fill="url(#issuedFill)"
                    name="Emitidos"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2.5}
                    type="monotone"
                  />
                  <Area
                    activeDot={{ fill: "hsl(var(--success))", r: 3, strokeWidth: 0 }}
                    dataKey="verified"
                    dot={false}
                    fill="url(#verifiedFill)"
                    name="Verificados"
                    stroke="hsl(var(--success))"
                    strokeWidth={2.5}
                    type="monotone"
                  />
                  <Area
                    activeDot={{ fill: "hsl(var(--warning))", r: 3, strokeWidth: 0 }}
                    dataKey="revoked"
                    dot={{ fill: "hsl(var(--warning))", r: 2, strokeWidth: 0 }}
                    fill="transparent"
                    name="Revocados"
                    stroke="hsl(var(--warning))"
                    strokeDasharray="5 4"
                    strokeWidth={2}
                    type="monotone"
                  />
                </AreaChart>
              </ResponsiveChart>
            </div>
          </CardContent>
        </Card>
      </section>

      <Card data-reveal>
        <CardHeader className="flex flex-row items-center justify-between gap-2 px-3.5 py-2.5">
          <div>
            <p className="text-xs font-semibold text-foreground">Flujo academico-blockchain</p>
            <p className="text-[11px] text-muted-foreground">Ciclo de vida del certificado</p>
          </div>
          <StatusBadge tone="neutral">4 pasos</StatusBadge>
        </CardHeader>
        <CardContent className="px-3.5 pb-3.5 pt-0">
          <ol className="grid gap-1.5 sm:grid-cols-2 xl:grid-cols-4" data-testid="dashboard-flow-steps">
            {flowSteps.map((step, index) => {
              const Icon = step.icon;
              return (
                <li
                  className="flex items-center gap-2.5 rounded-lg border border-border/55 bg-background/45 px-2.5 py-2"
                  key={step.title}
                >
                  <span className="grid h-7 w-7 shrink-0 place-items-center rounded-md border border-border/70 bg-card text-primary">
                    <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                  </span>
                  <div className="min-w-0">
                    <p className="text-[11px] font-semibold text-foreground">
                      <span className="mr-1 font-mono text-[9px] text-muted-foreground">
                        {String(index + 1).padStart(2, "0")}
                      </span>
                      {step.title}
                    </p>
                    <p className="truncate text-[10px] text-muted-foreground">{step.detail}</p>
                  </div>
                </li>
              );
            })}
          </ol>
        </CardContent>
      </Card>

      <section className="grid min-w-0 gap-2.5 xl:grid-cols-2" data-reveal>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 px-3.5 py-2.5">
            <div className="flex items-center gap-2">
              <Activity className="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
              <p className="text-xs font-semibold text-foreground">Ultimas transacciones</p>
            </div>
            {canNavigateToRoute(activeRole, "ledger") ? (
              <Button
                className="min-h-7 px-2 text-[11px]"
                icon={<ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />}
                onClick={() => navigate("ledger", "Ledger Blockchain")}
                variant="secondary"
              >
                Ver ledger
              </Button>
            ) : null}
          </CardHeader>
          <CardContent className="px-3.5 pb-3.5 pt-0">
            <div className="overflow-x-auto rounded-lg border border-border/55">
              <table className="w-full min-w-[32rem] text-left text-[11px]">
                <thead className="bg-muted/50 text-muted-foreground">
                  <tr>
                    <th className="px-2.5 py-1.5 font-medium">Bloque</th>
                    <th className="px-2.5 py-1.5 font-medium">Evento</th>
                    <th className="px-2.5 py-1.5 font-medium">Certificado</th>
                    <th className="px-2.5 py-1.5 text-right font-medium">Fecha</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/70">
                  {latestEvents.map((event) => (
                    <tr className="text-foreground/90" key={event.id}>
                      <td className="px-2.5 py-2 font-mono text-muted-foreground">
                        {numberFormatter.format(event.blockNumber)}
                      </td>
                      <td className="px-2.5 py-2">{event.type}</td>
                      <td className="px-2.5 py-2 font-mono text-muted-foreground">
                        {event.certificateId ?? "—"}
                      </td>
                      <td className="px-2.5 py-2 text-right text-muted-foreground">
                        {formatDateTime(event.createdAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 px-3.5 py-2.5">
            <div className="flex items-center gap-2">
              <FileCheck2 className="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
              <p className="text-xs font-semibold text-foreground">Ultimos certificados emitidos</p>
            </div>
            {canNavigateToRoute(activeRole, "certificates") ? (
              <Button
                className="min-h-7 px-2 text-[11px]"
                icon={<ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />}
                onClick={() => navigate("certificates", "Certificados")}
                variant="secondary"
              >
                Ver todos
              </Button>
            ) : null}
          </CardHeader>
          <CardContent className="grid gap-1.5 px-3.5 pb-3.5 pt-0">
            {latestCertificates.map((certificate) => (
              <button
                className="grid w-full grid-cols-[1fr_auto] items-center gap-2 rounded-lg border border-border/55 bg-background/40 px-2.5 py-2 text-left transition-colors hover:border-foreground/20 hover:bg-background/70 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/25"
                key={certificate.id}
                onClick={() => navigate("certificates", certificate.code)}
                type="button"
              >
                <span className="min-w-0">
                  <span className="block font-mono text-[11px] font-semibold text-foreground">
                    {certificate.code}
                  </span>
                  <span className="mt-0.5 block truncate text-[10px] text-muted-foreground">
                    {certificate.studentName} · {typeLabels[certificate.type]}
                  </span>
                </span>
                <StatusPill tone={statusTone(certificate.status)}>
                  {statusLabels[certificate.status]}
                </StatusPill>
              </button>
            ))}
          </CardContent>
        </Card>
      </section>
    </MotionPage>
  );
}
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
  KeyRound,
  Landmark,
  Network,
  RotateCcw,
  ShieldAlert,
  ShieldCheck,
  WalletCards,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
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
  chainNodes,
  manipulatedDocumentCases,
  monthlyActivity,
} from "@/data/mock-data";
import { formatDateTime, numberFormatter } from "@/lib/formatters";
import { shortenHash } from "@/lib/hash";
import { motionPresets, shouldSkipMotion } from "@/lib/motion";
import { cn } from "@/lib/cn";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { useAppStore } from "@/store/app-store";
import type { Certificate, CertificateStatus, NetworkType, VerifierEntityType } from "@/types/domain";

const CONTRACT_ADDRESS = "0xAcaD3E71b8F6cD0fA59244cA2D7f8E9c12B0C4";

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

const verifierTypeLabels: Record<VerifierEntityType, string> = {
  government: "Gobierno",
  human_resources: "RR.HH.",
  private_company: "Empresa",
  professional_board: "Colegio",
  scholarship_unit: "Becas",
  university: "Universidad",
};

const networkLabels: Record<NetworkType, string> = {
  ganache: "Ganache local",
  hardhat: "Hardhat local",
  sepolia: "Sepolia Testnet",
};

const chartColors = [
  "hsl(var(--primary))",
  "hsl(var(--success))",
  "hsl(var(--warning))",
  "hsl(var(--accent))",
  "hsl(var(--destructive))",
];

const testChartSize = {
  height: 220,
  width: 320,
};

const flowSteps = [
  {
    title: "Generar PDF",
    detail: "Secretaria academica prepara el documento oficial.",
    icon: FileSignature,
  },
  {
    title: "Calcular SHA-256",
    detail: "El PDF se transforma en huella criptografica.",
    icon: Fingerprint,
  },
  {
    title: "Registrar hash en Ethereum",
    detail: "El contrato inteligente ancla la evidencia.",
    icon: Database,
  },
  {
    title: "Firmar emision",
    detail: "Wallet institucional autoriza la emision.",
    icon: KeyRound,
  },
  {
    title: "Firma de recepcion",
    detail: "El estudiante confirma recepcion del certificado.",
    icon: WalletCards,
  },
  {
    title: "Replicacion blockchain",
    detail: "Nodos academicos conservan trazabilidad.",
    icon: Network,
  },
  {
    title: "Verificacion por empresa",
    detail: "Entidades externas validan sin llamar a la universidad.",
    icon: ShieldCheck,
  },
];

type StatusTone = "danger" | "neutral" | "primary" | "success" | "warning";

const toneBadgeClass: Record<StatusTone, string> = {
  danger:
    "border-destructive/20 bg-destructive/10 text-destructive shadow-[0_0_18px_hsl(var(--destructive)/0.08)]",
  neutral: "border-border/80 bg-secondary text-muted-foreground",
  primary: "border-primary/20 bg-primary/10 text-primary shadow-[0_0_18px_hsl(var(--primary)/0.08)]",
  success: "border-success/20 bg-success/10 text-success shadow-[0_0_18px_hsl(var(--success)/0.07)]",
  warning: "border-warning/20 bg-warning/10 text-warning shadow-[0_0_18px_hsl(var(--warning)/0.07)]",
};

function StatusPill({ children, tone = "neutral" }: { children: ReactNode; tone?: StatusTone }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md border px-2 py-1 text-[11px] font-semibold",
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
      if (!ref.current || shouldSkipMotion(reducedMotion)) {
        return;
      }

      const tween = gsap.to(ref.current, motionPresets.blockchainPulse.to);

      return () => tween.kill();
    },
    { dependencies: [reducedMotion], scope: ref },
  );

  return (
    <span
      className={cn(
        "h-2 w-2 rounded-full shadow-[0_0_18px_currentColor]",
        tone === "primary" && "bg-primary text-primary",
        tone === "success" && "bg-success text-success",
        tone === "warning" && "bg-warning text-warning",
      )}
      ref={ref}
    />
  );
}

function ChartCard({
  children,
  description,
  title,
}: {
  children: ReactNode;
  description: string;
  title: string;
}) {
  return (
    <Card className="min-h-[19rem]">
      <CardHeader>
        <p className="text-sm font-semibold text-foreground">{title}</p>
        <p className="mt-1 text-xs leading-5 text-muted-foreground">{description}</p>
      </CardHeader>
      <CardContent className="h-56">{children}</CardContent>
    </Card>
  );
}

function ResponsiveChart({
  children,
}: {
  children: ReactElement<{ height?: number; width?: number }>;
}) {
  if (import.meta.env.MODE === "test") {
    return (
      <div className="h-56 w-full overflow-hidden">
        {cloneElement(children, testChartSize)}
      </div>
    );
  }

  return (
    <ResponsiveContainer height="100%" minHeight={220} minWidth={280} width="100%">
      {children}
    </ResponsiveContainer>
  );
}

function OperationalStat({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: ReactNode;
}) {
  return (
    <div className="rounded-lg border border-border/55 bg-black/45 p-3 shadow-[inset_0_1px_0_hsl(var(--foreground)/0.035)]">
      <div className="flex items-center gap-2 text-muted-foreground">
        {icon}
        <p className="text-xs">{label}</p>
      </div>
      <div className="mt-2 min-w-0 font-mono text-sm font-semibold text-foreground">{value}</div>
    </div>
  );
}

function statusTone(status: CertificateStatus): StatusTone {
  if (status === "valid") {
    return "success";
  }

  if (status === "revoked" || status === "manipulated") {
    return "danger";
  }

  if (status === "pending_reception") {
    return "warning";
  }

  return "neutral";
}

function countBy<T>(
  items: T[],
  getKey: (item: T) => string,
) {
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
  const verifierEntities = useAppStore((state) =>
    Array.isArray(state.verifierEntities) ? state.verifierEntities : [],
  );
  const ledgerEvents = useAppStore((state) =>
    Array.isArray(state.blockchainEvents) && state.blockchainEvents.length > 0
      ? state.blockchainEvents
      : blockchainEventFixtures,
  );
  const wallet = useAppStore((state) => state.wallet);
  const selectedNetwork = useAppStore((state) => state.selectedNetwork);
  const setRoute = useAppStore((state) => state.setRoute);
  const addToast = useAppStore((state) => state.addToast);

  const summary = useMemo(() => {
    const valid = certificates.filter((certificate) => certificate.status === "valid").length;
    const revoked = certificates.filter((certificate) => certificate.status === "revoked").length;
    const pending = certificates.filter(
      (certificate) => certificate.status === "pending_reception",
    ).length;
    const manipulated = certificates.filter(
      (certificate) => certificate.status === "manipulated",
    ).length;
    const activeIssuers = issuers.filter((issuer) => issuer.active).length;
    const syncedNodes = chainNodes.filter((node) => node.status === "synced").length;

    return {
      activeIssuers,
      manipulated,
      pending,
      revoked,
      syncedNodes,
      valid,
    };
  }, [certificates, issuers]);

  const statusDistribution = useMemo(
    () =>
      countBy(certificates, (certificate) => statusLabels[certificate.status]).map((item, index) => ({
        ...item,
        fill: chartColors[index % chartColors.length],
      })),
    [certificates],
  );

  const facultyDistribution = useMemo(
    () =>
      countBy(certificates, (certificate) => certificate.faculty).map((item, index) => ({
        ...item,
        fill: chartColors[index % chartColors.length],
      })),
    [certificates],
  );

  const verificationByEntity = useMemo(() => {
    const verifierById = new Map(verifierEntities.map((entity) => [entity.id, entity]));

    return countBy(verificationAttempts, (attempt) => {
      const entity = verifierById.get(attempt.verifierEntityId);
      return entity ? verifierTypeLabels[entity.type] : "Sin entidad";
    }).map((item, index) => ({
      ...item,
      fill: chartColors[index % chartColors.length],
    }));
  }, [verificationAttempts, verifierEntities]);

  const monthlyChartData = useMemo(
    () =>
      monthlyActivity.slice(-8).map((item) => ({
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
        .slice(0, 5),
    [certificates],
  );

  const latestEvents = ledgerEvents.slice(0, 5);
  const latestBlock =
    ledgerEvents.length > 0 ? Math.max(...ledgerEvents.map((event) => event.blockNumber)) : 0;
  const totalCertificateCount = Math.max(certificates.length, 1);
  const totalIssuerCount = Math.max(issuers.length, 1);

  const navigate = (routeId: RouteId, label: string) => {
    setRoute(routeId);
    addToast({
      title: "Vista actualizada",
      description: `El dashboard abrio ${label} con la transicion del sistema.`,
      intent: "info",
    });
  };

  const metricBars = {
    activeIssuers: [38, 48, 58, 72, 76, 80],
    emitted: [42, 56, 61, 70, 86, 92],
    revoked: [18, 30, 42, 35, 50, 44],
    risk: [54, 66, 70, 62, 76, 82],
    valid: [34, 50, 67, 79, 74, 88],
    verified: [28, 44, 58, 65, 78, 84],
  };

  return (
    <MotionPage className="grid min-w-0 gap-3" data-testid="dashboard-general">
      <section
        className="grid min-w-0 gap-3 xl:grid-cols-[minmax(0,1.4fr)_minmax(22rem,0.72fr)]"
        data-reveal
      >
        <Card className="overflow-hidden">
          <CardContent className="grid gap-5 p-4 lg:grid-cols-[minmax(0,1fr)_18rem] lg:p-5">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <StatusPill tone="primary">Dashboard general</StatusPill>
                <StatusPill tone="success">
                  <span className="mr-1.5 inline-flex">
                    <PulseDot />
                  </span>
                  Ethereum operativo
                </StatusPill>
                <StatusPill>{summary.syncedNodes}/4 nodos</StatusPill>
              </div>
              <h1 className="mt-4 text-3xl font-semibold leading-tight tracking-tight text-foreground">
                CertiChain Academico
              </h1>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
                Panel operativo para demostrar emision universitaria, hash SHA-256, firma digital,
                trazabilidad Ethereum y verificacion publica de certificados academicos bolivianos.
              </p>
              <div className="mt-5 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
                <Button
                  aria-label="Acceso rapido: emitir certificado"
                  icon={<FileSignature className="h-4 w-4" aria-hidden="true" />}
                  onClick={() => navigate("issue", "Emitir Certificado")}
                  variant="secondary"
                >
                  Emitir
                </Button>
                <Button
                  aria-label="Acceso rapido: verificar certificado"
                  icon={<ShieldCheck className="h-4 w-4" aria-hidden="true" />}
                  onClick={() => navigate("verification", "Verificacion Publica")}
                  variant="secondary"
                >
                  Verificar
                </Button>
                <Button
                  aria-label="Acceso rapido: ledger blockchain"
                  icon={<Database className="h-4 w-4" aria-hidden="true" />}
                  onClick={() => navigate("ledger", "Ledger Blockchain")}
                  variant="secondary"
                >
                  Ledger
                </Button>
                <Button
                  aria-label="Acceso rapido: auditoria distribuida"
                  icon={<ShieldAlert className="h-4 w-4" aria-hidden="true" />}
                  onClick={() => navigate("audit", "Auditoria Distribuida")}
                  variant="secondary"
                >
                  Auditoria
                </Button>
              </div>
            </div>

            <div className="grid gap-2">
              <OperationalStat
                icon={<WalletCards className="h-4 w-4" aria-hidden="true" />}
                label="Wallet institucional"
                value={
                  <div className="grid gap-1">
                    <span>{wallet.connected ? "Conectada" : "Lista para conectar"}</span>
                    <span className="truncate text-xs text-muted-foreground">
                      {shortenHash(wallet.address, 6)}
                    </span>
                  </div>
                }
              />
              <OperationalStat
                icon={<Globe2 className="h-4 w-4" aria-hidden="true" />}
                label="Red Ethereum"
                value={
                  <span className="flex items-center gap-2">
                    <PulseDot tone="primary" />
                    {networkLabels[selectedNetwork]}
                  </span>
                }
              />
              <OperationalStat
                icon={<Landmark className="h-4 w-4" aria-hidden="true" />}
                label="Contrato academico"
                value={<HashChip hash={CONTRACT_ADDRESS} size={8} />}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-foreground">Riesgo documental evitado</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Casos detectados sin depender de llamadas o validacion presencial.
              </p>
            </div>
            <StatusPill tone="danger">{summary.manipulated} criticos</StatusPill>
          </CardHeader>
          <CardContent className="grid gap-3">
            <div className="grid grid-cols-[auto_1fr_auto] items-center gap-3 rounded-lg border border-border/55 bg-black/45 p-3">
              <ShieldAlert className="h-5 w-5 text-destructive" aria-hidden="true" />
              <div>
                <p className="text-sm font-semibold text-foreground">
                  {summary.manipulated} documentos manipulados bloqueados
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  PDF alterado respecto al hash registrado.
                </p>
              </div>
              <span className="font-mono text-lg text-foreground">{summary.manipulated}</span>
            </div>
            <div className="grid grid-cols-[auto_1fr_auto] items-center gap-3 rounded-lg border border-border/55 bg-black/45 p-3">
              <RotateCcw className="h-5 w-5 text-warning" aria-hidden="true" />
              <div>
                <p className="text-sm font-semibold text-foreground">
                  {summary.revoked} certificados revocados trazables
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Correcciones administrativas sin borrar historial.
                </p>
              </div>
              <span className="font-mono text-lg text-foreground">{summary.revoked}</span>
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="grid min-w-0 gap-3 md:grid-cols-2 xl:grid-cols-3" data-reveal>
        <MetricCard
          actionLabel="Metrica: ver certificados emitidos"
          bars={metricBars.emitted}
          delta={`${summary.pending} pendiente de recepcion`}
          detail="Registros anclados en ledger"
          icon={<FileCheck2 className="h-4 w-4" aria-hidden="true" />}
          label="Certificados emitidos"
          onClick={() => navigate("certificates", "Certificados")}
          progress={92}
          testId="metric-total-certificates"
          tone="primary"
          value={String(certificates.length)}
        />
        <MetricCard
          actionLabel="Metrica: ver certificados validos"
          bars={metricBars.valid}
          delta="Disponibles para verificacion publica"
          detail="Sin revocacion ni alerta de hash"
          icon={<BadgeCheck className="h-4 w-4" aria-hidden="true" />}
          label="Certificados validos"
          onClick={() => navigate("certificates", "Certificados")}
          progress={Math.round((summary.valid / totalCertificateCount) * 100)}
          testId="metric-valid-certificates"
          tone="success"
          value={String(summary.valid)}
        />
        <MetricCard
          actionLabel="Metrica: ver revocacion"
          bars={metricBars.revoked}
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
        <MetricCard
          actionLabel="Metrica: abrir verificacion publica"
          bars={metricBars.verified}
          delta="Empresas, universidades y gobierno"
          detail="Consultas externas registradas"
          icon={<Globe2 className="h-4 w-4" aria-hidden="true" />}
          label="Verificaciones publicas"
          onClick={() => navigate("verification", "Verificacion Publica")}
          progress={84}
          testId="metric-public-verifications"
          tone="accent"
          value={String(verificationAttempts.length)}
        />
        <MetricCard
          actionLabel="Metrica: abrir emisores"
          bars={metricBars.activeIssuers}
          delta={`${issuers.length - summary.activeIssuers} desactivado para auditoria`}
          detail="Wallets universitarias activas"
          icon={<Building2 className="h-4 w-4" aria-hidden="true" />}
          label="Emisores activos"
          onClick={() => navigate("issuers", "Emisores")}
          progress={Math.round((summary.activeIssuers / totalIssuerCount) * 100)}
          testId="metric-active-issuers"
          tone="primary"
          value={String(summary.activeIssuers)}
        />
        <MetricCard
          actionLabel="Metrica: abrir auditoria documental"
          bars={metricBars.risk}
          delta="Evidencia de falsificacion simulada"
          detail="Alertas por hash no coincidente"
          icon={<ShieldAlert className="h-4 w-4" aria-hidden="true" />}
          label="Riesgo documental evitado"
          onClick={() => navigate("audit", "Auditoria Distribuida")}
          progress={76}
          testId="metric-risk-avoided"
          tone="danger"
          value={String(manipulatedDocumentCases.length)}
        />
      </section>

      <section className="grid min-w-0 gap-3 xl:grid-cols-[minmax(0,1fr)_minmax(22rem,0.58fr)]" data-reveal>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-foreground">
                Timeline academico-blockchain
              </p>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">
                Flujo completo desde PDF universitario hasta verificacion independiente.
              </p>
            </div>
            <StatusPill tone="success">7 pasos</StatusPill>
          </CardHeader>
          <CardContent>
            <ol className="grid gap-2 lg:grid-cols-7">
              {flowSteps.map((step, index) => {
                const Icon = step.icon;

                return (
                  <li
                    className="relative rounded-lg border border-border/55 bg-black/45 p-3 shadow-[inset_0_1px_0_hsl(var(--foreground)/0.035)]"
                    key={step.title}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="grid h-8 w-8 place-items-center rounded-md border border-border/80 bg-secondary text-primary">
                        <Icon className="h-4 w-4" aria-hidden="true" />
                      </span>
                      <span className="font-mono text-[11px] text-muted-foreground">
                        {String(index + 1).padStart(2, "0")}
                      </span>
                    </div>
                    <p className="mt-3 text-xs font-semibold text-foreground">{step.title}</p>
                    <p className="mt-2 text-[11px] leading-5 text-muted-foreground">
                      {step.detail}
                    </p>
                  </li>
                );
              })}
            </ol>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-foreground">Estado distribuido</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Replicacion disponible aunque una universidad este fuera de linea.
              </p>
            </div>
            <StatusPill tone="primary">Bloque {numberFormatter.format(latestBlock)}</StatusPill>
          </CardHeader>
          <CardContent className="grid gap-2">
            {chainNodes.map((node) => (
              <div
                className="grid grid-cols-[1fr_auto] items-center gap-3 rounded-lg border border-border/45 bg-black/35 px-3 py-2"
                key={node.id}
              >
                <div className="min-w-0">
                  <p className="truncate text-xs font-semibold text-foreground">{node.label}</p>
                  <p className="mt-1 text-[11px] text-muted-foreground">{node.location}</p>
                </div>
                <StatusBadge tone={node.status === "synced" ? "online" : "warning"}>
                  {node.status === "synced" ? "sync" : "lag"}
                </StatusBadge>
              </div>
            ))}
          </CardContent>
        </Card>
      </section>

      <section className="grid min-w-0 gap-3 2xl:grid-cols-4" data-reveal>
        <ChartCard
          description="Estados contractuales de los certificados academicos."
          title="Certificados por estado"
        >
          <ResponsiveChart>
            <PieChart>
              <Pie data={statusDistribution} dataKey="value" innerRadius={48} outerRadius={76} paddingAngle={3}>
                {statusDistribution.map((item) => (
                  <Cell fill={item.fill} key={item.name} />
                ))}
              </Pie>
              <ChartTooltip
                contentStyle={{
                  background: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: 8,
                  color: "hsl(var(--foreground))",
                }}
              />
            </PieChart>
          </ResponsiveChart>
        </ChartCard>

        <ChartCard
          description="Distribucion academica por facultad emisora."
          title="Certificados por facultad"
        >
          <ResponsiveChart>
            <BarChart data={facultyDistribution} layout="vertical" margin={{ left: 8, right: 8 }}>
              <CartesianGrid horizontal={false} stroke="hsl(var(--border))" strokeDasharray="3 3" />
              <XAxis axisLine={false} tickLine={false} type="number" />
              <YAxis axisLine={false} dataKey="name" hide tickLine={false} type="category" />
              <ChartTooltip
                contentStyle={{
                  background: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: 8,
                }}
              />
              <Bar dataKey="value" radius={[0, 6, 6, 0]}>
                {facultyDistribution.map((item) => (
                  <Cell fill={item.fill} key={item.name} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveChart>
        </ChartCard>

        <ChartCard
          description="Emisiones y verificaciones durante la demo mensual."
          title="Actividad mensual"
        >
          <ResponsiveChart>
            <LineChart data={monthlyChartData} margin={{ left: 0, right: 8, top: 8 }}>
              <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" vertical={false} />
              <XAxis axisLine={false} dataKey="month" tickLine={false} />
              <YAxis axisLine={false} tickLine={false} width={28} />
              <ChartTooltip
                contentStyle={{
                  background: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: 8,
                }}
              />
              <Line dataKey="issued" dot={false} name="Emitidos" stroke="hsl(var(--primary))" strokeWidth={2} />
              <Line dataKey="verified" dot={false} name="Verificados" stroke="hsl(var(--success))" strokeWidth={2} />
              <Line dataKey="revoked" dot={false} name="Revocados" stroke="hsl(var(--warning))" strokeWidth={2} />
            </LineChart>
          </ResponsiveChart>
        </ChartCard>

        <ChartCard
          description="Origen de las consultas publicas al verificador."
          title="Verificaciones por entidad"
        >
          <ResponsiveChart>
            <BarChart data={verificationByEntity} margin={{ left: 0, right: 8, top: 8 }}>
              <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" vertical={false} />
              <XAxis axisLine={false} dataKey="name" tickLine={false} />
              <YAxis axisLine={false} tickLine={false} width={24} />
              <ChartTooltip
                contentStyle={{
                  background: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: 8,
                }}
              />
              <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                {verificationByEntity.map((item) => (
                  <Cell fill={item.fill} key={item.name} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveChart>
        </ChartCard>
      </section>

      <section className="grid min-w-0 gap-3 xl:grid-cols-[minmax(0,1fr)_minmax(24rem,0.72fr)]" data-reveal>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
              <p className="text-sm font-semibold text-foreground">Ultimas transacciones</p>
            </div>
            <Button
              icon={<ArrowUpRight className="h-4 w-4" aria-hidden="true" />}
              onClick={() => navigate("ledger", "Ledger Blockchain")}
              variant="secondary"
            >
              Ver ledger
            </Button>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[44rem] text-left text-xs">
                <thead className="bg-black/55 text-muted-foreground">
                  <tr>
                    <th className="rounded-l-md px-3 py-2 font-medium">Bloque</th>
                    <th className="px-3 py-2 font-medium">Evento</th>
                    <th className="px-3 py-2 font-medium">Certificado</th>
                    <th className="px-3 py-2 font-medium">Hash tx</th>
                    <th className="rounded-r-md px-3 py-2 text-right font-medium">Fecha</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {latestEvents.map((event) => (
                    <tr className="text-foreground/85" key={event.id}>
                      <td className="px-3 py-3 font-mono text-muted-foreground">
                        {numberFormatter.format(event.blockNumber)}
                      </td>
                      <td className="px-3 py-3">{event.type}</td>
                      <td className="px-3 py-3 font-mono text-muted-foreground">
                        {event.certificateId ?? "emisor"}
                      </td>
                      <td className="px-3 py-3 font-mono">{shortenHash(event.transactionHash, 7)}</td>
                      <td className="px-3 py-3 text-right text-muted-foreground">
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
          <CardHeader className="flex flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <FileCheck2 className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
              <p className="text-sm font-semibold text-foreground">Ultimos certificados emitidos</p>
            </div>
            <Button
              icon={<ArrowUpRight className="h-4 w-4" aria-hidden="true" />}
              onClick={() => navigate("certificates", "Certificados")}
              variant="secondary"
            >
              Ver todos
            </Button>
          </CardHeader>
          <CardContent className="grid gap-2">
            {latestCertificates.map((certificate) => (
              <button
                className="grid w-full grid-cols-[1fr_auto] items-start gap-3 rounded-lg border border-border/55 bg-black/40 p-3 text-left transition-colors hover:border-foreground/25 hover:bg-black/55 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/25"
                key={certificate.id}
                onClick={() => navigate("certificates", certificate.code)}
                type="button"
              >
                <span className="min-w-0">
                  <span className="block font-mono text-xs font-semibold text-foreground">
                    {certificate.code}
                  </span>
                  <span className="mt-1 block truncate text-xs text-muted-foreground">
                    {certificate.studentName} | {typeLabels[certificate.type]}
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

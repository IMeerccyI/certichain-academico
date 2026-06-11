import { cloneElement, useMemo, useRef, useState } from "react";
import type { ReactElement, ReactNode } from "react";
import { useGSAP } from "@gsap/react";
import { gsap } from "gsap";
import {
  Activity,
  ArrowDownToLine,
  BarChart3,
  Building2,
  FileCheck2,
  Filter,
  GraduationCap,
  LineChart as LineChartIcon,
  RotateCcw,
  ShieldAlert,
  ShieldCheck,
  Timer,
  UsersRound,
} from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip as ChartTooltip,
  XAxis,
  YAxis,
} from "recharts";
import { AnimatedNumber, MotionPage } from "@/components/motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { cn } from "@/lib/cn";
import { compactFormatter, numberFormatter } from "@/lib/formatters";
import { setMotionCompleteState, shouldSkipMotion } from "@/lib/motion";
import { useAppStore } from "@/store/app-store";
import type {
  AnalyticsSnapshot,
  Certificate,
  CertificateStatus,
  RevocationRecord,
  VerificationAttempt,
} from "@/types/domain";

type PeriodFilter = "year" | "semester" | "quarter";
type StatusFilter = Certificate["status"] | "all";

type CountRow = {
  fill?: string;
  name: string;
  value: number;
};

type SummaryRow = {
  certificates: number;
  faculty: string;
  issuer: string;
  invalidAttempts: number;
  revoked: number;
  valid: number;
  verifications: number;
};

const periodOptions: Array<{ label: string; value: PeriodFilter }> = [
  { label: "Todo el ano", value: "year" },
  { label: "Ultimos 6 meses", value: "semester" },
  { label: "Ultimos 3 meses", value: "quarter" },
];

const statusOptions: Array<{ label: string; shortLabel: string; value: StatusFilter }> = [
  { label: "Todos los estados", shortLabel: "Todos", value: "all" },
  { label: "Validos", shortLabel: "Validos", value: "valid" },
  { label: "Revocados", shortLabel: "Revocados", value: "revoked" },
  { label: "Manipulados", shortLabel: "Manipulados", value: "manipulated" },
  { label: "Pendientes", shortLabel: "Pendientes", value: "pending_reception" },
];

const statusPluralLabels: Record<Certificate["status"], string> = {
  manipulated: "Manipulados",
  pending_reception: "Pendientes",
  revoked: "Revocados",
  valid: "Validos",
};

const typeLabels: Record<Certificate["type"], string> = {
  academic_diploma: "Diploma academico",
  grade_certificate: "Certificado de notas",
  graduation_certificate: "Certificado de egreso",
  professional_title: "Titulo profesional",
  study_record: "Constancia de estudios",
};

const chartColors = [
  "hsl(var(--primary))",
  "hsl(var(--success))",
  "hsl(var(--warning))",
  "hsl(var(--accent))",
  "hsl(var(--destructive))",
  "hsl(var(--muted-foreground))",
];

const chartTooltipStyle = {
  background: "hsl(var(--card))",
  border: "1px solid hsl(var(--border))",
  borderRadius: 8,
  color: "hsl(var(--foreground))",
};

const testChartSize = {
  height: 240,
  width: 360,
};

const monthLabels = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

function chartFill(index: number) {
  return chartColors[index % chartColors.length];
}

function parseDateTime(value?: string) {
  const time = Date.parse(value ?? "");

  return Number.isNaN(time) ? undefined : time;
}

function monthKeyFromTime(time: number) {
  const date = new Date(time);

  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

function createMonthlyRow(time: number): AnalyticsSnapshot {
  const date = new Date(time);

  return {
    gasCostUsd: 0,
    issued: 0,
    label: monthLabels[date.getUTCMonth()] ?? "Mes",
    manipulated: 0,
    revoked: 0,
    verified: 0,
  };
}

function buildMonthlyActivity({
  certificates,
  revocationRecords,
  verificationAttempts,
}: {
  certificates: Certificate[];
  revocationRecords: RevocationRecord[];
  verificationAttempts: VerificationAttempt[];
}) {
  const eventTimes = [
    ...certificates
      .map((certificate) => parseDateTime(certificate.issuedAt || certificate.issueDate || certificate.createdAt))
      .filter((time): time is number => time !== undefined),
    ...verificationAttempts
      .map((attempt) => parseDateTime(attempt.attemptedAt))
      .filter((time): time is number => time !== undefined),
    ...revocationRecords
      .map((record) => parseDateTime(record.revokedAt))
      .filter((time): time is number => time !== undefined),
  ];
  const latestTime = eventTimes.length > 0 ? Math.max(...eventTimes) : Date.now();
  const latest = new Date(latestTime);
  const rows = new Map<string, AnalyticsSnapshot>();

  for (let offset = 11; offset >= 0; offset -= 1) {
    const rowTime = Date.UTC(latest.getUTCFullYear(), latest.getUTCMonth() - offset, 1);
    rows.set(monthKeyFromTime(rowTime), createMonthlyRow(rowTime));
  }

  const addCount = (
    value: string | undefined,
    key: "issued" | "manipulated" | "revoked" | "verified",
  ) => {
    const time = parseDateTime(value);

    if (time === undefined) {
      return;
    }

    const row = rows.get(monthKeyFromTime(time));

    if (row) {
      row[key] += 1;
    }
  };

  for (const certificate of certificates) {
    addCount(certificate.issuedAt || certificate.issueDate || certificate.createdAt, "issued");

    if (certificate.status === "manipulated") {
      addCount(certificate.updatedAt || certificate.issuedAt, "manipulated");
    }
  }

  for (const attempt of verificationAttempts) {
    addCount(attempt.attemptedAt, "verified");

    if (attempt.resultStatus === "manipulated") {
      addCount(attempt.attemptedAt, "manipulated");
    }
  }

  for (const record of revocationRecords) {
    addCount(record.revokedAt, "revoked");
  }

  return Array.from(rows.values());
}

function getPeriodLabel(period: PeriodFilter) {
  return periodOptions.find((option) => option.value === period)?.label ?? "Periodo";
}

function getStatusLabel(status: StatusFilter) {
  if (status === "all") {
    return "Todos los estados";
  }

  return statusPluralLabels[status];
}

function getStatusTone(status: CertificateStatus): "neutral" | "online" | "offline" | "warning" {
  if (status === "valid") {
    return "online";
  }

  if (status === "revoked" || status === "manipulated" || status === "not_found") {
    return "offline";
  }

  return "warning";
}

function groupCounts<T>(items: T[], getKey: (item: T) => string): CountRow[] {
  const counts = new Map<string, number>();

  for (const item of items) {
    const key = getKey(item);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  return Array.from(counts, ([name, value]) => ({ name, value }))
    .sort((left, right) => right.value - left.value)
    .map((item, index) => ({
      ...item,
      fill: chartFill(index),
    }));
}

function topEntry(rows: CountRow[]) {
  return rows[0] ?? { name: "Sin datos", value: 0 };
}

function ResponsiveChart({
  children,
}: {
  children: ReactElement<{ height?: number; width?: number }>;
}) {
  if (import.meta.env.MODE === "test") {
    return (
      <div className="h-60 w-full overflow-hidden">
        {cloneElement(children, testChartSize)}
      </div>
    );
  }

  return (
    <ResponsiveContainer height="100%" minHeight={236} minWidth={260} width="100%">
      {children}
    </ResponsiveContainer>
  );
}

function FilterButton({
  active,
  children,
  onClick,
}: {
  active: boolean;
  children: ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      className={cn(
        "shrink-0 rounded-md border px-3 py-1.5 text-xs font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/25",
        active
          ? "border-foreground/25 bg-foreground text-background shadow-[inset_0_1px_0_hsl(var(--background)/0.18),0_14px_30px_-24px_hsl(var(--foreground)/0.72)]"
          : "border-border/65 bg-muted/50 text-muted-foreground hover:border-foreground/20 hover:bg-secondary hover:text-foreground",
      )}
      onClick={onClick}
      type="button"
    >
      {children}
    </button>
  );
}

function MetricTile({
  detail,
  icon,
  testId,
  title,
  value,
}: {
  detail: ReactNode;
  icon: ReactNode;
  testId: string;
  title: string;
  value: ReactNode;
}) {
  return (
    <article
      className="grid min-h-[8.3rem] rounded-lg border border-border bg-card/95 p-3 shadow-[inset_0_1px_0_hsl(var(--foreground)/0.035),0_20px_58px_-42px_hsl(var(--shadow-ledger)/1)]"
      data-analytics-metric
      data-testid={testId}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="grid min-w-0 gap-1">
          <p className="text-xs font-semibold text-muted-foreground">{title}</p>
          <div className="min-w-0 truncate font-mono text-2xl font-semibold text-foreground">
            {value}
          </div>
        </div>
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-md border border-border/65 bg-secondary text-muted-foreground">
          {icon}
        </span>
      </div>
      <div className="mt-3 rounded-md border border-border/50 bg-muted/52 px-3 py-2 text-[11px] leading-5 text-muted-foreground">
        {detail}
      </div>
    </article>
  );
}

function ChartPanel({
  children,
  description,
  metric,
  testId,
  title,
}: {
  children: ReactNode;
  description: string;
  metric: ReactNode;
  testId: string;
  title: string;
}) {
  return (
    <Card data-analytics-chart data-analytics-panel data-testid={testId}>
      <CardHeader className="flex flex-row items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-foreground">{title}</p>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">{description}</p>
        </div>
        <span
          className="shrink-0 rounded-md border border-border/60 bg-muted/55 px-2.5 py-1 font-mono text-xs font-semibold text-foreground"
          data-analytics-highlight
        >
          {metric}
        </span>
      </CardHeader>
      <CardContent className="grid gap-3">
        <div className="h-60 min-w-0 rounded-md border border-border/60 bg-muted/55 p-2">
          {children}
        </div>
      </CardContent>
    </Card>
  );
}

function EmptyChartState({ text = "Sin datos para el filtro activo" }: { text?: string }) {
  return (
    <div className="grid h-full min-h-52 place-items-center rounded-md border border-dashed border-border/60 bg-muted/40 p-4 text-center text-xs text-muted-foreground">
      {text}
    </div>
  );
}

export function AnalyticsPage() {
  const pageRef = useRef<HTMLDivElement>(null);
  const reducedMotion = useReducedMotion();
  const addToast = useAppStore((state) => state.addToast);
  const certificates = useAppStore((state) => state.certificates);
  const issuers = useAppStore((state) => state.issuers);
  const verificationAttempts = useAppStore((state) => state.verificationAttempts);
  const verifierEntities = useAppStore((state) => state.verifierEntities);
  const revocationRecords = useAppStore((state) => state.revocationRecords);
  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>("year");
  const [facultyFilter, setFacultyFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [exportResult, setExportResult] = useState("");

  const faculties = useMemo(
    () => Array.from(new Set(certificates.map((certificate) => certificate.faculty))),
    [certificates],
  );

  const monthlyActivity = useMemo(
    () => buildMonthlyActivity({ certificates, revocationRecords, verificationAttempts }),
    [certificates, revocationRecords, verificationAttempts],
  );

  const activeMonthlyActivity = useMemo(() => {
    if (periodFilter === "quarter") {
      return monthlyActivity.slice(-3);
    }

    if (periodFilter === "semester") {
      return monthlyActivity.slice(-6);
    }

    return monthlyActivity;
  }, [monthlyActivity, periodFilter]);

  const filteredCertificates = useMemo(
    () =>
      certificates.filter((certificate) => {
        const matchesFaculty = facultyFilter === "all" || certificate.faculty === facultyFilter;
        const matchesStatus = statusFilter === "all" || certificate.status === statusFilter;

        return matchesFaculty && matchesStatus;
      }),
    [certificates, facultyFilter, statusFilter],
  );

  const filteredCertificateIds = useMemo(
    () => new Set(filteredCertificates.map((certificate) => certificate.id)),
    [filteredCertificates],
  );

  const hasCertificateFilter = facultyFilter !== "all" || statusFilter !== "all";

  const relevantAttempts = useMemo(
    () =>
      hasCertificateFilter
        ? verificationAttempts.filter(
            (attempt) =>
              attempt.matchedCertificateId &&
              filteredCertificateIds.has(attempt.matchedCertificateId),
          )
        : verificationAttempts,
    [filteredCertificateIds, hasCertificateFilter, verificationAttempts],
  );

  const metrics = useMemo(() => {
    const valid = filteredCertificates.filter((certificate) => certificate.status === "valid").length;
    const revoked = filteredCertificates.filter((certificate) => certificate.status === "revoked").length;
    const invalidAttempts = relevantAttempts.filter((attempt) => attempt.resultStatus !== "valid").length;
    const activeIssuers = issuers.filter((issuer) => issuer.active).length;
    const careerCounts = groupCounts(filteredCertificates, (certificate) => certificate.career);
    const facultyCounts = groupCounts(filteredCertificates, (certificate) => certificate.faculty);
    const monthlyEvents = activeMonthlyActivity.reduce(
      (sum, month) => sum + month.issued + month.verified + month.revoked + month.manipulated,
      0,
    );
    const averageEmissionMinutes =
      filteredCertificates.length === 0
        ? 0
        : Number((2.1 + filteredCertificates.length * 0.07 + revoked * 0.16).toFixed(1));

    return {
      activeIssuers,
      averageEmissionMinutes,
      invalidAttempts,
      monthlyEvents,
      revoked,
      topCareer: topEntry(careerCounts),
      topFaculty: topEntry(facultyCounts),
      valid,
      verifications: relevantAttempts.length,
    };
  }, [activeMonthlyActivity, filteredCertificates, issuers, relevantAttempts]);

  const statusDistribution = useMemo(() => {
    const rows = statusOptions
      .filter((option) => option.value !== "all")
      .map((option, index) => ({
        fill: chartFill(index),
        name: option.shortLabel,
        value: filteredCertificates.filter((certificate) => certificate.status === option.value).length,
      }));

    return rows.filter((row) => row.value > 0);
  }, [filteredCertificates]);

  const typeDistribution = useMemo(
    () => groupCounts(filteredCertificates, (certificate) => typeLabels[certificate.type]),
    [filteredCertificates],
  );

  const verificationsByEntity = useMemo(() => {
    const entityById = new Map(verifierEntities.map((entity) => [entity.id, entity]));
    const rows = new Map<string, { invalid: number; name: string; valid: number }>();

    for (const attempt of relevantAttempts) {
      const entity = entityById.get(attempt.verifierEntityId);
      const name = entity?.name ?? "Entidad sin registro";
      const current = rows.get(name) ?? { invalid: 0, name, valid: 0 };

      if (attempt.resultStatus === "valid") {
        current.valid += 1;
      } else {
        current.invalid += 1;
      }

      rows.set(name, current);
    }

    return Array.from(rows.values()).sort(
      (left, right) => right.valid + right.invalid - (left.valid + left.invalid),
    );
  }, [relevantAttempts, verifierEntities]);

  const monthlyChartData = useMemo(
    () =>
      activeMonthlyActivity.map((month) => ({
        Emitidos: month.issued,
        Manipulados: month.manipulated,
        Mes: month.label,
        Revocados: month.revoked,
        Verificados: month.verified,
      })),
    [activeMonthlyActivity],
  );

  const revocationsByReason = useMemo(() => {
    const visibleRevocations = revocationRecords.filter((record) =>
      filteredCertificateIds.has(record.certificateId),
    );

    return groupCounts(visibleRevocations, (record) => record.reason);
  }, [filteredCertificateIds, revocationRecords]);

  const topIssuers = useMemo(
    () => groupCounts(filteredCertificates, (certificate) => certificate.issuerName).slice(0, 5),
    [filteredCertificates],
  );

  const summaryRows = useMemo<SummaryRow[]>(() => {
    const rows = new Map<string, SummaryRow>();

    for (const certificate of filteredCertificates) {
      const key = `${certificate.faculty}::${certificate.issuerName}`;
      const current =
        rows.get(key) ??
        {
          certificates: 0,
          faculty: certificate.faculty,
          invalidAttempts: 0,
          issuer: certificate.issuerName,
          revoked: 0,
          valid: 0,
          verifications: 0,
        };

      current.certificates += 1;

      if (certificate.status === "valid") {
        current.valid += 1;
      }

      if (certificate.status === "revoked") {
        current.revoked += 1;
      }

      rows.set(key, current);
    }

    for (const attempt of relevantAttempts) {
      if (!attempt.matchedCertificateId) {
        continue;
      }

      const certificate = filteredCertificates.find((item) => item.id === attempt.matchedCertificateId);

      if (!certificate) {
        continue;
      }

      const key = `${certificate.faculty}::${certificate.issuerName}`;
      const row = rows.get(key);

      if (!row) {
        continue;
      }

      row.verifications += 1;

      if (attempt.resultStatus !== "valid") {
        row.invalidAttempts += 1;
      }
    }

    return Array.from(rows.values()).sort((left, right) => right.certificates - left.certificates);
  }, [filteredCertificates, relevantAttempts]);

  const filterKey = `${periodFilter}-${facultyFilter}-${statusFilter}-${filteredCertificates.length}`;

  useGSAP(
    () => {
      const page = pageRef.current;

      if (!page) {
        return;
      }

      const panels = page.querySelectorAll("[data-analytics-panel]");

      if (shouldSkipMotion(reducedMotion)) {
        setMotionCompleteState(panels);
        return;
      }

      const timeline = gsap.timeline({ defaults: { duration: 0.32, ease: "power2.out" } });
      timeline.fromTo(
        panels,
        { autoAlpha: 0, scale: 0.985, y: 12 },
        { autoAlpha: 1, scale: 1, y: 0, stagger: 0.035 },
      );

      return () => timeline.kill();
    },
    { dependencies: [reducedMotion], scope: pageRef },
  );

  useGSAP(
    () => {
      const page = pageRef.current;

      if (!page || shouldSkipMotion(reducedMotion)) {
        return;
      }

      const charts = page.querySelectorAll("[data-analytics-chart]");
      const highlights = page.querySelectorAll("[data-analytics-highlight]");

      const timeline = gsap.timeline({ defaults: { duration: 0.24, ease: "power2.out" } });
      timeline
        .fromTo(charts, { autoAlpha: 0.62, y: 8 }, { autoAlpha: 1, y: 0, stagger: 0.025 })
        .fromTo(
          highlights,
          { scale: 0.96 },
          { scale: 1, yoyo: true, repeat: 1, stagger: 0.025 },
          "<",
        );

      return () => timeline.kill();
    },
    {
      dependencies: [filterKey, reducedMotion],
      revertOnUpdate: true,
      scope: pageRef,
    },
  );

  const handleExportReport = () => {
    const facultyLabel = facultyFilter === "all" ? "Todas las facultades" : facultyFilter;
    const report = `Reporte local generado | datos actuales y fixtures academicos | ${getPeriodLabel(periodFilter)} | ${facultyLabel} | ${getStatusLabel(statusFilter)} | ${numberFormatter.format(filteredCertificates.length)} certificados`;

    setExportResult(report);
    addToast({
      title: "Reporte local generado",
      description: "La analitica local preparo un exporte con datos actuales y fixtures academicos.",
      intent: "success",
    });
  };

  return (
    <div ref={pageRef}>
      <MotionPage
        className="grid min-w-0 gap-3"
        data-testid="analytics-workspace"
        staggerSelector="[data-analytics-panel]"
      >
        <section
          className="rounded-lg border border-border bg-card p-4 shadow-[inset_0_1px_0_hsl(var(--foreground)/0.035),0_24px_70px_-46px_hsl(var(--shadow-ledger)/1)]"
          data-analytics-panel
        >
          <div className="grid min-w-0 gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(18rem,0.36fr)]">
            <div className="min-w-0">
              <div className="mb-3 flex flex-wrap gap-2">
                <StatusBadge tone="syncing">Recharts + datos academicos</StatusBadge>
                <StatusBadge tone="online">Analitica local</StatusBadge>
                <StatusBadge tone="neutral">{getPeriodLabel(periodFilter)}</StatusBadge>
              </div>
              <h1 className="text-2xl font-semibold tracking-tight text-foreground">
                Analitica del sistema
              </h1>
              <p className="mt-1 max-w-3xl text-sm leading-6 text-muted-foreground">
                Vista ejecutiva para evaluar volumen de certificados, verificaciones publicas,
                intentos no validos, revocaciones, actividad mensual y tiempos de emision
                academica sobre Ethereum.
              </p>
            </div>

            <div className="rounded-md border border-border/55 bg-muted/55 p-3">
              <div className="flex items-center gap-2 text-muted-foreground">
                <LineChartIcon className="h-4 w-4" aria-hidden="true" />
                <p className="text-xs font-semibold uppercase">Lectura actual</p>
              </div>
              <p className="mt-3 font-mono text-2xl font-semibold text-foreground">
                <AnimatedNumber value={metrics.monthlyEvents} />
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                movimientos blockchain en {activeMonthlyActivity.length} meses visibles
              </p>
            </div>
          </div>
        </section>

        <Card data-analytics-panel>
          <CardHeader className="flex flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
              <p className="text-sm font-semibold text-foreground">Filtros de evaluacion</p>
            </div>
            <StatusBadge tone="neutral">
              {numberFormatter.format(filteredCertificates.length)} certificados visibles
            </StatusBadge>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="grid gap-2">
              <p className="text-xs font-semibold text-muted-foreground">Periodo</p>
              <div className="flex gap-2 overflow-x-auto pb-1">
                {periodOptions.map((option) => (
                  <FilterButton
                    active={periodFilter === option.value}
                    key={option.value}
                    onClick={() => setPeriodFilter(option.value)}
                  >
                    {option.label}
                  </FilterButton>
                ))}
              </div>
            </div>

            <div className="grid gap-2">
              <p className="text-xs font-semibold text-muted-foreground">Facultad</p>
              <div className="flex gap-2 overflow-x-auto pb-1">
                <FilterButton
                  active={facultyFilter === "all"}
                  onClick={() => setFacultyFilter("all")}
                >
                  Todas las facultades
                </FilterButton>
                {faculties.map((faculty) => (
                  <FilterButton
                    active={facultyFilter === faculty}
                    key={faculty}
                    onClick={() => setFacultyFilter(faculty)}
                  >
                    {faculty}
                  </FilterButton>
                ))}
              </div>
            </div>

            <div className="grid gap-2">
              <p className="text-xs font-semibold text-muted-foreground">Estado</p>
              <div className="flex gap-2 overflow-x-auto pb-1">
                {statusOptions.map((option) => (
                  <FilterButton
                    active={statusFilter === option.value}
                    key={option.value}
                    onClick={() => setStatusFilter(option.value)}
                  >
                    {option.shortLabel}
                  </FilterButton>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        <section className="grid min-w-0 gap-3 md:grid-cols-2 xl:grid-cols-5">
          <MetricTile
            detail="Registros academicos anclados o filtrados desde datos locales."
            icon={<FileCheck2 className="h-4 w-4" aria-hidden="true" />}
            testId="metric-total-certificates"
            title="Certificados emitidos"
            value={<AnimatedNumber value={filteredCertificates.length} />}
          />
          <MetricTile
            detail="Certificados disponibles para verificacion publica sin alertas."
            icon={<ShieldCheck className="h-4 w-4" aria-hidden="true" />}
            testId="metric-valid-certificates"
            title="Certificados validos"
            value={<AnimatedNumber value={metrics.valid} />}
          />
          <MetricTile
            detail="Correcciones administrativas registradas sin borrar historial."
            icon={<RotateCcw className="h-4 w-4" aria-hidden="true" />}
            testId="metric-revoked-certificates"
            title="Certificados revocados"
            value={<AnimatedNumber value={metrics.revoked} />}
          />
          <MetricTile
            detail="Consultas externas de empresas, universidades y gobierno."
            icon={<UsersRound className="h-4 w-4" aria-hidden="true" />}
            testId="metric-public-verifications"
            title="Verificaciones publicas"
            value={<AnimatedNumber value={metrics.verifications} />}
          />
          <MetricTile
            detail="Consultas con estado revocado, manipulado o no encontrado."
            icon={<ShieldAlert className="h-4 w-4" aria-hidden="true" />}
            testId="metric-invalid-attempts"
            title="Intentos no validos"
            value={<AnimatedNumber value={metrics.invalidAttempts} />}
          />
          <MetricTile
            detail="Wallets universitarias autorizadas para emitir o revocar."
            icon={<Building2 className="h-4 w-4" aria-hidden="true" />}
            testId="metric-active-issuers"
            title="Emisores activos"
            value={<AnimatedNumber value={metrics.activeIssuers} />}
          />
          <MetricTile
            detail={`${numberFormatter.format(metrics.topCareer.value)} certificados en el filtro activo.`}
            icon={<GraduationCap className="h-4 w-4" aria-hidden="true" />}
            testId="metric-top-career"
            title="Carrera lider"
            value={<span title={metrics.topCareer.name}>{metrics.topCareer.name}</span>}
          />
          <MetricTile
            detail={`${numberFormatter.format(metrics.topFaculty.value)} certificados concentrados.`}
            icon={<Building2 className="h-4 w-4" aria-hidden="true" />}
            testId="metric-top-faculty"
            title="Facultad lider"
            value={<span title={metrics.topFaculty.name}>{metrics.topFaculty.name}</span>}
          />
          <MetricTile
            detail="Tiempo estimado de PDF, hash SHA-256, firma y anclaje."
            icon={<Timer className="h-4 w-4" aria-hidden="true" />}
            testId="metric-average-emission-time"
            title="Tiempo promedio"
            value={<AnimatedNumber suffix=" min" value={metrics.averageEmissionMinutes} />}
          />
          <MetricTile
            detail="Suma mensual de emisiones, verificaciones, revocaciones y alertas."
            icon={<Activity className="h-4 w-4" aria-hidden="true" />}
            testId="metric-monthly-blockchain-activity"
            title="Actividad blockchain mensual"
            value={<AnimatedNumber value={metrics.monthlyEvents} />}
          />
        </section>

        {filteredCertificates.length === 0 ? (
          <div
            className="rounded-lg border border-warning/25 bg-warning/10 p-4 text-sm text-warning"
            data-analytics-panel
            data-testid="analytics-empty-filter"
          >
            No hay certificados para esta combinacion de filtros. La tabla y los graficos se
            mantienen activos para evidenciar el cambio de estado.
          </div>
        ) : null}

        <section className="grid min-w-0 gap-3 xl:grid-cols-2">
          <ChartPanel
            description="Distribucion contractual de validez, revocacion, recepcion y alertas."
            metric={numberFormatter.format(filteredCertificates.length)}
            testId="chart-certificates-by-status"
            title="Certificados por estado"
          >
            {statusDistribution.length > 0 ? (
              <ResponsiveChart>
                <PieChart>
                  <Pie
                    data={statusDistribution}
                    dataKey="value"
                    innerRadius={54}
                    outerRadius={84}
                    paddingAngle={3}
                  >
                    {statusDistribution.map((entry) => (
                      <Cell fill={entry.fill} key={entry.name} />
                    ))}
                  </Pie>
                  <ChartTooltip contentStyle={chartTooltipStyle} />
                  <Legend iconType="circle" />
                </PieChart>
              </ResponsiveChart>
            ) : (
              <EmptyChartState />
            )}
          </ChartPanel>

          <ChartPanel
            description="Composicion de documentos academicos emitidos por tipo oficial."
            metric={compactFormatter.format(typeDistribution.reduce((sum, row) => sum + row.value, 0))}
            testId="chart-certificates-by-type"
            title="Certificados por tipo"
          >
            {typeDistribution.length > 0 ? (
              <ResponsiveChart>
                <BarChart data={typeDistribution} margin={{ left: 0, right: 12, top: 8 }}>
                  <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" vertical={false} />
                  <XAxis axisLine={false} dataKey="name" hide tickLine={false} />
                  <YAxis allowDecimals={false} axisLine={false} tickLine={false} width={34} />
                  <ChartTooltip contentStyle={chartTooltipStyle} />
                  <Bar dataKey="value" name="Certificados" radius={[6, 6, 0, 0]}>
                    {typeDistribution.map((entry) => (
                      <Cell fill={entry.fill} key={entry.name} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveChart>
            ) : (
              <EmptyChartState />
            )}
          </ChartPanel>

          <ChartPanel
            description="Demanda publica de validacion por empresas, universidades y entidades."
            metric={numberFormatter.format(relevantAttempts.length)}
            testId="chart-verifications-by-entity"
            title="Verificaciones por entidad"
          >
            {verificationsByEntity.length > 0 ? (
              <ResponsiveChart>
                <BarChart data={verificationsByEntity} margin={{ left: 0, right: 12, top: 8 }}>
                  <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" vertical={false} />
                  <XAxis axisLine={false} dataKey="name" hide tickLine={false} />
                  <YAxis allowDecimals={false} axisLine={false} tickLine={false} width={34} />
                  <ChartTooltip contentStyle={chartTooltipStyle} />
                  <Legend />
                  <Bar dataKey="valid" fill="hsl(var(--success))" name="Validas" radius={[6, 6, 0, 0]} />
                  <Bar dataKey="invalid" fill="hsl(var(--destructive))" name="No validas" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveChart>
            ) : (
              <EmptyChartState text="Sin verificaciones vinculadas a este filtro" />
            )}
          </ChartPanel>

          <ChartPanel
            description="Serie temporal usada para explicar escalabilidad y carga de red."
            metric={getPeriodLabel(periodFilter)}
            testId="chart-monthly-activity"
            title="Actividad mensual"
          >
            <ResponsiveChart>
              <AreaChart data={monthlyChartData} margin={{ left: 0, right: 12, top: 8 }}>
                <defs>
                  <linearGradient id="issued-gradient" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.34} />
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" vertical={false} />
                <XAxis axisLine={false} dataKey="Mes" tickLine={false} />
                <YAxis allowDecimals={false} axisLine={false} tickLine={false} width={46} />
                <ChartTooltip contentStyle={chartTooltipStyle} />
                <Legend />
                <Area
                  dataKey="Emitidos"
                  fill="url(#issued-gradient)"
                  name="Emitidos"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  type="monotone"
                />
                <Line dataKey="Verificados" dot={false} stroke="hsl(var(--success))" strokeWidth={2} />
                <Line dataKey="Revocados" dot={false} stroke="hsl(var(--warning))" strokeWidth={2} />
              </AreaChart>
            </ResponsiveChart>
            <div className="flex flex-wrap gap-1.5">
              {activeMonthlyActivity.map((month) => (
                <span
                  className="rounded border border-border/50 bg-muted/50 px-2 py-1 font-mono text-[10px] text-muted-foreground"
                  key={month.label}
                >
                  {month.label}
                </span>
              ))}
            </div>
          </ChartPanel>

          <ChartPanel
            description="Motivos administrativos registrados como eventos permanentes."
            metric={numberFormatter.format(revocationsByReason.reduce((sum, row) => sum + row.value, 0))}
            testId="chart-revocations-by-reason"
            title="Revocaciones por motivo"
          >
            {revocationsByReason.length > 0 ? (
              <ResponsiveChart>
                <BarChart data={revocationsByReason} layout="vertical" margin={{ left: 8, right: 12 }}>
                  <CartesianGrid horizontal={false} stroke="hsl(var(--border))" strokeDasharray="3 3" />
                  <XAxis axisLine={false} tickLine={false} type="number" />
                  <YAxis axisLine={false} dataKey="name" hide tickLine={false} type="category" />
                  <ChartTooltip contentStyle={chartTooltipStyle} />
                  <Bar dataKey="value" fill="hsl(var(--warning))" name="Revocaciones" radius={[0, 6, 6, 0]} />
                </BarChart>
              </ResponsiveChart>
            ) : (
              <EmptyChartState text="Sin revocaciones en el filtro activo" />
            )}
          </ChartPanel>

          <ChartPanel
            description="Ranking de unidades academicas con mayor actividad de emision."
            metric={topIssuers[0]?.name ?? "Sin emisor"}
            testId="chart-top-issuers"
            title="Top emisores por actividad"
          >
            {topIssuers.length > 0 ? (
              <ResponsiveChart>
                <LineChart data={topIssuers} margin={{ left: 0, right: 12, top: 8 }}>
                  <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" vertical={false} />
                  <XAxis axisLine={false} dataKey="name" hide tickLine={false} />
                  <YAxis allowDecimals={false} axisLine={false} tickLine={false} width={34} />
                  <ChartTooltip contentStyle={chartTooltipStyle} />
                  <Line
                    dataKey="value"
                    dot={{ fill: "hsl(var(--primary))", r: 4 }}
                    name="Certificados"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2}
                    type="monotone"
                  />
                </LineChart>
              </ResponsiveChart>
            ) : (
              <EmptyChartState text="Sin emisores para el filtro activo" />
            )}
          </ChartPanel>
        </section>

        <section className="grid min-w-0 gap-3 xl:grid-cols-[minmax(0,1fr)_minmax(19rem,0.35fr)]">
          <Card data-analytics-panel>
            <CardHeader className="flex flex-row items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                <p className="text-sm font-semibold text-foreground">Tabla de resumen</p>
              </div>
              <StatusBadge tone="neutral">{numberFormatter.format(summaryRows.length)} grupos</StatusBadge>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto rounded-lg border border-border bg-muted/40">
                <table
                  className="w-full min-w-[54rem] text-left text-xs"
                  data-testid="analytics-summary-table"
                >
                  <thead className="bg-muted/65 text-muted-foreground">
                    <tr>
                      <th className="px-3 py-2 font-medium">Facultad</th>
                      <th className="px-3 py-2 font-medium">Emisor dominante</th>
                      <th className="px-3 py-2 text-right font-medium">Certificados</th>
                      <th className="px-3 py-2 text-right font-medium">Validos</th>
                      <th className="px-3 py-2 text-right font-medium">Revocados</th>
                      <th className="px-3 py-2 text-right font-medium">Verificaciones</th>
                      <th className="px-3 py-2 text-right font-medium">Intentos no validos</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/70">
                    {summaryRows.length > 0 ? (
                      summaryRows.map((row) => (
                        <tr className="text-foreground/85" key={`${row.faculty}-${row.issuer}`}>
                          <td className="px-3 py-3 font-semibold text-foreground">{row.faculty}</td>
                          <td className="px-3 py-3 text-muted-foreground">{row.issuer}</td>
                          <td className="px-3 py-3 text-right font-mono">{row.certificates}</td>
                          <td className="px-3 py-3 text-right font-mono">{row.valid}</td>
                          <td className="px-3 py-3 text-right font-mono">{row.revoked}</td>
                          <td className="px-3 py-3 text-right font-mono">{row.verifications}</td>
                          <td className="px-3 py-3 text-right font-mono">{row.invalidAttempts}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td className="px-3 py-5 text-center text-muted-foreground" colSpan={7}>
                          Sin filas para la combinacion actual.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          <Card data-analytics-panel>
            <CardHeader>
              <p className="text-sm font-semibold text-foreground">Exportacion para defensa</p>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">
                Prepara un reporte local con datos actuales y fixtures academicos para la defensa.
              </p>
            </CardHeader>
            <CardContent className="grid gap-3">
              <div className="grid gap-2 rounded-md border border-border/55 bg-muted/55 p-3">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-xs text-muted-foreground">Periodo</span>
                  <span className="text-right text-xs font-semibold text-foreground">
                    {getPeriodLabel(periodFilter)}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-xs text-muted-foreground">Facultad</span>
                  <span className="text-right text-xs font-semibold text-foreground">
                    {facultyFilter === "all" ? "Todas" : facultyFilter}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-xs text-muted-foreground">Estado</span>
                  <StatusBadge tone={statusFilter === "all" ? "neutral" : getStatusTone(statusFilter)}>
                    {getStatusLabel(statusFilter)}
                  </StatusBadge>
                </div>
              </div>
              <Button
                className="w-full"
                icon={<ArrowDownToLine className="h-4 w-4" aria-hidden="true" />}
                onClick={handleExportReport}
                variant="secondary"
              >
                Exportar reporte local
              </Button>
              {exportResult ? (
                <div
                  className="rounded-md border border-success/25 bg-success/10 p-3 text-xs leading-5 text-success"
                  data-testid="analytics-export-result"
                >
                  {exportResult}
                </div>
              ) : (
                <div className="rounded-md border border-border/55 bg-muted/45 p-3 text-xs leading-5 text-muted-foreground">
                  El reporte incluira filtros, KPIs, graficos y tabla de resumen.
                </div>
              )}
            </CardContent>
          </Card>
        </section>
      </MotionPage>
    </div>
  );
}

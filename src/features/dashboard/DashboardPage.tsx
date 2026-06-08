import { useMemo, useState } from "react";
import type { ReactNode } from "react";
import {
  Activity,
  Blocks,
  CircleDollarSign,
  Clock3,
  Database,
  Eye,
  FileSignature,
  Fingerprint,
  KeyRound,
  MoreHorizontal,
  Network,
  Route,
  ShieldAlert,
  ShieldCheck,
  SlidersHorizontal,
  WalletCards,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { HashChip } from "@/components/data-display/hash-chip";
import { MetricCard } from "@/components/data-display/metric-card";
import { MotionPage } from "@/components/motion";
import { Modal } from "@/components/ui/modal";
import {
  certificates,
  chainNodes,
  issuers,
  ledgerEvents,
  students,
} from "@/data/mock-data";
import { formatDateTime, formatLatency, numberFormatter } from "@/lib/formatters";
import { calculateSha256, normalizeHash, shortenHash } from "@/lib/hash";
import { getMockChainHealth } from "@/lib/mock-chain";
import { cn } from "@/lib/cn";
import { useAppStore } from "@/store/app-store";

const guardrailRows = [
  {
    time: "10:42 AM",
    client: "issuer_umsa",
    rule: "SHA-256 mismatch",
    snippet: "PDF hash changed after signature",
    action: "Blocked",
    tone: "danger",
  },
  {
    time: "10:15 AM",
    client: "wallet_27b9",
    rule: "Unauthorized issuer",
    snippet: "Faculty wallet requested title issue",
    action: "Fallback",
    tone: "warning",
  },
  {
    time: "09:30 AM",
    client: "sys_router",
    rule: "Revoked folio reused",
    snippet: "CERT-2026-0003 detected in verifier",
    action: "Blocked",
    tone: "danger",
  },
  {
    time: "09:12 AM",
    client: "student_101",
    rule: "Reception pending",
    snippet: "{ student_signature: null }",
    action: "Retried",
    tone: "primary",
  },
];

const architectureNodes = [
  {
    id: "api",
    label: "API Gateway",
    detail: "/v1/certificates/issue",
    metric: "124k reqs",
    position: "left-1/2 top-[18%] -translate-x-1/2",
    tone: "neutral",
  },
  {
    id: "issuer",
    label: "Issuer ACL",
    detail: "Authorized wallet",
    metric: "68%",
    position: "left-[12%] top-[42%]",
    tone: "success",
  },
  {
    id: "hash",
    label: "SHA-256 Engine",
    detail: "PDF digest",
    metric: "145ms",
    position: "right-[12%] top-[42%]",
    tone: "success",
  },
  {
    id: "chain",
    label: "Smart Contract",
    detail: "emitirCertificado()",
    metric: "0.052 ETH",
    position: "left-1/2 top-[68%] -translate-x-1/2",
    tone: "warning",
  },
] as const;

const metrics = [
  {
    label: "Processed Certificates",
    value: "124k",
    detail: "Certificates increased by",
    delta: "+15% vs yesterday",
    tone: "primary" as const,
    progress: 82,
    bars: [44, 72, 59, 91, 66, 82],
    icon: <Blocks className="h-4 w-4" aria-hidden="true" />,
  },
  {
    label: "Avg. Finality",
    value: "850 ms",
    detail: "Latency increased by",
    delta: "-45ms vs yesterday",
    tone: "accent" as const,
    progress: 71,
    bars: [32, 51, 68, 74, 58, 46],
    icon: <Clock3 className="h-4 w-4" aria-hidden="true" />,
  },
  {
    label: "Total Gas Cost",
    value: "$452.10",
    detail: "Costs decreased by",
    delta: "$120 vs yesterday",
    tone: "success" as const,
    progress: 62,
    bars: [41, 76, 88, 54, 67, 48],
    icon: <CircleDollarSign className="h-4 w-4" aria-hidden="true" />,
  },
  {
    label: "Blocked Requests",
    value: "2.4k",
    detail: "Blocks increased by",
    delta: "+4% vs yesterday",
    tone: "danger" as const,
    progress: 53,
    bars: [72, 48, 62, 55, 76, 61],
    icon: <ShieldAlert className="h-4 w-4" aria-hidden="true" />,
  },
];

const toneBadgeClass = {
  primary: "border-primary/20 bg-primary/10 text-primary shadow-[0_0_18px_hsl(var(--primary)/0.08)]",
  success: "border-success/20 bg-success/10 text-success shadow-[0_0_18px_hsl(var(--success)/0.07)]",
  warning: "border-warning/20 bg-warning/10 text-warning shadow-[0_0_18px_hsl(var(--warning)/0.07)]",
  danger:
    "border-destructive/20 bg-destructive/10 text-destructive shadow-[0_0_18px_hsl(var(--destructive)/0.08)]",
  neutral: "border-border/80 bg-secondary text-muted-foreground",
};

function StatusPill({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: keyof typeof toneBadgeClass;
}) {
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

function ArchitectureNode({
  detail,
  label,
  metric,
  position,
  tone,
}: (typeof architectureNodes)[number]) {
  return (
    <div
      className={cn(
        "absolute min-w-[10rem] rounded-lg border border-border/90 bg-card p-3 shadow-[inset_0_1px_0_hsl(var(--foreground)/0.035),0_20px_60px_-42px_hsl(var(--shadow-ledger)/1)]",
        position,
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-semibold text-foreground">{label}</p>
        <StatusPill tone={tone === "neutral" ? "primary" : tone}>
          {tone === "warning" ? "Warning" : tone === "success" ? "Healthy" : "Live"}
        </StatusPill>
      </div>
      <div className="mt-3 grid grid-cols-[1fr_auto] gap-3 border-t border-border/80 pt-2 text-xs">
        <span className="truncate text-muted-foreground">{detail}</span>
        <span className="font-mono font-semibold text-foreground">{metric}</span>
      </div>
    </div>
  );
}

function RulePanel({
  detail,
  label,
  value,
}: {
  label: string;
  detail: string;
  value: string;
}) {
  return (
    <div className="rounded-lg border border-border/55 bg-black/45 p-3 shadow-[inset_0_1px_0_hsl(var(--foreground)/0.035)]">
      <p className="text-xs font-semibold text-foreground">{label}</p>
      <div className="mt-3 flex items-center justify-between gap-3 text-xs">
        <span className="text-muted-foreground">{detail}</span>
        <span className="rounded-md bg-secondary px-2 py-1 font-mono text-foreground">{value}</span>
      </div>
    </div>
  );
}

export function DashboardPage() {
  const [modalOpen, setModalOpen] = useState(false);
  const [demoHash, setDemoHash] = useState(certificates[0].pdfHash);
  const addToast = useAppStore((state) => state.addToast);
  const chainHealth = getMockChainHealth();

  const activeStudents = useMemo(
    () => new Set(certificates.map((certificate) => certificate.studentId)).size,
    [],
  );

  const latestCertificate = certificates[0];
  const latestStudent = students.find((student) => student.id === latestCertificate.studentId);
  const latestIssuer = issuers.find((issuer) => issuer.id === latestCertificate.issuerId);

  const simulateIssue = async () => {
    const hash = normalizeHash(
      await calculateSha256(`certichain-${Date.now()}-${certificates.length}`),
    );
    setDemoHash(hash);
    addToast({
      title: "Certificate flow simulated",
      description: `Hash ${shortenHash(hash, 9)} is ready for mock anchoring.`,
      intent: "success",
    });
    setModalOpen(false);
  };

  return (
    <MotionPage className="grid min-w-0 gap-3">
      <section
        className="min-w-0 flex flex-col gap-3 md:flex-row md:items-center md:justify-between"
        data-reveal
      >
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <StatusPill tone="primary">Overview</StatusPill>
            <StatusPill>Metrics</StatusPill>
            <StatusPill>Evaluations</StatusPill>
          </div>
          <h1 className="mt-3 text-2xl font-semibold tracking-tight text-foreground">
            Academic Certificate Pipeline
          </h1>
          <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
            Live simulation for university certificate issuance, SHA-256 hashing,
            Ethereum anchoring and public verification.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            icon={<FileSignature className="h-4 w-4" aria-hidden="true" />}
            onClick={() => setModalOpen(true)}
            variant="secondary"
          >
            Issue flow
          </Button>
          <Button
            icon={<Eye className="h-4 w-4" aria-hidden="true" />}
            onClick={() =>
              addToast({
                title: "Verifier check",
                description: "CERT-2026-0001 matches issuer, hash and ledger status.",
                intent: "info",
              })
            }
          >
            Verify
          </Button>
        </div>
      </section>

      <section className="grid min-w-0 gap-3 md:grid-cols-2 xl:grid-cols-4" data-reveal>
        {metrics.map((metric) => (
          <MetricCard key={metric.label} {...metric} />
        ))}
      </section>

      <section
        className="grid min-w-0 gap-3 xl:grid-cols-[minmax(0,1.25fr)_minmax(26rem,0.9fr)]"
        data-reveal
      >
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Network className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
              <p className="text-sm font-medium text-foreground">Endpoint traffic & health</p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                className="min-h-8 px-3 text-xs"
                onClick={() =>
                  addToast({
                    title: "Endpoint detail",
                    description: "Traffic, latency and node health are shown in the pipeline panel.",
                    intent: "info",
                  })
                }
                variant="secondary"
              >
                View Details
              </Button>
              <button
                className="grid h-8 w-8 place-items-center rounded-md bg-secondary text-muted-foreground"
                onClick={() =>
                  addToast({
                    title: "Endpoint menu",
                    description: "Panel actions are simulated for this frontend demo.",
                    intent: "info",
                  })
                }
                type="button"
              >
                <MoreHorizontal className="h-4 w-4" aria-hidden="true" />
                <span className="sr-only">Endpoint menu</span>
              </button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="relative min-h-[27rem] overflow-hidden rounded-lg border border-border/70 bg-black/60 p-4 shadow-[inset_0_1px_0_hsl(var(--foreground)/0.035),inset_0_-28px_60px_hsl(var(--shadow-ledger)/0.28)]">
              <div className="absolute inset-0 opacity-65 [background-image:radial-gradient(hsl(var(--border))_1px,transparent_1px)] [background-size:12px_12px]" />
              <div className="relative z-10 inline-flex rounded-md bg-secondary px-2 py-1 font-mono text-[11px] text-muted-foreground">
                Last Updated : Jun 07 / 17:40
              </div>
              <div className="absolute left-1/2 top-[32%] h-px w-[44%] -translate-x-1/2 bg-border/80 shadow-[0_0_18px_hsl(var(--foreground)/0.12)]" />
              <div className="absolute left-[25%] top-[32%] h-[34%] w-px bg-border/80 shadow-[0_0_18px_hsl(var(--foreground)/0.12)]" />
              <div className="absolute right-[25%] top-[32%] h-[34%] w-px bg-border/80 shadow-[0_0_18px_hsl(var(--foreground)/0.12)]" />
              <div className="absolute left-1/2 top-[34%] h-[34%] w-px -translate-x-1/2 bg-border/80 shadow-[0_0_18px_hsl(var(--foreground)/0.12)]" />
              {architectureNodes.map((node) => (
                <ArchitectureNode key={node.id} {...node} />
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Route className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
              <p className="text-sm font-medium text-foreground">Active certificate architecture</p>
            </div>
            <Button
              className="min-h-8 px-3 text-xs"
              onClick={() =>
                addToast({
                  title: "Pipeline editor",
                  description: "Editing is simulated in this frontend mockup.",
                  intent: "info",
                })
              }
              variant="secondary"
            >
              Edit Pipeline
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="font-mono text-xs uppercase text-muted-foreground">
                1. Ingress (entry point)
              </p>
              <div className="mt-3 rounded-lg border border-border/55 bg-black/45 p-3 shadow-[inset_0_1px_0_hsl(var(--foreground)/0.035)]">
                <div className="grid gap-3 text-xs">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-muted-foreground">Endpoint:</span>
                    <span className="font-mono text-foreground">/v1/certificates/issue</span>
                    <StatusPill>POST</StatusPill>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-muted-foreground">Auth protocol:</span>
                    <span className="font-mono text-foreground">Wallet signature</span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-muted-foreground">Rate limit:</span>
                    <span className="font-mono text-foreground">100 req/min per IP</span>
                  </div>
                </div>
              </div>
            </div>

            <div>
              <p className="font-mono text-xs uppercase text-muted-foreground">
                2. Pre-processing middleware
              </p>
              <div className="mt-3 grid gap-2 md:grid-cols-3 xl:grid-cols-3">
                <RulePanel detail="Engine" label="PDF hash" value="SHA-256" />
                <RulePanel detail="Vector" label="Issuer ACL" value="Strict" />
                <RulePanel detail="Action" label="Revocation class." value="Drop" />
              </div>
            </div>

            <div>
              <div className="mb-3 flex items-center justify-between gap-3">
                <p className="font-mono text-xs uppercase text-muted-foreground">
                  3. Dynamic router (decision matrix)
                </p>
                <StatusPill tone="danger">High</StatusPill>
              </div>
              <div className="rounded-lg border border-border/55 bg-black/45 p-3 shadow-[inset_0_1px_0_hsl(var(--foreground)/0.035)]">
                <div className="flex flex-wrap items-center gap-2 rounded-md border border-border/45 bg-black/55 p-2 text-xs">
                  <span className="text-muted-foreground">IF</span>
                  <StatusPill>Document</StatusPill>
                  <span className="text-muted-foreground">==</span>
                  <StatusPill>Diploma</StatusPill>
                  <StatusPill>Title</StatusPill>
                </div>
                <div className="mt-4 grid gap-3 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Route to:</span>
                    <span className="rounded-md bg-secondary px-2 py-1 font-mono text-foreground shadow-[inset_0_1px_0_hsl(var(--foreground)/0.035)]">
                      emitirCertificado()
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Gas ceiling:</span>
                    <span className="rounded-md bg-secondary px-2 py-1 font-mono text-foreground shadow-[inset_0_1px_0_hsl(var(--foreground)/0.035)]">
                      0.08 ETH
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Block confirmations:</span>
                    <span className="rounded-md bg-secondary px-2 py-1 font-mono text-foreground shadow-[inset_0_1px_0_hsl(var(--foreground)/0.035)]">
                      12
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="grid min-w-0 gap-3 xl:grid-cols-[minmax(0,1fr)_26rem]" data-reveal>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
              <p className="text-sm font-medium text-foreground">Guardrail exceptions</p>
            </div>
            <Button
              className="min-h-8 px-3 text-xs"
              icon={<SlidersHorizontal className="h-3.5 w-3.5" />}
              onClick={() =>
                addToast({
                  title: "Exception filter",
                  description: "Showing high-risk certificate guardrails.",
                  intent: "info",
                })
              }
              variant="secondary"
            >
              Filter
            </Button>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[46rem] text-left text-xs">
                <thead className="bg-black/55 text-muted-foreground">
                  <tr>
                    <th className="rounded-l-md px-3 py-2 font-medium">Time</th>
                    <th className="px-3 py-2 font-medium">Client_ID</th>
                    <th className="px-3 py-2 font-medium">Violation / Rule</th>
                    <th className="px-3 py-2 font-medium">Certificate snippet</th>
                    <th className="rounded-r-md px-3 py-2 text-right font-medium">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {guardrailRows.map((row) => (
                    <tr className="text-foreground/85" key={`${row.time}-${row.rule}`}>
                      <td className="px-3 py-3 font-mono text-muted-foreground">{row.time}</td>
                      <td className="px-3 py-3 font-mono">{row.client}</td>
                      <td className="px-3 py-3">{row.rule}</td>
                      <td className="px-3 py-3 text-muted-foreground">{row.snippet}</td>
                      <td className="px-3 py-3 text-right">
                        <StatusPill tone={row.tone as keyof typeof toneBadgeClass}>
                          {row.action}
                        </StatusPill>
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
              <Database className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
              <p className="text-sm font-medium text-foreground">Ledger monitor</p>
            </div>
            <StatusPill tone="success">{chainHealth.consensusLabel} synced</StatusPill>
          </CardHeader>
          <CardContent className="grid gap-3">
            <div className="rounded-lg border border-border/55 bg-black/45 p-3 shadow-[inset_0_1px_0_hsl(var(--foreground)/0.035)]">
              <p className="text-xs text-muted-foreground">Latest certificate</p>
              <p className="mt-2 text-sm font-medium text-foreground">{latestCertificate.id}</p>
              <p className="mt-1 text-xs text-muted-foreground">{latestStudent?.fullName}</p>
              <div className="mt-3">
                <HashChip hash={demoHash} size={9} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-lg border border-border/55 bg-black/45 p-3 shadow-[inset_0_1px_0_hsl(var(--foreground)/0.035)]">
                <p className="text-xs text-muted-foreground">Issuer</p>
                <p className="mt-2 text-sm font-medium text-foreground">{latestIssuer?.city}</p>
              </div>
              <div className="rounded-lg border border-border/55 bg-black/45 p-3 shadow-[inset_0_1px_0_hsl(var(--foreground)/0.035)]">
                <p className="text-xs text-muted-foreground">Students</p>
                <p className="mt-2 font-mono text-sm font-medium text-foreground">
                  {activeStudents}
                </p>
              </div>
            </div>
            <div className="grid gap-2">
              {chainNodes.map((node) => (
                <div
                  className="grid grid-cols-[1fr_auto] items-center gap-2 rounded-lg border border-border/35 bg-black/35 px-3 py-2 shadow-[inset_0_1px_0_hsl(var(--foreground)/0.025)]"
                  key={node.id}
                >
                  <div>
                    <p className="text-xs font-medium text-foreground">{node.label}</p>
                    <p className="mt-1 text-[11px] text-muted-foreground">{node.location}</p>
                  </div>
                  <span className="font-mono text-[11px] text-muted-foreground">
                    {formatLatency(node.latencyMs)}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="grid min-w-0 gap-3 xl:grid-cols-4" data-reveal>
        {ledgerEvents.map((event) => (
          <article
            className="min-w-0 rounded-lg border border-border bg-card p-3 shadow-[inset_0_1px_0_hsl(var(--foreground)/0.035),0_20px_54px_-44px_hsl(var(--shadow-ledger)/1)]"
            key={event.id}
          >
            <div className="flex items-start justify-between gap-3">
              <Activity className="mt-0.5 h-4 w-4 text-primary" aria-hidden="true" />
              <span className="font-mono text-[11px] text-muted-foreground">
                {numberFormatter.format(event.blockNumber)}
              </span>
            </div>
            <p className="mt-3 text-sm font-medium text-foreground">{event.detail}</p>
            <p className="mt-2 text-xs text-muted-foreground">{formatDateTime(event.createdAt)}</p>
          </article>
        ))}
      </section>

      <Modal
        description="The frontend calculates a local SHA-256 and simulates the contract transaction."
        onOpenChange={setModalOpen}
        open={modalOpen}
        title="New certificate flow"
      >
        <div className="grid gap-4">
          <div className="rounded-lg border border-border/55 bg-black/45 p-4 shadow-[inset_0_1px_0_hsl(var(--foreground)/0.035)]">
            <div className="flex items-center gap-2">
              <Fingerprint className="h-4 w-4 text-primary" aria-hidden="true" />
              <p className="text-sm font-semibold text-foreground">
                Certificate of grades - Distributed Systems
              </p>
            </div>
            <div className="mt-4 grid gap-2 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <WalletCards className="h-4 w-4" aria-hidden="true" />
                Student wallet bound to Carla Mendoza Quiroga
              </div>
              <div className="flex items-center gap-2">
                <KeyRound className="h-4 w-4" aria-hidden="true" />
                UMSA issuer signature required
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-3">
            <Button onClick={() => setModalOpen(false)} variant="ghost">
              Cancel
            </Button>
            <Button
              icon={<FileSignature className="h-4 w-4" aria-hidden="true" />}
              onClick={simulateIssue}
            >
              Calculate hash
            </Button>
          </div>
        </div>
      </Modal>
    </MotionPage>
  );
}

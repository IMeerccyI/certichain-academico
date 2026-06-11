import { useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { useGSAP } from "@gsap/react";
import { gsap } from "gsap";
import {
  Activity,
  BadgeCheck,
  Blocks,
  Building2,
  Database,
  Eye,
  FileWarning,
  GitBranch,
  GraduationCap,
  Landmark,
  Network,
  RadioTower,
  ShieldCheck,
  ShieldOff,
  UsersRound,
  Zap,
} from "lucide-react";
import { MotionPage } from "@/components/motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { StatusBadge } from "@/components/ui/status-badge";
import { chainNodes } from "@/data/fixture-data";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { cn } from "@/lib/cn";
import { formatDateTime, numberFormatter } from "@/lib/formatters";
import { shortenHash } from "@/lib/hash";
import { setMotionCompleteState, shouldSkipMotion } from "@/lib/motion";
import { useAppStore } from "@/store/app-store";

type ScenarioMode = "idle" | "failure" | "consensus" | "replication" | "immutability";

type NetworkNodeView = {
  description: string;
  icon: ReactNode;
  id: string;
  label: string;
  state: "online" | "warning" | "offline" | "syncing";
  status: string;
};

const concepts = [
  {
    label: "Replicacion",
    text: "Cada nodo conserva una copia del ledger y puede responder consultas.",
  },
  {
    label: "Consenso",
    text: "Los nodos aceptan un bloque cuando la mayoria valida el mismo estado.",
  },
  {
    label: "Tolerancia a fallos",
    text: "La red sigue operativa aunque la universidad emisora quede fuera de linea.",
  },
  {
    label: "Inmutabilidad",
    text: "Un evento confirmado no se borra; cualquier correccion agrega otro evento.",
  },
  {
    label: "Transparencia",
    text: "Actores externos pueden auditar hashes, bloques y metodos.",
  },
  {
    label: "Escalabilidad",
    text: "Nuevas universidades se agregan como emisores y replicas sin cambiar el flujo.",
  },
  {
    label: "Disponibilidad",
    text: "La verificacion publica consulta la red, no una oficina especifica.",
  },
  {
    label: "Seguridad distribuida",
    text: "Hash SHA-256, firmas y consenso reducen falsificacion documental.",
  },
];

function MetricTile({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-md border border-border/60 bg-muted/48 p-3">
      <div className="flex items-center justify-between gap-3">
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-md border border-border/60 bg-secondary text-muted-foreground">
          {icon}
        </span>
        <span className="font-mono text-xl font-semibold text-foreground">{value}</span>
      </div>
      <p className="mt-3 text-[11px] font-semibold uppercase text-muted-foreground">{label}</p>
    </div>
  );
}

function nodeTone(state: NetworkNodeView["state"]) {
  if (state === "online") {
    return "online" as const;
  }

  if (state === "offline") {
    return "offline" as const;
  }

  if (state === "warning") {
    return "warning" as const;
  }

  return "syncing" as const;
}

export function AuditPage() {
  const pageRef = useRef<HTMLDivElement>(null);
  const blockchainEvents = useAppStore((state) => state.blockchainEvents);
  const certificates = useAppStore((state) => state.certificates);
  const verificationAttempts = useAppStore((state) => state.verificationAttempts);
  const reducedMotion = useReducedMotion();
  const [mode, setMode] = useState<ScenarioMode>("idle");
  const [issuerOffline, setIssuerOffline] = useState(false);
  const [replicationStep, setReplicationStep] = useState(0);
  const [consensusStep, setConsensusStep] = useState(0);
  const [immutabilityLocked, setImmutabilityLocked] = useState(false);

  const latestBlock = Math.max(...blockchainEvents.map((event) => event.blockNumber));
  const syncedNodes = chainNodes.filter((node) => node.status === "synced").length;
  const consensusPercent = Math.round((syncedNodes / chainNodes.length) * 100);
  const latestEvents = blockchainEvents.slice(0, 4);

  const networkNodes = useMemo<NetworkNodeView[]>(
    () => [
      {
        description: "Emite PDF, calcula hash y firma la emision.",
        icon: <Landmark className="h-5 w-5" aria-hidden="true" />,
        id: "issuer",
        label: "Universidad emisora",
        state: issuerOffline ? "offline" : "online",
        status: issuerOffline ? "Fuera de linea" : "Operativa",
      },
      {
        description: "Replica eventos, valida consenso y conserva historial.",
        icon: <Blocks className="h-5 w-5" aria-hidden="true" />,
        id: "chain",
        label: "Blockchain Ethereum",
        state: mode === "consensus" || mode === "replication" ? "syncing" : "online",
        status: mode === "consensus" ? "Consenso activo" : "Ledger disponible",
      },
      {
        description: "Recibe certificado y firma recepcion.",
        icon: <GraduationCap className="h-5 w-5" aria-hidden="true" />,
        id: "student",
        label: "Estudiante",
        state: mode === "replication" ? "syncing" : "online",
        status: "Wallet vinculada",
      },
      {
        description: "Consulta autenticidad sin depender de la universidad.",
        icon: <Building2 className="h-5 w-5" aria-hidden="true" />,
        id: "verifier",
        label: "Entidad verificadora",
        state: issuerOffline ? "syncing" : "online",
        status: issuerOffline ? "Verificacion disponible" : "Consulta publica",
      },
    ],
    [issuerOffline, mode],
  );

  useGSAP(
    () => {
      const page = pageRef.current;

      if (!page) {
        return;
      }

      const panels = page.querySelectorAll("[data-audit-panel]");

      if (shouldSkipMotion(reducedMotion)) {
        setMotionCompleteState(panels);
        return;
      }

      const timeline = gsap.timeline({ defaults: { duration: 0.3, ease: "power2.out" } });
      timeline.fromTo(
        panels,
        { autoAlpha: 0, y: 10, scale: 0.99 },
        { autoAlpha: 1, y: 0, scale: 1, stagger: 0.05 },
      );

      return () => timeline.kill();
    },
    { dependencies: [reducedMotion], scope: pageRef },
  );

  useGSAP(
    () => {
      const page = pageRef.current;

      if (!page || mode === "idle") {
        return;
      }

      const nodes = page.querySelectorAll("[data-network-node]");
      const pulse = page.querySelector("[data-transaction-pulse]");
      const replicas = page.querySelectorAll("[data-replica-card]");

      if (shouldSkipMotion(reducedMotion)) {
        setMotionCompleteState(nodes);
        setMotionCompleteState(replicas);
        return;
      }

      const timeline = gsap.timeline({ defaults: { duration: 0.28, ease: "power2.out" } });
      timeline
        .fromTo(nodes, { y: 4 }, { y: 0, stagger: 0.035 })
        .fromTo(pulse, { autoAlpha: 0, scaleX: 0.18 }, { autoAlpha: 1, scaleX: 1, duration: 0.36 }, "<")
        .to(pulse, { autoAlpha: 0, duration: 0.16 })
        .fromTo(replicas, { autoAlpha: 0.65, y: 5 }, { autoAlpha: 1, y: 0, stagger: 0.035 }, "-=0.08");

      return () => timeline.kill();
    },
    { dependencies: [mode, reducedMotion, replicationStep, consensusStep, immutabilityLocked], revertOnUpdate: true, scope: pageRef },
  );

  const runFailureScenario = () => {
    setMode("failure");
    setIssuerOffline((current) => !current);
  };

  const runConsensusScenario = () => {
    setMode("consensus");
    setConsensusStep((current) => current + 1);
  };

  const runReplicationScenario = () => {
    setMode("replication");
    setReplicationStep((current) => current + 1);
  };

  const runImmutabilityScenario = () => {
    setMode("immutability");
    setImmutabilityLocked(true);
  };

  return (
    <div ref={pageRef}>
      <MotionPage
        className="grid min-w-0 gap-3"
        data-testid="distributed-audit-workspace"
        staggerSelector="[data-audit-panel]"
      >
        <section
          className="rounded-lg border border-border bg-card p-4 shadow-[inset_0_1px_0_hsl(var(--foreground)/0.035),0_24px_70px_-46px_hsl(var(--shadow-ledger)/1)]"
          data-audit-panel
        >
          <div className="flex min-w-0 flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div className="min-w-0">
              <div className="mb-3 flex flex-wrap gap-2">
                <StatusBadge tone="syncing">Sistemas distribuidos</StatusBadge>
                <StatusBadge tone={issuerOffline ? "warning" : "online"}>
                  {issuerOffline ? "Universidad fuera de linea" : "Red operativa"}
                </StatusBadge>
                <StatusBadge tone="neutral">Auditoria visual</StatusBadge>
              </div>
              <h1 className="text-2xl font-semibold tracking-tight text-foreground">
                Auditoria Distribuida
              </h1>
              <p className="mt-1 max-w-3xl text-sm leading-6 text-muted-foreground">
                Muestra como la universidad emisora, la blockchain, el estudiante y una entidad
                verificadora comparten evidencia. La vista muestra por que la verificacion continua
                aunque un actor quede fuera de linea.
              </p>
            </div>
            <div className="grid grid-cols-3 gap-2 sm:min-w-[23rem]">
              <MetricTile
                icon={<Database className="h-4 w-4" aria-hidden="true" />}
                label="Eventos replicados"
                value={numberFormatter.format(blockchainEvents.length)}
              />
              <MetricTile
                icon={<RadioTower className="h-4 w-4" aria-hidden="true" />}
                label="Consenso de red"
                value={`${consensusPercent}%`}
              />
              <MetricTile
                icon={<Eye className="h-4 w-4" aria-hidden="true" />}
                label="Consultas"
                value={numberFormatter.format(verificationAttempts.length)}
              />
            </div>
          </div>
        </section>

        <section className="grid min-w-0 gap-3 xl:grid-cols-[minmax(0,1fr)_minmax(20rem,0.42fr)]">
          <Card data-audit-panel>
            <CardHeader className="flex flex-row items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Network className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                <p className="text-sm font-semibold text-foreground">Red distribuida de verificacion</p>
              </div>
              <StatusBadge tone={issuerOffline ? "warning" : "online"}>
                {issuerOffline ? "Degradada" : "Sincronizada"}
              </StatusBadge>
            </CardHeader>
            <CardContent>
              <div
                className="relative grid gap-3 rounded-lg border border-border/55 bg-muted/55 p-3 md:grid-cols-2"
                data-testid="distributed-network"
              >
                <div
                  className="pointer-events-none absolute left-[12%] right-[12%] top-1/2 hidden h-px origin-left bg-primary/35 md:block"
                  data-transaction-pulse
                />
                {networkNodes.map((node) => (
                  <div
                    className={cn(
                      "relative z-10 min-h-40 rounded-md border border-border/60 bg-card/95 p-4",
                      node.state === "offline" && "border-destructive/35 bg-destructive/10",
                      node.state === "syncing" && "border-primary/30 bg-primary/10",
                    )}
                    data-network-node
                    key={node.id}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-md border border-border/60 bg-secondary text-primary">
                        {node.icon}
                      </span>
                      <StatusBadge tone={nodeTone(node.state)}>{node.status}</StatusBadge>
                    </div>
                    <p className="mt-4 text-sm font-semibold text-foreground">{node.label}</p>
                    <p className="mt-2 text-xs leading-5 text-muted-foreground">{node.description}</p>
                    <p className="mt-3 font-mono text-[11px] text-muted-foreground">
                      Bloque #{numberFormatter.format(latestBlock)}
                    </p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card data-audit-panel>
            <CardHeader className="flex flex-row items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Zap className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                <p className="text-sm font-semibold text-foreground">Escenarios interactivos</p>
              </div>
              <StatusBadge tone="neutral">{mode}</StatusBadge>
            </CardHeader>
            <CardContent className="grid gap-3">
              <Button
                icon={<ShieldOff className="h-4 w-4" aria-hidden="true" />}
                onClick={runFailureScenario}
                variant={issuerOffline ? "secondary" : "danger"}
              >
                Probar caida universidad
              </Button>
              <Button
                icon={<GitBranch className="h-4 w-4" aria-hidden="true" />}
                onClick={runConsensusScenario}
                variant="secondary"
              >
                Probar consenso
              </Button>
              <Button
                icon={<Database className="h-4 w-4" aria-hidden="true" />}
                onClick={runReplicationScenario}
                variant="secondary"
              >
                Probar replicacion
              </Button>
              <Button
                icon={<FileWarning className="h-4 w-4" aria-hidden="true" />}
                onClick={runImmutabilityScenario}
                variant="secondary"
              >
                Probar inmutabilidad
              </Button>
              <div className="rounded-md border border-border/55 bg-muted/50 p-3">
                <p className="text-xs font-semibold text-foreground">
                  {issuerOffline
                    ? "La verificacion sigue disponible por las replicas de Ethereum."
                    : "La red esta lista para probar tolerancia a fallos."}
                </p>
                <p className="mt-2 text-[11px] leading-5 text-muted-foreground">
                  La universidad puede emitir, pero no es el unico punto de lectura. La entidad
                  verificadora consulta hashes replicados.
                </p>
              </div>
              {immutabilityLocked ? (
                <div className="rounded-md border border-primary/30 bg-primary/10 p-3 text-xs font-semibold text-primary">
                  Bloque protegido: intento de edicion rechazado, se requiere nuevo evento.
                </div>
              ) : null}
            </CardContent>
          </Card>
        </section>

        <section className="grid min-w-0 gap-3 xl:grid-cols-[minmax(0,0.6fr)_minmax(0,0.4fr)]">
          <Card data-audit-panel>
            <CardHeader className="flex flex-row items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Database className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                <p className="text-sm font-semibold text-foreground">Ledger replicado</p>
              </div>
              <StatusBadge tone={mode === "replication" ? "online" : "syncing"}>
                {mode === "replication" ? "Replica sincronizada" : "Replica lista"}
              </StatusBadge>
            </CardHeader>
            <CardContent>
              <div className="grid gap-2 md:grid-cols-2" data-testid="replicated-ledger">
                {chainNodes.map((node, index) => {
                  const synced = mode === "replication" || node.status === "synced";
                  const blockOffset = mode === "replication" ? 0 : Math.max(0, latestBlock - node.latestBlock);

                  return (
                    <div
                      className={cn(
                        "rounded-md border border-border/55 bg-muted/50 p-3",
                        synced && "border-success/25 bg-success/10",
                        node.status === "lagging" && mode !== "replication" && "border-warning/30 bg-warning/10",
                      )}
                      data-replica-card
                      key={node.id}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-xs font-semibold text-foreground">{node.label}</p>
                          <p className="mt-1 text-[11px] text-muted-foreground">{node.location}</p>
                        </div>
                        <StatusBadge tone={synced ? "online" : "warning"}>
                          {synced ? "Replica sincronizada" : "Atraso"}
                        </StatusBadge>
                      </div>
                      <div className="mt-3 grid gap-1">
                        <div className="flex justify-between text-[11px] text-muted-foreground">
                          <span>Bloque local</span>
                          <span className="font-mono text-foreground">
                            {numberFormatter.format(mode === "replication" ? latestBlock : node.latestBlock)}
                          </span>
                        </div>
                        <Progress value={synced ? 100 : 74 - index * 4} />
                        <p className="text-[11px] text-muted-foreground">
                          {blockOffset === 0 ? "Replica sincronizada" : `${blockOffset} bloques por alcanzar`}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          <Card data-audit-panel>
            <CardHeader className="flex flex-row items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <GitBranch className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                <p className="text-sm font-semibold text-foreground">Timeline de consenso</p>
              </div>
              <StatusBadge tone={mode === "consensus" ? "online" : "neutral"}>
                {mode === "consensus" ? "Activo" : "En espera"}
              </StatusBadge>
            </CardHeader>
            <CardContent>
              <ol className="grid gap-2" data-testid="consensus-timeline">
                {[
                  ["Propuesta", "La universidad propone registrar un hash."],
                  ["Validacion", "Nodos comparan formato, firma y bloque previo."],
                  ["Confirmacion", "La mayoria acepta y replica el evento."],
                ].map(([label, text], index) => (
                  <li
                    className={cn(
                      "rounded-md border border-border/55 bg-muted/45 p-3",
                      mode === "consensus" && index <= 2 && "border-primary/30 bg-primary/10",
                    )}
                    key={label}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-xs font-semibold text-foreground">{label}</p>
                      <span className="font-mono text-[11px] text-muted-foreground">
                        0{index + 1}
                      </span>
                    </div>
                    <p className="mt-1 text-[11px] leading-5 text-muted-foreground">{text}</p>
                  </li>
                ))}
              </ol>
            </CardContent>
          </Card>
        </section>

        <section className="grid gap-3 md:grid-cols-2" data-audit-panel>
          <Card>
            <CardHeader className="flex flex-row items-center gap-2">
              <UsersRound className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
              <p className="text-sm font-semibold text-foreground">Sistema tradicional</p>
            </CardHeader>
            <CardContent className="grid gap-2 text-xs leading-5 text-muted-foreground">
              <p>Validacion por llamada, correo o atencion presencial.</p>
              <p>La universidad es punto unico de disponibilidad.</p>
              <p>Correcciones administrativas pueden perder contexto historico.</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center gap-2">
              <BadgeCheck className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
              <p className="text-sm font-semibold text-foreground">Sistema descentralizado</p>
            </CardHeader>
            <CardContent className="grid gap-2 text-xs leading-5 text-muted-foreground">
              <p>Verificacion publica contra hashes y eventos replicados.</p>
              <p>La caida del emisor no bloquea consultas de autenticidad.</p>
              <p>Revocaciones y recepciones agregan eventos sin borrar historial.</p>
            </CardContent>
          </Card>
        </section>

        <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4" data-audit-panel>
          {concepts.map((concept) => (
            <div className="rounded-lg border border-border bg-card/95 p-3" key={concept.label}>
              <Activity className="h-4 w-4 text-primary" aria-hidden="true" />
              <p className="mt-2 text-xs font-semibold text-foreground">{concept.label}</p>
              <p className="mt-1 text-[11px] leading-5 text-muted-foreground">{concept.text}</p>
            </div>
          ))}
        </section>

        <Card data-audit-panel>
          <CardHeader className="flex flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
              <p className="text-sm font-semibold text-foreground">Evidencia reciente replicada</p>
            </div>
            <StatusBadge tone="neutral">{numberFormatter.format(certificates.length)} certificados</StatusBadge>
          </CardHeader>
          <CardContent>
            <ol className="grid gap-2 md:grid-cols-2 xl:grid-cols-4">
              {latestEvents.map((event) => (
                <li className="rounded-md border border-border/55 bg-muted/50 p-3" key={event.id}>
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-mono text-[11px] text-muted-foreground">
                      #{numberFormatter.format(event.blockNumber)}
                    </span>
                    <span className="font-mono text-[11px] text-muted-foreground">
                      {shortenHash(event.transactionHash, 6)}
                    </span>
                  </div>
                  <p className="mt-2 text-xs font-semibold text-foreground">{event.type}</p>
                  <p className="mt-1 text-[11px] leading-5 text-muted-foreground">{event.detail}</p>
                  <p className="mt-2 text-[11px] text-muted-foreground">
                    {formatDateTime(event.createdAt)}
                  </p>
                </li>
              ))}
            </ol>
          </CardContent>
        </Card>
      </MotionPage>
    </div>
  );
}

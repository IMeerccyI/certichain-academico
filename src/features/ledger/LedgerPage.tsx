import { useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { useGSAP } from "@gsap/react";
import { gsap } from "gsap";
import {
  Activity,
  Blocks,
  CalendarDays,
  ChevronDown,
  DatabaseZap,
  FileCheck2,
  Filter,
  Fingerprint,
  History,
  Link2,
  Search,
  ShieldCheck,
} from "lucide-react";
import { MotionPage } from "@/components/motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { StatusBadge } from "@/components/ui/status-badge";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { cn } from "@/lib/cn";
import { formatDateTime, numberFormatter } from "@/lib/formatters";
import { shortenHash } from "@/lib/hash";
import { setMotionCompleteState, shouldSkipMotion } from "@/lib/motion";
import { useAppStore } from "@/store/app-store";
import type { BlockchainEvent, BlockchainEventType, Certificate } from "@/types/domain";

type EventTypeFilter = BlockchainEventType | "all";
type MethodFilter = ContractMethod | "all";

type ContractMethod =
  | "autorizarEmisor()"
  | "desactivarEmisor()"
  | "emitirCertificado()"
  | "firmarRecepcion()"
  | "mintNFT()"
  | "revocarCertificado()"
  | "verificarCertificado()";

type LedgerRow = {
  actorLabel: string;
  certificate?: Certificate;
  event: BlockchainEvent;
  method: ContractMethod;
  statusLabel: "Confirmado" | "Fallido";
};

const eventTypeLabels: Record<BlockchainEventType, string> = {
  certificate_issued: "Certificado emitido",
  certificate_revoked: "Certificado revocado",
  certificate_verified: "Certificado verificado",
  issuer_authorized: "Emisor autorizado",
  issuer_deactivated: "Emisor desactivado",
  nft_minted: "NFT minteado",
  student_received: "Firma de recepcion",
  verification_failed: "Intento de verificacion fallido",
};

const methodByEventType: Record<BlockchainEventType, ContractMethod> = {
  certificate_issued: "emitirCertificado()",
  certificate_revoked: "revocarCertificado()",
  certificate_verified: "verificarCertificado()",
  issuer_authorized: "autorizarEmisor()",
  issuer_deactivated: "desactivarEmisor()",
  nft_minted: "mintNFT()",
  student_received: "firmarRecepcion()",
  verification_failed: "verificarCertificado()",
};

const eventTypeOrder: EventTypeFilter[] = [
  "all",
  "certificate_issued",
  "certificate_verified",
  "certificate_revoked",
  "issuer_authorized",
  "issuer_deactivated",
  "student_received",
  "verification_failed",
];

const methodOrder: MethodFilter[] = [
  "all",
  "emitirCertificado()",
  "verificarCertificado()",
  "revocarCertificado()",
  "autorizarEmisor()",
  "desactivarEmisor()",
  "firmarRecepcion()",
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
    <div className="rounded-md border border-border/60 bg-black/38 p-3">
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

function FieldLine({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="grid grid-cols-[minmax(0,0.78fr)_minmax(0,1.22fr)] gap-3 border-b border-border/45 py-2 last:border-b-0">
      <span className="text-[11px] font-medium text-muted-foreground">{label}</span>
      <span className="min-w-0 break-words text-right text-xs font-semibold text-foreground">
        {value}
      </span>
    </div>
  );
}

function eventStatus(event: BlockchainEvent) {
  return event.type === "verification_failed" ? "Fallido" : "Confirmado";
}

export function LedgerPage() {
  const pageRef = useRef<HTMLDivElement>(null);
  const blockchainEvents = useAppStore((state) => state.blockchainEvents);
  const certificates = useAppStore((state) => state.certificates);
  const issuers = useAppStore((state) => state.issuers);
  const students = useAppStore((state) => state.students);
  const verifierEntities = useAppStore((state) => state.verifierEntities);
  const reducedMotion = useReducedMotion();
  const [typeFilter, setTypeFilter] = useState<EventTypeFilter>("all");
  const [methodFilter, setMethodFilter] = useState<MethodFilter>("all");
  const [actorFilter, setActorFilter] = useState("");
  const [dateFilter, setDateFilter] = useState("");
  const [selectedEventId, setSelectedEventId] = useState(blockchainEvents[0]?.id ?? "");

  const rows = useMemo<LedgerRow[]>(() => {
    return blockchainEvents.map((event) => {
      const certificate = certificates.find((item) => item.id === event.certificateId);
      const actor =
        issuers.find((item) => item.id === event.actor)?.name ??
        students.find((item) => item.id === event.actor)?.fullName ??
        verifierEntities.find((item) => item.id === event.actor)?.name ??
        event.actor;

      return {
        actorLabel: actor,
        certificate,
        event,
        method: methodByEventType[event.type],
        statusLabel: eventStatus(event),
      };
    });
  }, [blockchainEvents, certificates, issuers, students, verifierEntities]);

  const filteredRows = useMemo(() => {
    const actorQuery = actorFilter.trim().toLowerCase();

    return rows.filter((row) => {
      const matchesType = typeFilter === "all" || row.event.type === typeFilter;
      const matchesMethod = methodFilter === "all" || row.method === methodFilter;
      const matchesActor =
        !actorQuery ||
        row.actorLabel.toLowerCase().includes(actorQuery) ||
        row.event.actor.toLowerCase().includes(actorQuery) ||
        row.event.actorRole.toLowerCase().includes(actorQuery);
      const matchesDate = !dateFilter || row.event.createdAt.slice(0, 10) === dateFilter;

      return matchesType && matchesMethod && matchesActor && matchesDate;
    });
  }, [actorFilter, dateFilter, methodFilter, rows, typeFilter]);

  const selectedRow =
    filteredRows.find((row) => row.event.id === selectedEventId) ??
    filteredRows[0] ??
    rows.find((row) => row.event.id === selectedEventId) ??
    rows[0];
  const latestBlock = Math.max(...blockchainEvents.map((event) => event.blockNumber));
  const failedCount = rows.filter((row) => row.statusLabel === "Fallido").length;

  useGSAP(
    () => {
      const page = pageRef.current;

      if (!page) {
        return;
      }

      const panels = page.querySelectorAll("[data-ledger-panel]");

      if (shouldSkipMotion(reducedMotion)) {
        setMotionCompleteState(panels);
        return;
      }

      const timeline = gsap.timeline({ defaults: { duration: 0.28, ease: "power2.out" } });
      timeline.fromTo(
        panels,
        { autoAlpha: 0, y: 10, scale: 0.99 },
        { autoAlpha: 1, y: 0, scale: 1, stagger: 0.045 },
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

      const rowsToAnimate = page.querySelectorAll("[data-ledger-row]");

      const timeline = gsap.timeline({ defaults: { duration: 0.22, ease: "power2.out" } });
      timeline.fromTo(rowsToAnimate, { autoAlpha: 0, y: 6 }, { autoAlpha: 1, y: 0, stagger: 0.025 });

      return () => timeline.kill();
    },
    {
      dependencies: [actorFilter, dateFilter, methodFilter, reducedMotion, typeFilter],
      revertOnUpdate: true,
      scope: pageRef,
    },
  );

  return (
    <div ref={pageRef}>
      <MotionPage
        className="grid min-w-0 gap-3"
        data-testid="ledger-workspace"
        staggerSelector="[data-ledger-panel]"
      >
        <section
          className="rounded-lg border border-border bg-card p-4 shadow-[inset_0_1px_0_hsl(var(--foreground)/0.035),0_24px_70px_-46px_hsl(var(--shadow-ledger)/1)]"
          data-ledger-panel
        >
          <div className="flex min-w-0 flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div className="min-w-0">
              <div className="mb-3 flex flex-wrap gap-2">
                <StatusBadge tone="syncing">Eventos reales del store</StatusBadge>
                <StatusBadge tone="online">Ledger replicado</StatusBadge>
                <StatusBadge tone="neutral">Contrato academico mock</StatusBadge>
              </div>
              <h1 className="text-2xl font-semibold tracking-tight text-foreground">
                Ledger Blockchain
              </h1>
              <p className="mt-1 max-w-3xl text-sm leading-6 text-muted-foreground">
                Explorador forense de eventos generados por la DApp. Cada fila representa una
                accion del contrato inteligente mock con hash de transaccion, bloque, actor,
                metodo y certificado relacionado.
              </p>
            </div>
            <div className="grid grid-cols-3 gap-2 sm:min-w-[23rem]">
              <MetricTile
                icon={<DatabaseZap className="h-4 w-4" aria-hidden="true" />}
                label="Eventos"
                value={numberFormatter.format(blockchainEvents.length)}
              />
              <MetricTile
                icon={<Blocks className="h-4 w-4" aria-hidden="true" />}
                label="Bloque final"
                value={numberFormatter.format(latestBlock)}
              />
              <MetricTile
                icon={<ShieldCheck className="h-4 w-4" aria-hidden="true" />}
                label="Fallidos"
                value={numberFormatter.format(failedCount)}
              />
            </div>
          </div>
        </section>

        <Card data-ledger-panel>
          <CardHeader className="flex flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
              <p className="text-sm font-semibold text-foreground">Filtros del ledger</p>
            </div>
            <StatusBadge tone="neutral">{numberFormatter.format(filteredRows.length)} visibles</StatusBadge>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(12rem,0.3fr)]">
              <label className="grid gap-2 text-xs font-semibold text-foreground">
                Filtro por actor
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    aria-label="Filtro por actor"
                    className="pl-9"
                    onChange={(event) => setActorFilter(event.target.value)}
                    placeholder="issuer, verifier, estudiante..."
                    value={actorFilter}
                  />
                </div>
              </label>
              <label className="grid gap-2 text-xs font-semibold text-foreground">
                Filtro por fecha
                <div className="relative">
                  <CalendarDays className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    aria-label="Filtro por fecha"
                    className="pl-9"
                    onChange={(event) => setDateFilter(event.target.value)}
                    type="date"
                    value={dateFilter}
                  />
                </div>
              </label>
            </div>

            <div className="grid gap-2">
              <p className="text-xs font-semibold text-muted-foreground">Filtro por tipo de evento</p>
              <div className="flex gap-2 overflow-x-auto pb-1">
                {eventTypeOrder.map((type) => (
                  <button
                    className={cn(
                      "shrink-0 rounded-md border px-3 py-1.5 text-xs font-semibold transition-colors",
                      typeFilter === type
                        ? "border-primary/35 bg-primary/10 text-primary"
                        : "border-border/70 bg-black/35 text-muted-foreground hover:bg-secondary hover:text-foreground",
                    )}
                    key={type}
                    onClick={() => setTypeFilter(type)}
                    type="button"
                  >
                    {type === "all" ? "Todos" : type}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid gap-2">
              <p className="text-xs font-semibold text-muted-foreground">Filtro por metodo de contrato</p>
              <div className="flex gap-2 overflow-x-auto pb-1">
                {methodOrder.map((method) => (
                  <button
                    className={cn(
                      "shrink-0 rounded-md border px-3 py-1.5 text-xs font-semibold transition-colors",
                      methodFilter === method
                        ? "border-primary/35 bg-primary/10 text-primary"
                        : "border-border/70 bg-black/35 text-muted-foreground hover:bg-secondary hover:text-foreground",
                    )}
                    key={method}
                    onClick={() => setMethodFilter(method)}
                    type="button"
                  >
                    {method === "all" ? "Todos los metodos" : method}
                  </button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        <section className="grid min-w-0 gap-3 xl:grid-cols-[minmax(0,1fr)_minmax(20rem,0.42fr)]">
          <Card data-ledger-panel>
            <CardHeader className="flex flex-row items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Link2 className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                <p className="text-sm font-semibold text-foreground">Tabla de eventos</p>
              </div>
              <StatusBadge tone="syncing">Confirmaciones simuladas</StatusBadge>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto rounded-lg border border-border bg-black/30">
                <table className="w-full min-w-[72rem] text-left text-xs" data-testid="ledger-events-table">
                  <thead className="bg-black/55 text-muted-foreground">
                    <tr>
                      <th className="px-3 py-2 font-medium">ID</th>
                      <th className="px-3 py-2 font-medium">Tipo</th>
                      <th className="px-3 py-2 font-medium">Timestamp</th>
                      <th className="px-3 py-2 text-right font-medium">Bloque</th>
                      <th className="px-3 py-2 font-medium">Hash de transaccion</th>
                      <th className="px-3 py-2 font-medium">Actor</th>
                      <th className="px-3 py-2 font-medium">Metodo</th>
                      <th className="px-3 py-2 font-medium">Certificado relacionado</th>
                      <th className="px-3 py-2 font-medium">Estado</th>
                      <th className="px-3 py-2 font-medium">Datos resumidos</th>
                      <th className="px-3 py-2 text-right font-medium">Detalle</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/70">
                    {filteredRows.map((row) => {
                      const active = selectedRow?.event.id === row.event.id;

                      return (
                        <tr
                          className={cn(
                            "text-foreground/85 transition-colors hover:bg-secondary/45",
                            active && "bg-secondary/35",
                          )}
                          data-ledger-row
                          key={row.event.id}
                        >
                          <td className="px-3 py-3 font-mono text-[11px] text-muted-foreground">
                            {row.event.id}
                          </td>
                          <td className="px-3 py-3">
                            <div className="font-semibold text-foreground">{row.event.type}</div>
                            <div className="mt-1 text-[11px] text-muted-foreground">
                              {eventTypeLabels[row.event.type]}
                            </div>
                          </td>
                          <td className="px-3 py-3">{formatDateTime(row.event.createdAt)}</td>
                          <td className="px-3 py-3 text-right font-mono">
                            {numberFormatter.format(row.event.blockNumber)}
                          </td>
                          <td className="px-3 py-3 font-mono text-[11px] text-muted-foreground">
                            {shortenHash(row.event.transactionHash, 8)}
                          </td>
                          <td className="px-3 py-3">
                            <div className="font-semibold text-foreground">{row.actorLabel}</div>
                            <div className="mt-1 text-[11px] text-muted-foreground">{row.event.actorRole}</div>
                          </td>
                          <td className="px-3 py-3 font-mono text-[11px]">{row.method}</td>
                          <td className="px-3 py-3 font-mono text-[11px]">
                            {row.certificate?.code ?? "Sin certificado"}
                          </td>
                          <td className="px-3 py-3">
                            <StatusBadge tone={row.statusLabel === "Confirmado" ? "online" : "warning"}>
                              {row.statusLabel}
                            </StatusBadge>
                          </td>
                          <td className="max-w-[16rem] truncate px-3 py-3 text-muted-foreground">
                            {row.event.detail}
                          </td>
                          <td className="px-3 py-3 text-right">
                            <Button
                              className="min-h-7 px-2 py-1"
                              icon={<ChevronDown className="h-3.5 w-3.5" aria-hidden="true" />}
                              onClick={() => setSelectedEventId(row.event.id)}
                              variant={active ? "primary" : "secondary"}
                            >
                              {active ? "Expandir detalle" : "Ver"}
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          <Card data-ledger-panel data-testid="ledger-event-detail">
            <CardHeader className="flex flex-row items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Fingerprint className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                <p className="text-sm font-semibold text-foreground">Detalle expandible</p>
              </div>
              <StatusBadge tone={selectedRow?.statusLabel === "Confirmado" ? "online" : "warning"}>
                {selectedRow?.statusLabel ?? "Sin evento"}
              </StatusBadge>
            </CardHeader>
            <CardContent className="grid gap-3">
              {selectedRow ? (
                <>
                  <div className="rounded-md border border-border/55 bg-black/45 p-3">
                    <p className="font-mono text-[11px] text-muted-foreground">{selectedRow.event.id}</p>
                    <p className="mt-2 text-sm font-semibold text-foreground">
                      {eventTypeLabels[selectedRow.event.type]}
                    </p>
                    <p className="mt-1 text-xs leading-5 text-muted-foreground">{selectedRow.event.detail}</p>
                  </div>
                  <div className="grid gap-1 rounded-md border border-border/55 bg-black/35 p-3">
                    <FieldLine label="Tipo" value={selectedRow.event.type} />
                    <FieldLine label="Timestamp" value={formatDateTime(selectedRow.event.createdAt)} />
                    <FieldLine label="Bloque" value={numberFormatter.format(selectedRow.event.blockNumber)} />
                    <FieldLine label="Hash de transaccion" value={selectedRow.event.transactionHash} />
                    <FieldLine label="Actor" value={selectedRow.actorLabel} />
                    <FieldLine label="Metodo" value={selectedRow.method} />
                    <FieldLine
                      label="Certificado relacionado"
                      value={selectedRow.certificate?.code ?? "Sin certificado asociado"}
                    />
                    <FieldLine label="Estado" value={selectedRow.statusLabel} />
                    <FieldLine label="Datos resumidos" value={selectedRow.event.detail} />
                  </div>
                </>
              ) : (
                <div className="rounded-md border border-border/55 bg-black/40 p-4 text-sm text-muted-foreground">
                  Sin eventos para los filtros seleccionados.
                </div>
              )}
            </CardContent>
          </Card>
        </section>

        <Card data-ledger-panel>
          <CardHeader className="flex flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <History className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
              <p className="text-sm font-semibold text-foreground">Timeline de eventos</p>
            </div>
            <StatusBadge tone="neutral">Orden por bloque</StatusBadge>
          </CardHeader>
          <CardContent>
            <ol className="grid gap-2 md:grid-cols-2 xl:grid-cols-4">
              {filteredRows.slice(0, 8).map((row) => (
                <li
                  className="rounded-md border border-border/55 bg-black/40 p-3"
                  data-ledger-timeline-item
                  key={row.event.id}
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-mono text-[11px] text-muted-foreground">
                      #{numberFormatter.format(row.event.blockNumber)}
                    </span>
                    <StatusBadge tone={row.statusLabel === "Confirmado" ? "online" : "warning"}>
                      {row.statusLabel}
                    </StatusBadge>
                  </div>
                  <p className="mt-2 text-xs font-semibold text-foreground">{row.event.type}</p>
                  <p className="mt-1 text-[11px] leading-5 text-muted-foreground">{row.event.detail}</p>
                </li>
              ))}
            </ol>
          </CardContent>
        </Card>

        <section className="grid gap-3 md:grid-cols-4" data-ledger-panel>
          <div className="rounded-lg border border-border bg-card/95 p-3">
            <FileCheck2 className="h-4 w-4 text-primary" aria-hidden="true" />
            <p className="mt-2 text-xs font-semibold text-foreground">Certificado emitido</p>
            <p className="mt-1 text-[11px] leading-5 text-muted-foreground">
              Registra hash SHA-256, emisor y bloque.
            </p>
          </div>
          <div className="rounded-lg border border-border bg-card/95 p-3">
            <ShieldCheck className="h-4 w-4 text-primary" aria-hidden="true" />
            <p className="mt-2 text-xs font-semibold text-foreground">Certificado verificado</p>
            <p className="mt-1 text-[11px] leading-5 text-muted-foreground">
              Evidencia consulta publica independiente.
            </p>
          </div>
          <div className="rounded-lg border border-border bg-card/95 p-3">
            <Activity className="h-4 w-4 text-primary" aria-hidden="true" />
            <p className="mt-2 text-xs font-semibold text-foreground">Certificado revocado</p>
            <p className="mt-1 text-[11px] leading-5 text-muted-foreground">
              No borra historial, agrega un nuevo evento.
            </p>
          </div>
          <div className="rounded-lg border border-border bg-card/95 p-3">
            <Blocks className="h-4 w-4 text-primary" aria-hidden="true" />
            <p className="mt-2 text-xs font-semibold text-foreground">Firma de recepcion</p>
            <p className="mt-1 text-[11px] leading-5 text-muted-foreground">
              El estudiante confirma recepcion con traza.
            </p>
          </div>
        </section>
      </MotionPage>
    </div>
  );
}

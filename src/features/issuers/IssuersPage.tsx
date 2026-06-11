import { useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import * as TabsPrimitive from "@radix-ui/react-tabs";
import { useGSAP } from "@gsap/react";
import { gsap } from "gsap";
import {
  Activity,
  BadgeCheck,
  Building2,
  Eye,
  FileCheck2,
  History,
  KeyRound,
  LockKeyhole,
  ShieldCheck,
  ShieldOff,
  UserCheck,
} from "lucide-react";
import { MotionPage } from "@/components/motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { canManageIssuers as roleCanManageIssuers } from "@/lib/ui-permissions";
import { cn } from "@/lib/cn";
import { formatDateTime, numberFormatter } from "@/lib/formatters";
import { shortenHash } from "@/lib/hash";
import { setMotionCompleteState, shouldSkipMotion } from "@/lib/motion";
import { useAppStore } from "@/store/app-store";
import type {
  BlockchainEvent,
  Certificate,
  CertificateStatus,
  Issuer,
  VerifierEntity,
  VerificationAttempt,
} from "@/types/domain";

type ActorTab = "issuers" | "verifiers";

type IssuerView = {
  certificates: Certificate[];
  events: BlockchainEvent[];
  issuedCount: number;
  issuer: Issuer;
  lastActivity: string;
  permissions: string[];
  revokedCount: number;
};

type VerifierView = {
  attempts: VerificationAttempt[];
  certificatesConsulted: number;
  entity: VerifierEntity;
  invalidResults: number;
  lastAttempt?: VerificationAttempt;
  validResults: number;
};

const entityTypeLabels: Record<VerifierEntity["type"], string> = {
  government: "Institucion gubernamental",
  human_resources: "Recursos humanos",
  private_company: "Empresa privada",
  professional_board: "Colegio profesional",
  scholarship_unit: "Unidad de becas",
  university: "Universidad",
};

const statusLabels: Record<CertificateStatus, string> = {
  manipulated: "No valido",
  not_found: "No encontrado",
  pending_reception: "Pendiente",
  revoked: "Revocado",
  valid: "Valido",
};

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

function permissionSet(issuer: Issuer) {
  if (!issuer.active) {
    return ["Suspendido"];
  }

  const permissions = ["Emitir", "Revocar", "Consultar auditoria"];

  if (issuer.authorityLevel === "rectorate") {
    permissions.splice(2, 0, "Autorizar emisor");
  }

  if (issuer.authorityLevel === "audit") {
    return ["Consultar auditoria"];
  }

  return permissions;
}

function latestIso(values: Array<string | undefined>) {
  const sorted = values
    .filter(Boolean)
    .sort((left, right) => new Date(right ?? "").getTime() - new Date(left ?? "").getTime());

  return sorted[0] ?? new Date().toISOString();
}

function certificateIds(certificates: Certificate[]) {
  return new Set(certificates.map((certificate) => certificate.id));
}

export function IssuersPage() {
  const pageRef = useRef<HTMLDivElement>(null);
  const issuers = useAppStore((state) => state.issuers);
  const certificates = useAppStore((state) => state.certificates);
  const blockchainEvents = useAppStore((state) => state.blockchainEvents);
  const verificationAttempts = useAppStore((state) => state.verificationAttempts);
  const verifierEntities = useAppStore((state) => state.verifierEntities);
  const activeRole = useAppStore((state) => state.activeRole);
  const authorizeIssuer = useAppStore((state) => state.authorizeIssuer);
  const chainConnected = useAppStore((state) => state.chainConnected);
  const deactivateIssuer = useAppStore((state) => state.deactivateIssuer);
  const addToast = useAppStore((state) => state.addToast);
  const reducedMotion = useReducedMotion();
  const [activeTab, setActiveTab] = useState<ActorTab>("issuers");
  const [selectedIssuerId, setSelectedIssuerId] = useState(issuers[0]?.id ?? "");
  const [selectedVerifierId, setSelectedVerifierId] = useState(verifierEntities[0]?.id ?? "");
  const [changedIssuerId, setChangedIssuerId] = useState<string | null>(null);

  const issuerViews = useMemo<IssuerView[]>(() => {
    return issuers.map((issuer) => {
      const issuerCertificates = certificates.filter((certificate) => certificate.issuerId === issuer.id);
      const ids = certificateIds(issuerCertificates);
      const issuerEvents = blockchainEvents.filter(
        (event) => event.actor === issuer.id || Boolean(event.certificateId && ids.has(event.certificateId)),
      );

      return {
        certificates: issuerCertificates,
        events: issuerEvents,
        issuedCount: issuerCertificates.length,
        issuer,
        lastActivity: latestIso([
          issuer.authorizedAt,
          issuer.deactivatedAt,
          ...issuerCertificates.map((certificate) => certificate.updatedAt),
          ...issuerEvents.map((event) => event.createdAt),
        ]),
        permissions: permissionSet(issuer),
        revokedCount: issuerCertificates.filter((certificate) => certificate.status === "revoked").length,
      };
    });
  }, [blockchainEvents, certificates, issuers]);

  const verifierViews = useMemo<VerifierView[]>(() => {
    return verifierEntities.map((entity) => {
      const attempts = verificationAttempts
        .filter((attempt) => attempt.verifierEntityId === entity.id)
        .sort((left, right) => new Date(right.attemptedAt).getTime() - new Date(left.attemptedAt).getTime());
      const certificatesConsulted = new Set(
        attempts.map((attempt) => attempt.certificateCode ?? attempt.matchedCertificateId ?? attempt.documentHash),
      ).size;

      return {
        attempts,
        certificatesConsulted,
        entity,
        invalidResults: attempts.filter((attempt) => attempt.resultStatus !== "valid").length,
        lastAttempt: attempts[0],
        validResults: attempts.filter((attempt) => attempt.resultStatus === "valid").length,
      };
    });
  }, [verificationAttempts, verifierEntities]);

  const selectedIssuer = issuerViews.find((item) => item.issuer.id === selectedIssuerId) ?? issuerViews[0];
  const selectedVerifier =
    verifierViews.find((item) => item.entity.id === selectedVerifierId) ?? verifierViews[0];
  const activeIssuers = issuerViews.filter((item) => item.issuer.active).length;
  const canManageIssuers = roleCanManageIssuers(activeRole);

  useGSAP(
    () => {
      const page = pageRef.current;
      const panel = page?.querySelector(`[data-actor-tab="${activeTab}"]`);

      if (!page || !panel) {
        return;
      }

      if (shouldSkipMotion(reducedMotion)) {
        setMotionCompleteState(panel);
        return;
      }

      const timeline = gsap.timeline({ defaults: { duration: 0.25, ease: "power2.out" } });
      timeline.fromTo(panel, { autoAlpha: 0, y: 10 }, { autoAlpha: 1, y: 0 });

      return () => timeline.kill();
    },
    { dependencies: [activeTab, reducedMotion], revertOnUpdate: true, scope: pageRef },
  );

  useGSAP(
    () => {
      if (!changedIssuerId || shouldSkipMotion(reducedMotion)) {
        return;
      }

      const row = pageRef.current?.querySelector(`[data-issuer-id="${changedIssuerId}"]`);

      if (!row) {
        return;
      }

      const timeline = gsap.timeline({
        defaults: { duration: 0.22, ease: "power2.out" },
        onComplete: () => setChangedIssuerId(null),
      });
      timeline
        .fromTo(row, { x: -5 }, { x: 5, yoyo: true, repeat: 1 })
        .fromTo(row, { backgroundColor: "rgba(255,255,255,0.08)" }, { backgroundColor: "transparent" }, "<");

      return () => timeline.kill();
    },
    { dependencies: [changedIssuerId, reducedMotion], revertOnUpdate: true, scope: pageRef },
  );

  const manageIssuer = (issuer: Issuer) => {
    if (!canManageIssuers) {
      addToast({
        title: "Permiso insuficiente",
        description: "Cambia al rol administrador academico para modificar emisores.",
        intent: "warning",
      });
      return;
    }

    if (issuer.active) {
      deactivateIssuer(issuer.id);
    } else {
      authorizeIssuer(issuer.id);
    }

    setChangedIssuerId(issuer.id);
  };

  return (
    <div ref={pageRef}>
      <MotionPage
        className="grid min-w-0 gap-3"
        data-testid="issuers-workspace"
        staggerSelector="[data-actor-panel]"
      >
        <section
          className="rounded-lg border border-border bg-card p-4 shadow-[inset_0_1px_0_hsl(var(--foreground)/0.035),0_24px_70px_-46px_hsl(var(--shadow-ledger)/1)]"
          data-actor-panel
        >
          <div className="flex min-w-0 flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div className="min-w-0">
              <div className="mb-3 flex flex-wrap gap-2">
                <StatusBadge tone={chainConnected ? "online" : "warning"}>
                  {chainConnected ? "Contrato conectado" : "Contrato requerido"}
                </StatusBadge>
                <StatusBadge tone={canManageIssuers ? "online" : "warning"}>
                  {canManageIssuers ? "Administrador activo" : "Solo lectura"}
                </StatusBadge>
                <StatusBadge tone="neutral">Actores del sistema</StatusBadge>
              </div>
              <h1 className="text-2xl font-semibold tracking-tight text-foreground">
                Gestion de actores institucionales
              </h1>
              <p className="mt-1 max-w-3xl text-sm leading-6 text-muted-foreground">
                Controla wallets emisoras y observa entidades externas que consultan certificados.
                Las acciones generan eventos persistentes para demostrar autorizacion, trazabilidad
                y separacion de responsabilidades.
              </p>
            </div>
            <div className="grid grid-cols-3 gap-2 sm:min-w-[23rem]">
              <MetricTile
                icon={<KeyRound className="h-4 w-4" aria-hidden="true" />}
                label="Emisores activos"
                value={numberFormatter.format(activeIssuers)}
              />
              <MetricTile
                icon={<FileCheck2 className="h-4 w-4" aria-hidden="true" />}
                label="Certificados"
                value={numberFormatter.format(certificates.length)}
              />
              <MetricTile
                icon={<Eye className="h-4 w-4" aria-hidden="true" />}
                label="Consultas"
                value={numberFormatter.format(verificationAttempts.length)}
              />
            </div>
          </div>
        </section>

        <TabsPrimitive.Root
          className="grid gap-3"
          onValueChange={(value) => setActiveTab(value as ActorTab)}
          value={activeTab}
        >
          <TabsPrimitive.List
            aria-label="Tipos de actores"
            className="inline-flex w-fit gap-1 rounded-md border border-border bg-card p-1"
            data-actor-panel
          >
            <TabsPrimitive.Trigger
              className="rounded-sm px-3 py-1.5 text-xs font-semibold text-muted-foreground transition-colors data-[state=active]:bg-secondary data-[state=active]:text-foreground"
              value="issuers"
            >
              Emisores
            </TabsPrimitive.Trigger>
            <TabsPrimitive.Trigger
              className="rounded-sm px-3 py-1.5 text-xs font-semibold text-muted-foreground transition-colors data-[state=active]:bg-secondary data-[state=active]:text-foreground"
              value="verifiers"
            >
              Entidades verificadoras
            </TabsPrimitive.Trigger>
          </TabsPrimitive.List>

          <TabsPrimitive.Content data-actor-tab="issuers" value="issuers">
            <section className="grid min-w-0 gap-3 xl:grid-cols-[minmax(0,1fr)_minmax(20rem,0.44fr)]">
              <Card data-actor-panel>
                <CardHeader className="flex flex-row items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-foreground">Tabla de emisores</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Wallet institucional, permisos, certificados emitidos y ultima actividad.
                    </p>
                  </div>
                  <StatusBadge tone="neutral">{numberFormatter.format(issuerViews.length)} emisores</StatusBadge>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto rounded-lg border border-border bg-muted/40">
                    <table className="w-full min-w-[58rem] text-left text-xs" data-testid="issuers-table">
                      <thead className="bg-muted/65 text-muted-foreground">
                        <tr>
                          <th className="px-3 py-2 font-medium">Nombre</th>
                          <th className="px-3 py-2 font-medium">Cargo</th>
                          <th className="px-3 py-2 font-medium">Wallet institucional</th>
                          <th className="px-3 py-2 font-medium">Estado</th>
                          <th className="px-3 py-2 font-medium">Permisos</th>
                          <th className="px-3 py-2 text-right font-medium">Emitidos</th>
                          <th className="px-3 py-2 text-right font-medium">Revocados</th>
                          <th className="px-3 py-2 font-medium">Ultima actividad</th>
                          <th className="px-3 py-2 text-right font-medium">Acciones</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/70">
                        {issuerViews.map((item) => (
                          <tr
                            className={cn(
                              "cursor-pointer text-foreground/85 transition-colors hover:bg-secondary/45",
                              selectedIssuer?.issuer.id === item.issuer.id && "bg-secondary/35",
                            )}
                            data-issuer-id={item.issuer.id}
                            data-testid={`issuer-row-${item.issuer.id}`}
                            key={item.issuer.id}
                            onClick={() => setSelectedIssuerId(item.issuer.id)}
                          >
                            <td className="px-3 py-3">
                              <div className="font-semibold text-foreground">{item.issuer.name}</div>
                              <div className="mt-1 text-[11px] text-muted-foreground">{item.issuer.institution}</div>
                            </td>
                            <td className="px-3 py-3">{item.issuer.role}</td>
                            <td className="px-3 py-3 font-mono text-[11px] text-muted-foreground">
                              {shortenHash(item.issuer.walletAddress, 7)}
                            </td>
                            <td className="px-3 py-3">
                              <StatusBadge tone={item.issuer.active ? "online" : "offline"}>
                                {item.issuer.active ? "Activo" : "Inactivo"}
                              </StatusBadge>
                            </td>
                            <td className="px-3 py-3">
                              <div className="flex max-w-[16rem] flex-wrap gap-1.5">
                                {item.permissions.map((permission) => (
                                  <span
                                    className="rounded-md border border-border/65 bg-muted/45 px-2 py-1 text-[11px] font-semibold text-muted-foreground"
                                    key={permission}
                                  >
                                    {permission}
                                  </span>
                                ))}
                              </div>
                            </td>
                            <td className="px-3 py-3 text-right font-mono">{item.issuedCount}</td>
                            <td className="px-3 py-3 text-right font-mono">{item.revokedCount}</td>
                            <td className="px-3 py-3">{formatDateTime(item.lastActivity)}</td>
                            <td className="px-3 py-3">
                              <div className="flex justify-end gap-2">
                                {canManageIssuers ? (
                                  <Button
                                    className="min-h-7 px-2 py-1"
                                    onClick={(event) => {
                                      event.stopPropagation();
                                      manageIssuer(item.issuer);
                                    }}
                                    variant={item.issuer.active ? "danger" : "secondary"}
                                  >
                                    {item.issuer.active ? "Desactivar emisor" : "Activar emisor"}
                                  </Button>
                                ) : null}
                                <Button
                                  className="min-h-7 px-2 py-1"
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    setSelectedIssuerId(item.issuer.id);
                                  }}
                                  variant="secondary"
                                >
                                  Ver detalle
                                </Button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>

              <Card data-actor-panel>
                <CardHeader className="flex flex-row items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-foreground">Detalle del emisor</p>
                    <p className="mt-1 text-xs text-muted-foreground">Permisos efectivos y rastro contractual.</p>
                  </div>
                  <StatusBadge tone={selectedIssuer?.issuer.active ? "online" : "offline"}>
                    {selectedIssuer?.issuer.active ? "Activo" : "Inactivo"}
                  </StatusBadge>
                </CardHeader>
                <CardContent className="grid gap-3">
                  {selectedIssuer ? (
                    <>
                      <div className="rounded-md border border-border/55 bg-muted/55 p-3">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-foreground">{selectedIssuer.issuer.name}</p>
                            <p className="mt-1 text-xs leading-5 text-muted-foreground">
                              {selectedIssuer.issuer.role} · {selectedIssuer.issuer.city}
                            </p>
                          </div>
                          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-md border border-border/60 bg-secondary text-primary">
                            <Building2 className="h-4 w-4" aria-hidden="true" />
                          </span>
                        </div>
                        <div className="mt-3 grid gap-1">
                          <FieldLine label="Institucion" value={selectedIssuer.issuer.institution} />
                          <FieldLine label="Wallet" value={shortenHash(selectedIssuer.issuer.walletAddress, 10)} />
                          <FieldLine label="Autorizado" value={formatDateTime(selectedIssuer.issuer.authorizedAt)} />
                          <FieldLine label="Certificados emitidos" value={selectedIssuer.issuedCount} />
                          <FieldLine label="Certificados revocados" value={selectedIssuer.revokedCount} />
                        </div>
                      </div>

                      <div className="grid gap-2">
                        <p className="text-xs font-semibold text-foreground">Permisos</p>
                        <div className="grid gap-2 sm:grid-cols-2">
                          {["Emitir", "Revocar", "Autorizar emisor", "Consultar auditoria"].map((permission) => {
                            const granted = selectedIssuer.permissions.includes(permission);

                            return (
                              <div
                                className={cn(
                                  "flex items-center gap-2 rounded-md border border-border/55 bg-muted/45 p-3",
                                  granted && "border-primary/25 bg-primary/10",
                                )}
                                key={permission}
                              >
                                {granted ? (
                                  <BadgeCheck className="h-4 w-4 text-primary" aria-hidden="true" />
                                ) : (
                                  <LockKeyhole className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                                )}
                                <span className="text-xs font-semibold text-foreground">{permission}</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      <div className="grid gap-2">
                        <p className="text-xs font-semibold text-foreground">Actividad reciente</p>
                        <ol className="grid gap-2">
                          {selectedIssuer.events.slice(0, 4).map((event) => (
                            <li className="rounded-md border border-border/55 bg-muted/45 p-3" key={event.id}>
                              <div className="flex items-center justify-between gap-3">
                                <span className="font-mono text-[11px] text-muted-foreground">
                                  #{numberFormatter.format(event.blockNumber)}
                                </span>
                                <span className="text-[11px] text-muted-foreground">{formatDateTime(event.createdAt)}</span>
                              </div>
                              <p className="mt-2 text-xs font-semibold text-foreground">{event.type}</p>
                              <p className="mt-1 text-[11px] leading-5 text-muted-foreground">{event.detail}</p>
                            </li>
                          ))}
                        </ol>
                      </div>
                    </>
                  ) : null}
                </CardContent>
              </Card>
            </section>
          </TabsPrimitive.Content>

          <TabsPrimitive.Content data-actor-tab="verifiers" value="verifiers">
            <section
              className="grid min-w-0 gap-3 xl:grid-cols-[minmax(0,1fr)_minmax(20rem,0.42fr)]"
              data-testid="verifier-entities-panel"
            >
              <Card data-actor-panel>
                <CardHeader className="flex flex-row items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-foreground">Lista de entidades</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Consultas externas tomadas desde el historial de verificaciones academicas.
                    </p>
                  </div>
                  <StatusBadge tone="neutral">{numberFormatter.format(verifierViews.length)} entidades</StatusBadge>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto rounded-lg border border-border bg-muted/40">
                    <table className="w-full min-w-[52rem] text-left text-xs">
                      <thead className="bg-muted/65 text-muted-foreground">
                        <tr>
                          <th className="px-3 py-2 font-medium">Entidad</th>
                          <th className="px-3 py-2 font-medium">Tipo de entidad</th>
                          <th className="px-3 py-2 text-right font-medium">Verificaciones realizadas</th>
                          <th className="px-3 py-2 text-right font-medium">Certificados consultados</th>
                          <th className="px-3 py-2 text-right font-medium">Resultados validos</th>
                          <th className="px-3 py-2 text-right font-medium">No validos</th>
                          <th className="px-3 py-2 font-medium">Ultima verificacion</th>
                          <th className="px-3 py-2 font-medium">Motivo de consulta</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/70">
                        {verifierViews.map((item) => (
                          <tr
                            className={cn(
                              "cursor-pointer text-foreground/85 transition-colors hover:bg-secondary/45",
                              selectedVerifier?.entity.id === item.entity.id && "bg-secondary/35",
                            )}
                            key={item.entity.id}
                            onClick={() => setSelectedVerifierId(item.entity.id)}
                          >
                            <td className="px-3 py-3">
                              <div className="font-semibold text-foreground">{item.entity.name}</div>
                              <div className="mt-1 font-mono text-[11px] text-muted-foreground">
                                {shortenHash(item.entity.walletAddress, 7)}
                              </div>
                            </td>
                            <td className="px-3 py-3">{entityTypeLabels[item.entity.type]}</td>
                            <td className="px-3 py-3 text-right font-mono">{item.attempts.length}</td>
                            <td className="px-3 py-3 text-right font-mono">{item.certificatesConsulted}</td>
                            <td className="px-3 py-3 text-right font-mono text-success">{item.validResults}</td>
                            <td className="px-3 py-3 text-right font-mono text-warning">{item.invalidResults}</td>
                            <td className="px-3 py-3">
                              {item.lastAttempt ? formatDateTime(item.lastAttempt.attemptedAt) : "Sin consultas"}
                            </td>
                            <td className="px-3 py-3 text-muted-foreground">
                              {item.lastAttempt?.notes ?? "Sin motivo registrado"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>

              <Card data-actor-panel>
                <CardHeader className="flex flex-row items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <History className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                    <p className="text-sm font-semibold text-foreground">Historial de verificaciones</p>
                  </div>
                  <StatusBadge tone="syncing">{selectedVerifier?.attempts.length ?? 0} consultas</StatusBadge>
                </CardHeader>
                <CardContent className="grid gap-3">
                  {selectedVerifier ? (
                    <>
                      <div className="rounded-md border border-border/55 bg-muted/55 p-3">
                        <FieldLine label="Entidad" value={selectedVerifier.entity.name} />
                        <FieldLine label="Tipo" value={entityTypeLabels[selectedVerifier.entity.type]} />
                        <FieldLine label="Contacto" value={selectedVerifier.entity.contact} />
                        <FieldLine label="Ciudad" value={selectedVerifier.entity.city} />
                        <FieldLine label="Wallet" value={shortenHash(selectedVerifier.entity.walletAddress, 10)} />
                      </div>
                      <ol className="grid gap-2">
                        {selectedVerifier.attempts.map((attempt) => (
                          <li className="rounded-md border border-border/55 bg-muted/45 p-3" key={attempt.id}>
                            <div className="flex items-center justify-between gap-3">
                              <span className="font-mono text-[11px] text-muted-foreground">
                                {attempt.certificateCode ?? "Hash directo"}
                              </span>
                              <StatusBadge tone={attempt.resultStatus === "valid" ? "online" : "warning"}>
                                {statusLabels[attempt.resultStatus]}
                              </StatusBadge>
                            </div>
                            <p className="mt-2 text-xs font-semibold text-foreground">
                              {attempt.source.toUpperCase()} · {attempt.ipLabel}
                            </p>
                            <p className="mt-1 text-[11px] leading-5 text-muted-foreground">{attempt.notes}</p>
                            <p className="mt-2 text-[11px] text-muted-foreground">
                              {formatDateTime(attempt.attemptedAt)}
                            </p>
                          </li>
                        ))}
                      </ol>
                    </>
                  ) : null}
                </CardContent>
              </Card>
            </section>
          </TabsPrimitive.Content>
        </TabsPrimitive.Root>

        <section className="grid gap-3 md:grid-cols-4" data-actor-panel>
          <div className="rounded-lg border border-border bg-card/95 p-3">
            <UserCheck className="h-4 w-4 text-primary" aria-hidden="true" />
            <p className="mt-2 text-xs font-semibold text-foreground">Autorizacion</p>
            <p className="mt-1 text-[11px] leading-5 text-muted-foreground">
              Solo wallets activas pueden firmar operaciones del contrato desplegado.
            </p>
          </div>
          <div className="rounded-lg border border-border bg-card/95 p-3">
            <ShieldOff className="h-4 w-4 text-primary" aria-hidden="true" />
            <p className="mt-2 text-xs font-semibold text-foreground">Desactivacion</p>
            <p className="mt-1 text-[11px] leading-5 text-muted-foreground">
              Un emisor inactivo queda bloqueado para emitir o revocar.
            </p>
          </div>
          <div className="rounded-lg border border-border bg-card/95 p-3">
            <ShieldCheck className="h-4 w-4 text-primary" aria-hidden="true" />
            <p className="mt-2 text-xs font-semibold text-foreground">Verificacion externa</p>
            <p className="mt-1 text-[11px] leading-5 text-muted-foreground">
              Empresas e instituciones consultan sin depender del emisor.
            </p>
          </div>
          <div className="rounded-lg border border-border bg-card/95 p-3">
            <Activity className="h-4 w-4 text-primary" aria-hidden="true" />
            <p className="mt-2 text-xs font-semibold text-foreground">Trazabilidad</p>
            <p className="mt-1 text-[11px] leading-5 text-muted-foreground">
              Cada cambio confirmado por MetaMask agrega un evento auditable al ledger.
            </p>
          </div>
        </section>
      </MotionPage>
    </div>
  );
}

import { useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { useGSAP } from "@gsap/react";
import { gsap } from "gsap";
import {
  AlertTriangle,
  BadgeCheck,
  Ban,
  CheckCircle2,
  FileWarning,
  Fingerprint,
  History,
  KeyRound,
  RotateCcw,
  Search,
  Send,
  ShieldAlert,
  ShieldCheck,
  XCircle,
} from "lucide-react";
import { MotionPage } from "@/components/motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { Progress } from "@/components/ui/progress";
import { StatusBadge } from "@/components/ui/status-badge";
import { Textarea } from "@/components/ui/textarea";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { cn } from "@/lib/cn";
import { formatDateTime, numberFormatter } from "@/lib/formatters";
import { shortenHash } from "@/lib/hash";
import { setMotionCompleteState, shouldSkipMotion } from "@/lib/motion";
import { canRevokeCertificate } from "@/lib/permissions";
import { useAppStore } from "@/store/app-store";
import type { BlockchainEvent, Certificate, Issuer, RevocationRecord } from "@/types/domain";

type ValidationState = "idle" | "missing_reason" | "missing_confirmation" | "permission" | "revoked" | "issuer_mismatch" | "not_found";

type RevocationResult = {
  certificate: Certificate;
  event?: BlockchainEvent;
  record?: RevocationRecord;
};

const certificateTypeLabels: Record<Certificate["type"], string> = {
  academic_diploma: "Diploma academico",
  grade_certificate: "Certificado de notas",
  graduation_certificate: "Certificado de egreso",
  professional_title: "Titulo profesional",
  study_record: "Constancia de estudios",
};

const statusLabels: Record<Certificate["status"], string> = {
  manipulated: "Manipulado",
  pending_reception: "Pendiente recepcion",
  revoked: "Revocado",
  valid: "Valido",
};

const statusTone: Record<
  Certificate["status"],
  "neutral" | "offline" | "online" | "syncing" | "warning"
> = {
  manipulated: "offline",
  pending_reception: "syncing",
  revoked: "warning",
  valid: "online",
};

const validationCopy: Record<ValidationState, { description: string; title: string }> = {
  idle: {
    description: "Completa el motivo, confirma la accion y firma la transaccion mock.",
    title: "Validacion pendiente",
  },
  issuer_mismatch: {
    description: "El emisor responsable debe coincidir con el emisor que anclo el certificado.",
    title: "Emisor responsable incorrecto",
  },
  missing_confirmation: {
    description: "Debes confirmar que entiendes que el historial se conserva y el certificado no se elimina.",
    title: "Confirmacion requerida",
  },
  missing_reason: {
    description: "Describe el error administrativo o la causa verificable de la revocacion.",
    title: "Motivo requerido",
  },
  not_found: {
    description: "No existe un certificado local con ese codigo en los datos mock.",
    title: "Certificado no encontrado",
  },
  permission: {
    description: "Solo Administrador academico o Emisor autorizado pueden ejecutar revocaciones.",
    title: "Permiso insuficiente",
  },
  revoked: {
    description: "El certificado ya esta revocado; no puede registrarse una segunda revocacion.",
    title: "Certificado ya revocado",
  },
};

function FieldLine({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="grid grid-cols-[minmax(0,0.72fr)_minmax(0,1.28fr)] gap-3 border-b border-border/45 py-2 last:border-b-0">
      <span className="text-[11px] font-medium text-muted-foreground">{label}</span>
      <span className="min-w-0 break-words text-right text-xs font-semibold text-foreground">
        {value}
      </span>
    </div>
  );
}

function TimelineStep({
  active,
  done,
  icon,
  label,
}: {
  active?: boolean;
  done?: boolean;
  icon: ReactNode;
  label: string;
}) {
  return (
    <li
      className={cn(
        "flex items-center gap-3 rounded-md border border-border/55 bg-black/35 p-3 text-xs text-muted-foreground",
        active && "border-primary/35 bg-primary/10 text-foreground",
        done && "border-success/25 bg-success/10 text-success",
      )}
      data-revocation-step
    >
      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-md border border-current/20 bg-black/30">
        {icon}
      </span>
      <span className="font-semibold">{label}</span>
    </li>
  );
}

function ResultPanel({ result }: { result: RevocationResult | null }) {
  if (!result) {
    return (
      <div className="rounded-md border border-border/55 bg-black/40 p-4 text-sm text-muted-foreground">
        El resultado de transaccion mock aparecera despues de firmar y confirmar la revocacion.
      </div>
    );
  }

  return (
    <div className="grid gap-3 rounded-md border border-success/25 bg-success/10 p-4" data-revocation-result>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-success">Transaccion mock confirmada</p>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            El certificado cambio a revocado, el historial se conserva y se agrego un evento al ledger.
          </p>
        </div>
        <BadgeCheck className="h-5 w-5 text-success" aria-hidden="true" />
      </div>
      <div className="grid gap-1 rounded-md border border-border/45 bg-black/35 p-3">
        <FieldLine label="Certificado" value={result.certificate.code} />
        <FieldLine label="Estado" value="Revocado" />
        <FieldLine
          label="Transaction hash"
          value={shortenHash(result.record?.transactionHash ?? result.event?.transactionHash ?? "", 10)}
        />
        <FieldLine
          label="Bloque confirmado"
          value={numberFormatter.format(result.record?.blockNumber ?? result.event?.blockNumber ?? 0)}
        />
        <FieldLine label="Evento" value={result.event?.type ?? "certificate_revoked"} />
      </div>
    </div>
  );
}

export function RevocationPage() {
  const pageRef = useRef<HTMLDivElement>(null);
  const reasonRef = useRef<HTMLDivElement>(null);
  const certificates = useAppStore((state) => state.certificates);
  const issuers = useAppStore((state) => state.issuers);
  const blockchainEvents = useAppStore((state) => state.blockchainEvents);
  const revocationRecords = useAppStore((state) => state.revocationRecords);
  const activeRole = useAppStore((state) => state.activeRole);
  const selectedNetwork = useAppStore((state) => state.selectedNetwork);
  const revokeCertificate = useAppStore((state) => state.revokeCertificate);
  const addToast = useAppStore((state) => state.addToast);
  const reducedMotion = useReducedMotion();
  const initialCertificate = certificates.find((certificate) => certificate.status !== "revoked") ?? certificates[0];
  const [searchCode, setSearchCode] = useState("");
  const [selectedId, setSelectedId] = useState(initialCertificate?.id ?? "");
  const [reason, setReason] = useState("");
  const [issuerId, setIssuerId] = useState(initialCertificate?.issuerId ?? issuers[0]?.id ?? "");
  const [confirmed, setConfirmed] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [validation, setValidation] = useState<ValidationState>("idle");
  const [validationNonce, setValidationNonce] = useState(0);
  const [result, setResult] = useState<RevocationResult | null>(null);

  const issuerById = useMemo(() => {
    const map = new Map<string, Issuer>();

    for (const issuer of issuers) {
      map.set(issuer.id, issuer);
    }

    return map;
  }, [issuers]);

  const selectedCertificate = certificates.find((certificate) => certificate.id === selectedId);
  const selectedIssuer = issuerById.get(issuerId);
  const originalIssuer = selectedCertificate ? issuerById.get(selectedCertificate.issuerId) : undefined;
  const events = selectedCertificate
    ? blockchainEvents.filter((event) => event.certificateId === selectedCertificate.id)
    : [];
  const revocationRecord = selectedCertificate
    ? revocationRecords.find((record) => record.certificateId === selectedCertificate.id)
    : undefined;
  const roleCanRevoke = activeRole === "academic_admin" || activeRole === "authorized_issuer";
  const storeCanRevoke = selectedCertificate
    ? canRevokeCertificate(originalIssuer, selectedCertificate, activeRole)
    : false;
  const issuerMatches = Boolean(selectedCertificate && issuerId === selectedCertificate.issuerId);
  const readyToOpenModal =
    Boolean(selectedCertificate) &&
    roleCanRevoke &&
    storeCanRevoke &&
    issuerMatches &&
    selectedCertificate?.status !== "revoked" &&
    reason.trim().length > 0 &&
    confirmed;
  const progress = result
    ? 100
    : modalOpen
      ? 72
      : confirmed && reason.trim() && selectedCertificate
        ? 55
        : selectedCertificate
          ? 28
          : 8;
  const activeValidation = validation === "idle" ? null : validationCopy[validation];

  useGSAP(
    () => {
      const page = pageRef.current;

      if (!page) {
        return;
      }

      const panels = page.querySelectorAll("[data-revocation-panel]");
      const steps = page.querySelectorAll("[data-revocation-step]");

      if (shouldSkipMotion(reducedMotion)) {
        setMotionCompleteState([...Array.from(panels), ...Array.from(steps)]);
        return;
      }

      const timeline = gsap.timeline({ defaults: { duration: 0.28, ease: "power2.out" } });
      timeline
        .fromTo(panels, { autoAlpha: 0, y: 12, scale: 0.992 }, { autoAlpha: 1, y: 0, scale: 1, stagger: 0.045 })
        .fromTo(steps, { autoAlpha: 0, y: 8 }, { autoAlpha: 1, y: 0, stagger: 0.04 }, "-=0.08");

      return () => timeline.kill();
    },
    { dependencies: [reducedMotion], scope: pageRef },
  );

  useGSAP(
    () => {
      const page = pageRef.current;

      if (!page || !result || shouldSkipMotion(reducedMotion)) {
        return;
      }

      const timeline = gsap.timeline({ defaults: { duration: 0.3, ease: "power2.out" } });
      timeline
        .fromTo("[data-revocation-result]", { autoAlpha: 0, y: 12, scale: 0.98 }, { autoAlpha: 1, y: 0, scale: 1 })
        .fromTo("[data-ledger-event]", { autoAlpha: 0, y: 8 }, { autoAlpha: 1, y: 0, stagger: 0.05 }, "-=0.08");

      return () => timeline.kill();
    },
    { dependencies: [reducedMotion, result], revertOnUpdate: true, scope: pageRef },
  );

  useGSAP(
    () => {
      const reasonNode = reasonRef.current;

      if (!reasonNode || validation !== "missing_reason" || shouldSkipMotion(reducedMotion)) {
        return;
      }

      const tween = gsap.to(reasonNode, { x: 7, duration: 0.065, ease: "power1.inOut", repeat: 5, yoyo: true });

      return () => tween.kill();
    },
    { dependencies: [reducedMotion, validation, validationNonce], revertOnUpdate: true, scope: pageRef },
  );

  const selectCertificate = (certificate: Certificate) => {
    setSelectedId(certificate.id);
    setSearchCode(certificate.code);
    setIssuerId(certificate.issuerId);
    setReason("");
    setConfirmed(false);
    setResult(null);
    setValidation("idle");
  };

  const handleSearch = () => {
    const normalized = searchCode.trim().toUpperCase();
    const found = certificates.find((certificate) => certificate.code.toUpperCase() === normalized);

    if (!found) {
      setSelectedId("");
      setResult(null);
      setValidation("not_found");
      addToast({
        title: "Certificado no encontrado",
        description: "No existe un registro local para ese codigo.",
        intent: "warning",
      });
      return;
    }

    selectCertificate(found);
  };

  const raiseValidation = (next: ValidationState) => {
    setValidation(next);
    setValidationNonce((value) => value + 1);
    addToast({
      title: validationCopy[next].title,
      description: validationCopy[next].description,
      intent: next === "missing_reason" || next === "missing_confirmation" ? "warning" : "error",
    });
  };

  const validateBeforeModal = () => {
    if (!selectedCertificate) {
      raiseValidation("not_found");
      return false;
    }

    if (!roleCanRevoke) {
      raiseValidation("permission");
      return false;
    }

    if (selectedCertificate.status === "revoked") {
      raiseValidation("revoked");
      return false;
    }

    if (!storeCanRevoke) {
      raiseValidation("permission");
      return false;
    }

    if (!issuerMatches) {
      raiseValidation("issuer_mismatch");
      return false;
    }

    if (!reason.trim()) {
      raiseValidation("missing_reason");
      return false;
    }

    if (!confirmed) {
      raiseValidation("missing_confirmation");
      return false;
    }

    setValidation("idle");
    return true;
  };

  const openWarningModal = () => {
    if (!validateBeforeModal()) {
      return;
    }

    setModalOpen(true);
  };

  const executeRevocation = () => {
    if (!selectedCertificate || !readyToOpenModal) {
      setModalOpen(false);
      return;
    }

    const updated = revokeCertificate(selectedCertificate.id, reason.trim());

    if (!updated) {
      raiseValidation("permission");
      setModalOpen(false);
      return;
    }

    const latestState = useAppStore.getState();
    const record = latestState.revocationRecords.find((item) => item.certificateId === updated.id);
    const event = latestState.blockchainEvents.find(
      (item) => item.certificateId === updated.id && item.type === "certificate_revoked",
    );

    setResult({ certificate: updated, event, record });
    setSelectedId(updated.id);
    setConfirmed(false);
    setModalOpen(false);
    setValidation("idle");
  };

  return (
    <div ref={pageRef}>
      <MotionPage
        className="grid min-w-0 gap-3"
        data-testid="revocation-workspace"
        staggerSelector="[data-revocation-panel]"
      >
        <section
          className="rounded-lg border border-border bg-card p-4 shadow-[inset_0_1px_0_hsl(var(--foreground)/0.035),0_24px_70px_-46px_hsl(var(--shadow-ledger)/1)]"
          data-revocation-panel
        >
          <div className="flex min-w-0 flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div className="min-w-0">
              <div className="mb-3 flex flex-wrap gap-2">
                <StatusBadge tone={roleCanRevoke ? "online" : "warning"}>
                  Rol {roleCanRevoke ? "con permiso" : "sin permiso"}
                </StatusBadge>
                <StatusBadge tone="syncing">Smart contract mock</StatusBadge>
                <StatusBadge tone="neutral">Historial inmutable</StatusBadge>
              </div>
              <h1 className="text-2xl font-semibold tracking-tight text-foreground">
                Revocacion de certificados
              </h1>
              <p className="mt-1 max-w-3xl text-sm leading-6 text-muted-foreground">
                Ejecuta correcciones administrativas sin borrar evidencia: el certificado queda
                marcado como revocado, se conserva el historial y se registra un evento blockchain.
              </p>
            </div>
            <div className="grid min-w-48 gap-1 rounded-md border border-border/55 bg-black/45 p-3">
              <p className="text-xs font-semibold text-muted-foreground">Estado de flujo</p>
              <p className="font-mono text-sm font-semibold text-foreground">
                {selectedCertificate?.code ?? "Sin certificado"}
              </p>
              <Progress
                indicatorClassName={result ? "bg-success" : "bg-warning"}
                value={progress}
              />
            </div>
          </div>
        </section>

        <section className="grid min-w-0 gap-3 xl:grid-cols-[minmax(0,0.85fr)_minmax(23rem,0.72fr)]">
          <Card data-revocation-panel>
            <CardHeader className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="text-sm font-semibold text-foreground">Busqueda y validacion</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Localiza el certificado, valida permisos y prepara la firma de revocacion.
                </p>
              </div>
              <StatusBadge tone={selectedCertificate ? statusTone[selectedCertificate.status] : "neutral"}>
                {selectedCertificate ? statusLabels[selectedCertificate.status] : "Sin seleccion"}
              </StatusBadge>
            </CardHeader>
            <CardContent className="grid gap-3">
              <div className="grid gap-2 md:grid-cols-[minmax(0,1fr)_auto]">
                <label className="grid gap-1.5 text-[11px] font-semibold text-muted-foreground">
                  <span className="flex items-center gap-2">
                    <Search className="h-3.5 w-3.5" aria-hidden="true" />
                    Buscar certificado por codigo
                  </span>
                  <Input
                    aria-label="Buscar certificado por codigo"
                    onChange={(event) => setSearchCode(event.target.value.toUpperCase())}
                    placeholder="CERT-2026-0001"
                    value={searchCode}
                  />
                </label>
                <div className="grid content-end">
                  <Button
                    icon={<Search className="h-4 w-4" aria-hidden="true" />}
                    onClick={handleSearch}
                    variant="secondary"
                  >
                    Buscar certificado
                  </Button>
                </div>
              </div>

              {activeValidation ? (
                <div
                  className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive"
                  role="alert"
                >
                  <p className="font-semibold">{activeValidation.title}</p>
                  <p className="mt-1 text-xs leading-5 text-muted-foreground">
                    {activeValidation.description}
                  </p>
                </div>
              ) : null}

              <div className="rounded-md border border-border/55 bg-black/38 p-3">
                <p className="text-[11px] font-semibold uppercase text-muted-foreground">
                  Panel de datos del certificado
                </p>
                {selectedCertificate ? (
                  <div className="mt-2">
                    <FieldLine label="Codigo" value={selectedCertificate.code} />
                    <FieldLine label="Estudiante" value={selectedCertificate.studentName} />
                    <FieldLine label="Carrera" value={selectedCertificate.career} />
                    <FieldLine label="Tipo" value={certificateTypeLabels[selectedCertificate.type]} />
                    <FieldLine label="Emisor original" value={selectedCertificate.issuerName} />
                    <FieldLine
                      label="Estado actual"
                      value={
                        <StatusBadge tone={statusTone[selectedCertificate.status]}>
                          {statusLabels[selectedCertificate.status]}
                        </StatusBadge>
                      }
                    />
                    <FieldLine label="Hash" value={shortenHash(selectedCertificate.documentHash, 10)} />
                    <FieldLine
                      label="Bloque"
                      value={numberFormatter.format(selectedCertificate.blockNumber)}
                    />
                    {selectedCertificate.revocationReason ? (
                      <FieldLine label="Motivo previo" value={selectedCertificate.revocationReason} />
                    ) : null}
                  </div>
                ) : (
                  <p className="mt-2 text-xs leading-5 text-muted-foreground">
                    Busca un codigo valido para cargar los datos academicos y criptograficos.
                  </p>
                )}
              </div>

              <div className="grid gap-3 rounded-md border border-border/55 bg-black/35 p-3">
                <div ref={reasonRef} data-revocation-reason-block>
                  <label className="grid gap-1.5 text-[11px] font-semibold text-muted-foreground">
                    Motivo de revocacion
                    <Textarea
                      aria-label="Motivo de revocacion"
                      className="min-h-28"
                      onChange={(event) => {
                        setReason(event.target.value);
                        if (validation === "missing_reason" && event.target.value.trim()) {
                          setValidation("idle");
                        }
                      }}
                      placeholder="Describe la correccion administrativa, error de registro o causa formal."
                      value={reason}
                    />
                  </label>
                </div>

                <label className="grid gap-1.5 text-[11px] font-semibold text-muted-foreground">
                  Emisor responsable
                  <select
                    aria-label="Emisor responsable"
                    className="h-8 w-full rounded-md border border-border/80 bg-black/35 px-3 text-xs font-semibold text-foreground outline-none shadow-[inset_0_1px_0_hsl(var(--foreground)/0.025)] transition-colors focus:border-primary/70 focus:ring-4 focus:ring-primary/15"
                    onChange={(event) => setIssuerId(event.target.value)}
                    value={issuerId}
                  >
                    {issuers.map((issuer) => (
                      <option className="bg-card text-foreground" key={issuer.id} value={issuer.id}>
                        {issuer.name} · {issuer.active ? "activo" : "inactivo"}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="flex items-start gap-3 rounded-md border border-border/55 bg-black/35 p-3 text-xs text-muted-foreground">
                  <input
                    aria-label="Confirmo la revocacion"
                    checked={confirmed}
                    className="mt-0.5 h-4 w-4 rounded border-border bg-black/50 accent-[hsl(var(--warning))]"
                    onChange={(event) => {
                      setConfirmed(event.target.checked);
                      if (validation === "missing_confirmation" && event.target.checked) {
                        setValidation("idle");
                      }
                    }}
                    type="checkbox"
                  />
                  <span>
                    <span className="block font-semibold text-foreground">
                      Confirmo la revocacion y entiendo que no elimina el historial.
                    </span>
                    <span className="mt-1 block leading-5">
                      La accion queda trazada como evento distribuido y puede ser auditada despues.
                    </span>
                  </span>
                </label>

                <Button
                  icon={<ShieldAlert className="h-4 w-4" aria-hidden="true" />}
                  onClick={openWarningModal}
                  variant="danger"
                >
                  Revocar
                </Button>
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-3">
            <Card data-revocation-panel>
              <CardHeader className="flex flex-row items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-foreground">Resultado de transaccion mock</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Firma, envio y bloque confirmado en red simulada.
                  </p>
                </div>
                <StatusBadge tone={result ? "online" : "neutral"}>
                  {result ? "Confirmado" : selectedNetwork}
                </StatusBadge>
              </CardHeader>
              <CardContent>
                <ResultPanel result={result} />
              </CardContent>
            </Card>

            <Card data-revocation-panel>
              <CardHeader>
                <p className="text-sm font-semibold text-foreground">Timeline de revocacion</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Proceso conceptual desde busqueda hasta evento nuevo en ledger.
                </p>
              </CardHeader>
              <CardContent>
                <ol className="grid gap-2">
                  <TimelineStep
                    done={Boolean(selectedCertificate)}
                    icon={<Search className="h-4 w-4" aria-hidden="true" />}
                    label="1. Buscar certificado"
                  />
                  <TimelineStep
                    active={!result && Boolean(selectedCertificate)}
                    done={readyToOpenModal || Boolean(result)}
                    icon={<ShieldCheck className="h-4 w-4" aria-hidden="true" />}
                    label="2. Validar permisos y motivo"
                  />
                  <TimelineStep
                    active={modalOpen}
                    done={Boolean(result)}
                    icon={<KeyRound className="h-4 w-4" aria-hidden="true" />}
                    label="3. Firmar revocacion"
                  />
                  <TimelineStep
                    active={modalOpen}
                    done={Boolean(result)}
                    icon={<Send className="h-4 w-4" aria-hidden="true" />}
                    label="4. Enviar transaccion mock"
                  />
                  <TimelineStep
                    done={Boolean(result)}
                    icon={<CheckCircle2 className="h-4 w-4" aria-hidden="true" />}
                    label="5. Confirmar bloque"
                  />
                  <TimelineStep
                    done={Boolean(result)}
                    icon={<History className="h-4 w-4" aria-hidden="true" />}
                    label="6. Registrar evento"
                  />
                </ol>
              </CardContent>
            </Card>
          </div>
        </section>

        <section className="grid min-w-0 gap-3 xl:grid-cols-[minmax(0,0.78fr)_minmax(20rem,0.42fr)]">
          <Card data-revocation-panel>
            <CardHeader className="flex flex-row items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <History className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                <p className="text-sm font-semibold text-foreground">Historial conservado</p>
              </div>
              <StatusBadge tone="neutral">{events.length} eventos</StatusBadge>
            </CardHeader>
            <CardContent>
              {events.length ? (
                <ol className="grid gap-2 md:grid-cols-3">
                  {events.map((event) => (
                    <li
                      className={cn(
                        "rounded-md border border-border/55 bg-black/40 p-3",
                        event.type === "certificate_revoked" && "border-warning/35 bg-warning/10",
                      )}
                      data-ledger-event
                      key={event.id}
                    >
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
              ) : (
                <p className="rounded-md border border-border/55 bg-black/40 p-4 text-sm text-muted-foreground">
                  Sin eventos asociados al certificado seleccionado.
                </p>
              )}
            </CardContent>
          </Card>

          <Card data-revocation-panel>
            <CardHeader>
              <p className="text-sm font-semibold text-foreground">Guardrails de revocacion</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Reglas aplicadas antes de tocar el estado del certificado.
              </p>
            </CardHeader>
            <CardContent className="grid gap-2">
              {[
                {
                  done: roleCanRevoke,
                  icon: roleCanRevoke ? ShieldCheck : Ban,
                  label: "Rol autorizado",
                },
                {
                  done: Boolean(reason.trim()),
                  icon: reason.trim() ? FileWarning : XCircle,
                  label: "Motivo obligatorio",
                },
                {
                  done: confirmed,
                  icon: confirmed ? CheckCircle2 : AlertTriangle,
                  label: "Confirmacion explicita",
                },
                {
                  done: selectedCertificate?.status !== "revoked",
                  icon: selectedCertificate?.status !== "revoked" ? RotateCcw : Ban,
                  label: "Sin doble revocacion",
                },
                {
                  done: issuerMatches,
                  icon: issuerMatches ? Fingerprint : XCircle,
                  label: "Emisor responsable coincide",
                },
              ].map((item) => {
                const Icon = item.icon;

                return (
                  <div
                    className="flex items-center justify-between gap-3 rounded-md border border-border/55 bg-black/35 p-3"
                    key={item.label}
                  >
                    <div className="flex items-center gap-2">
                      <Icon
                        className={cn("h-4 w-4", item.done ? "text-success" : "text-warning")}
                        aria-hidden="true"
                      />
                      <span className="text-xs font-semibold text-foreground">{item.label}</span>
                    </div>
                    <StatusBadge tone={item.done ? "online" : "warning"}>
                      {item.done ? "OK" : "Pendiente"}
                    </StatusBadge>
                  </div>
                );
              })}
              {revocationRecord ? (
                <div className="rounded-md border border-warning/30 bg-warning/10 p-3 text-xs leading-5 text-muted-foreground">
                  Revocacion previa: bloque {numberFormatter.format(revocationRecord.blockNumber)} ·{" "}
                  {formatDateTime(revocationRecord.revokedAt)}
                </div>
              ) : null}
            </CardContent>
          </Card>
        </section>

        <Modal
          description="Cambia el estado del certificado, firma una transaccion mock y conserva el historial completo."
          onOpenChange={setModalOpen}
          open={modalOpen}
          title="Advertencia de revocacion"
        >
          <div className="grid gap-4">
            <div className="rounded-md border border-warning/30 bg-warning/10 p-4">
              <p className="text-sm font-semibold text-warning">
                Esta accion no elimina el certificado.
              </p>
              <p className="mt-2 text-xs leading-5 text-muted-foreground">
                El registro permanecera verificable como revocado y cualquier entidad publica vera el
                estado actualizado en el ledger simulado.
              </p>
            </div>
            <div className="grid gap-1 rounded-md border border-border/55 bg-black/35 p-3">
              <FieldLine label="Certificado" value={selectedCertificate?.code ?? "Sin dato"} />
              <FieldLine label="Emisor responsable" value={selectedIssuer?.name ?? "Sin dato"} />
              <FieldLine label="Motivo" value={reason.trim()} />
              <FieldLine label="Red" value={selectedNetwork} />
            </div>
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button onClick={() => setModalOpen(false)} variant="secondary">
                Cancelar
              </Button>
              <Button
                icon={<Send className="h-4 w-4" aria-hidden="true" />}
                onClick={executeRevocation}
                variant="danger"
              >
                Firmar y enviar revocacion
              </Button>
            </div>
          </div>
        </Modal>
      </MotionPage>
    </div>
  );
}

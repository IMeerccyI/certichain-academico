import { useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { useGSAP } from "@gsap/react";
import { gsap } from "gsap";
import {
  AlertTriangle,
  BadgeCheck,
  ClipboardCopy,
  FileSearch,
  FileText,
  Fingerprint,
  History,
  Info,
  QrCode,
  RotateCcw,
  ScanLine,
  Search,
  ShieldAlert,
  ShieldCheck,
  SlidersHorizontal,
  XCircle,
} from "lucide-react";
import { MotionPage } from "@/components/motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { StatusBadge } from "@/components/ui/status-badge";
import { Textarea } from "@/components/ui/textarea";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { cn } from "@/lib/cn";
import { formatDateTime, numberFormatter } from "@/lib/formatters";
import { calculateSha256, normalizeHash, shortenHash } from "@/lib/hash";
import { motionPresets, setMotionCompleteState, shouldSkipMotion } from "@/lib/motion";
import { useAppStore } from "@/store/app-store";
import type { BlockchainEvent, Certificate, CertificateStatus } from "@/types/domain";

type VerificationMethod = "code" | "hash" | "pdf" | "qr";
type ResultKind = "valid" | "revoked" | "invalid" | "not_found";
type CaseId = "valid" | "revoked" | "manipulated" | "missing";

type VerificationResultView = {
  calculatedHash: string;
  certificate?: Certificate;
  events: BlockchainEvent[];
  explanation: string;
  kind: ResultKind;
  match: boolean;
  registeredHash: string;
  requestedEvidence: string;
};

const methodLabels: Record<VerificationMethod, string> = {
  code: "Por codigo",
  hash: "Por hash",
  pdf: "Por PDF simulado",
  qr: "Por QR simulado",
};

const methodDescriptions: Record<VerificationMethod, string> = {
  code: "Ingresa el codigo publico del certificado emitido por la universidad.",
  hash: "Pega el hash SHA-256 del PDF para comparar contra el ledger.",
  pdf: "Simula el contenido de un PDF y calcula una huella local.",
  qr: "Lee una URL o payload QR simulado con codigo y hash.",
};

const resultCopy: Record<
  ResultKind,
  { explanation: string; label: string; tone: "online" | "warning" | "offline" | "neutral" }
> = {
  invalid: {
    explanation:
      "El documento no coincide con la evidencia distribuida. Puede estar manipulado o no pertenecer al certificado original.",
    label: "CERTIFICADO NO VALIDO",
    tone: "offline",
  },
  not_found: {
    explanation:
      "No existe un certificado asociado a la evidencia ingresada. La entidad verificadora no debe aceptar el documento.",
    label: "CERTIFICADO NO ENCONTRADO",
    tone: "neutral",
  },
  revoked: {
    explanation:
      "El certificado existe, pero fue revocado por la universidad emisora. El historial permanece visible.",
    label: "CERTIFICADO REVOCADO",
    tone: "warning",
  },
  valid: {
    explanation:
      "El documento coincide con el hash registrado y no presenta revocacion vigente.",
    label: "CERTIFICADO VALIDO",
    tone: "online",
  },
};

const certificateStatusLabels: Record<CertificateStatus, string> = {
  manipulated: "Manipulado",
  not_found: "No encontrado",
  pending_reception: "Pendiente recepcion",
  revoked: "Revocado",
  valid: "Valido",
};

const certificateTypeLabels: Record<Certificate["type"], string> = {
  academic_diploma: "Diploma academico",
  grade_certificate: "Certificado de notas",
  graduation_certificate: "Certificado de egreso",
  professional_title: "Titulo profesional",
  study_record: "Constancia de estudios",
};

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

function TechnicalHash({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-md border border-border/55 bg-black/45 p-3">
      <p className="text-[11px] font-semibold uppercase text-muted-foreground">{label}</p>
      <p className="mt-2 break-all font-mono text-[11px] leading-5 text-foreground">
        {value || "Sin evidencia"}
      </p>
    </div>
  );
}

function parseQrPayload(payload: string) {
  const code = payload.match(/CERT-\d{4}-\d{4}/i)?.[0]?.toUpperCase() ?? "";
  const hash = payload.match(/0x[a-fA-F0-9]{64}/)?.[0] ?? "";

  return { code, hash };
}

function resultKindForCertificate(certificate: Certificate | undefined, hashesMatch: boolean): ResultKind {
  if (!certificate) {
    return "not_found";
  }

  if (!hashesMatch || certificate.status === "manipulated") {
    return "invalid";
  }

  if (certificate.status === "revoked") {
    return "revoked";
  }

  return "valid";
}

function fakeOriginalPdf(certificate: Certificate) {
  return [
    "CERTICHAIN PDF SIMULADO",
    `codigo=${certificate.code}`,
    `estudiante=${certificate.studentName}`,
    `hashRegistrado=${certificate.documentHash}`,
    "contenido=Documento academico original usado para verificacion publica.",
  ].join("\n");
}

function fakeQr(certificate: Certificate) {
  return `certichain://verify?code=${certificate.code}&hash=${certificate.documentHash}`;
}

export function VerificationPage() {
  const pageRef = useRef<HTMLDivElement>(null);
  const certificates = useAppStore((state) => state.certificates);
  const blockchainEvents = useAppStore((state) => state.blockchainEvents);
  const verifyCertificateByCode = useAppStore((state) => state.verifyCertificateByCode);
  const verifyCertificateByHash = useAppStore((state) => state.verifyCertificateByHash);
  const addToast = useAppStore((state) => state.addToast);
  const setRoute = useAppStore((state) => state.setRoute);
  const reducedMotion = useReducedMotion();
  const [activeMethod, setActiveMethod] = useState<VerificationMethod>("code");
  const [codeInput, setCodeInput] = useState("CERT-2026-0001");
  const [hashInput, setHashInput] = useState(certificates[0]?.documentHash ?? "");
  const [pdfInput, setPdfInput] = useState(certificates[0] ? fakeOriginalPdf(certificates[0]) : "");
  const [qrInput, setQrInput] = useState(certificates[0] ? fakeQr(certificates[0]) : "");
  const [caseId, setCaseId] = useState<CaseId>("valid");
  const [caseCertificateId, setCaseCertificateId] = useState(certificates[0]?.id ?? "");
  const [manipulatedMode, setManipulatedMode] = useState(false);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<VerificationResultView | null>(null);
  const [technicalOpen, setTechnicalOpen] = useState(false);

  const eventByCertificate = useMemo(() => {
    const map = new Map<string, BlockchainEvent[]>();

    for (const event of blockchainEvents) {
      if (!event.certificateId) {
        continue;
      }

      map.set(event.certificateId, [...(map.get(event.certificateId) ?? []), event]);
    }

    return map;
  }, [blockchainEvents]);

  const activeEvidence =
    activeMethod === "code"
      ? codeInput
      : activeMethod === "hash"
        ? hashInput
        : activeMethod === "pdf"
          ? pdfInput
          : qrInput;

  useGSAP(
    () => {
      const page = pageRef.current;

      if (!page) {
        return;
      }

      const panels = page.querySelectorAll("[data-verification-panel]");

      if (shouldSkipMotion(reducedMotion)) {
        setMotionCompleteState(panels);
        return;
      }

      const timeline = gsap.timeline({ defaults: { duration: 0.28, ease: "power2.out" } });
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

      if (!page || !result || shouldSkipMotion(reducedMotion)) {
        return;
      }

      const timeline = gsap.timeline({ defaults: { duration: 0.28, ease: "power2.out" } });
      const eventItems = page.querySelectorAll("[data-verification-event]");

      timeline
        .fromTo("[data-scan-line]", { xPercent: -120, autoAlpha: 0 }, { xPercent: 120, autoAlpha: 1, duration: 0.55 })
        .to("[data-scan-line]", { autoAlpha: 0, duration: 0.12 })
        .fromTo("[data-hash-compare]", motionPresets.transactionConfirm.from, motionPresets.transactionConfirm.to, "-=0.08")
        .fromTo(
          "[data-result-seal]",
          result.kind === "valid" ? motionPresets.successSeal.from : { autoAlpha: 0, scale: 0.9, x: -8 },
          result.kind === "valid"
            ? motionPresets.successSeal.to
            : { autoAlpha: 1, scale: 1, x: 0, duration: 0.26, ease: "power2.out" },
          "-=0.08",
        );

      if (eventItems.length > 0) {
        timeline.fromTo(
          eventItems,
          { autoAlpha: 0, y: 10 },
          { autoAlpha: 1, y: 0, stagger: 0.055 },
          "-=0.04",
        );
      }

      return () => timeline.kill();
    },
    { dependencies: [result, reducedMotion], revertOnUpdate: true, scope: pageRef },
  );

  const certificateById = (id: string) => certificates.find((certificate) => certificate.id === id);

  const makeResult = ({
    calculatedHash,
    certificate,
    registeredHash,
    requestedEvidence,
  }: {
    calculatedHash: string;
    certificate?: Certificate;
    registeredHash: string;
    requestedEvidence: string;
  }): VerificationResultView => {
    const hashesMatch = Boolean(
      certificate &&
        calculatedHash &&
        registeredHash &&
        normalizeHash(calculatedHash).toLowerCase() === normalizeHash(registeredHash).toLowerCase(),
    );
    const kind = resultKindForCertificate(certificate, hashesMatch);
    const events = certificate ? eventByCertificate.get(certificate.id) ?? [] : [];

    return {
      calculatedHash,
      certificate,
      events,
      explanation: resultCopy[kind].explanation,
      kind,
      match: hashesMatch,
      registeredHash,
      requestedEvidence,
    };
  };

  const applyCase = (nextCase: CaseId) => {
    const validCertificate = certificates.find((certificate) => certificate.status === "valid") ?? certificates[0];
    const revokedCertificate =
      certificates.find((certificate) => certificate.status === "revoked") ?? certificates[0];
    const manipulatedCertificate =
      certificates.find((certificate) => certificate.status === "manipulated") ?? certificates[0];

    setResult(null);
    setCaseId(nextCase);
    setManipulatedMode(nextCase === "manipulated");

    if (nextCase === "valid") {
      setActiveMethod("code");
      setCaseCertificateId(validCertificate.id);
      setCodeInput(validCertificate.code);
      setHashInput(validCertificate.documentHash);
      setPdfInput(fakeOriginalPdf(validCertificate));
      setQrInput(fakeQr(validCertificate));
      return;
    }

    if (nextCase === "revoked") {
      setActiveMethod("code");
      setCaseCertificateId(revokedCertificate.id);
      setCodeInput(revokedCertificate.code);
      setHashInput(revokedCertificate.documentHash);
      setPdfInput(fakeOriginalPdf(revokedCertificate));
      setQrInput(fakeQr(revokedCertificate));
      return;
    }

    if (nextCase === "manipulated") {
      setActiveMethod("pdf");
      setCaseCertificateId(manipulatedCertificate.id);
      setCodeInput(manipulatedCertificate.code);
      setHashInput(manipulatedCertificate.documentHash);
      setPdfInput(
        `${fakeOriginalPdf(manipulatedCertificate)}\ncontenido=Texto alterado despues de emitir el certificado.`,
      );
      setQrInput(
        `certichain://verify?code=${manipulatedCertificate.code}&hash=0x${"8".repeat(64)}`,
      );
      return;
    }

    setActiveMethod("code");
    setCaseCertificateId("");
    setCodeInput("CERT-2026-9999");
    setHashInput(`0x${"0".repeat(64)}`);
    setPdfInput("PDF simulado sin registro distribuido para CERT-2026-9999.");
    setQrInput("certichain://verify?code=CERT-2026-9999");
  };

  const verifyByCode = async () => {
    const code = codeInput.trim().toUpperCase();
    const storeResult = verifyCertificateByCode(code);
    const certificate = storeResult.certificate;
    const calculatedHash = certificate
      ? certificate.documentHash
      : normalizeHash(await calculateSha256(`codigo:${code}`));

    return makeResult({
      calculatedHash,
      certificate,
      registeredHash: certificate?.documentHash ?? "Sin hash registrado",
      requestedEvidence: code,
    });
  };

  const verifyByHash = async () => {
    const normalized = normalizeHash(hashInput);
    const storeResult = verifyCertificateByHash(normalized);
    const certificate = storeResult.certificate;

    if (manipulatedMode && certificate) {
      return makeResult({
        calculatedHash: normalizeHash(await calculateSha256(`${normalized}-alterado`)),
        certificate,
        registeredHash: certificate.documentHash,
        requestedEvidence: normalized,
      });
    }

    return makeResult({
      calculatedHash: normalized,
      certificate,
      registeredHash: certificate?.documentHash ?? "Sin hash registrado",
      requestedEvidence: normalized,
    });
  };

  const verifyByPdf = async () => {
    const hintedCertificate = certificateById(caseCertificateId);
    const code = pdfInput.match(/CERT-\d{4}-\d{4}/i)?.[0]?.toUpperCase() ?? "";
    const certificate = hintedCertificate ?? certificates.find((item) => item.code === code);
    const calculatedHash =
      certificate && !manipulatedMode ? certificate.documentHash : normalizeHash(await calculateSha256(pdfInput));

    return makeResult({
      calculatedHash,
      certificate,
      registeredHash: certificate?.documentHash ?? "Sin hash registrado",
      requestedEvidence: "PDF simulado",
    });
  };

  const verifyByQr = async () => {
    const parsed = parseQrPayload(qrInput);
    const certificate = certificates.find((item) => item.code === parsed.code);
    const calculatedHash = parsed.hash || normalizeHash(await calculateSha256(qrInput));

    return makeResult({
      calculatedHash,
      certificate,
      registeredHash: certificate?.documentHash ?? "Sin hash registrado",
      requestedEvidence: parsed.code || "QR sin codigo reconocido",
    });
  };

  const runVerification = async () => {
    setBusy(true);

    const nextResult =
      activeMethod === "code"
        ? await verifyByCode()
        : activeMethod === "hash"
          ? await verifyByHash()
          : activeMethod === "pdf"
            ? await verifyByPdf()
            : await verifyByQr();

    setResult(nextResult);
    setBusy(false);
  };

  const clearVerification = () => {
    setActiveMethod("code");
    setCodeInput("");
    setHashInput("");
    setPdfInput("");
    setQrInput("");
    setCaseCertificateId("");
    setManipulatedMode(false);
    setResult(null);
  };

  const copyResult = async () => {
    if (!result) {
      addToast({
        title: "Sin resultado",
        description: "Ejecuta una verificacion antes de copiar.",
        intent: "warning",
      });
      return;
    }

    const text = [
      resultCopy[result.kind].label,
      result.explanation,
      `Estudiante: ${result.certificate?.studentName ?? "No encontrado"}`,
      `Codigo: ${result.certificate?.code ?? result.requestedEvidence}`,
      `Hash calculado: ${result.calculatedHash}`,
      `Hash registrado: ${result.registeredHash}`,
      `Coincidencia: ${result.match ? "Si" : "No"}`,
    ].join("\n");

    addToast({
      title: "Resultado copiado",
      description: resultCopy[result.kind].label,
      intent: "info",
    });
    await navigator.clipboard?.writeText(text);
  };

  const showDetail = () => {
    if (!result?.certificate) {
      addToast({
        title: "Sin detalle disponible",
        description: "No existe certificado para abrir en detalle.",
        intent: "warning",
      });
      return;
    }

    setRoute("certificates");
  };

  const simulateManipulatedDocument = () => {
    const certificate =
      result?.certificate ??
      certificateById(caseCertificateId) ??
      certificates.find((item) => item.status === "valid") ??
      certificates[0];

    setActiveMethod("hash");
    setCaseCertificateId(certificate.id);
    setHashInput(certificate.documentHash);
    setManipulatedMode(true);
    setResult(null);
  };

  const displayedResult = result;
  const displayedKind = displayedResult?.kind ?? "not_found";
  const displayedCopy = displayedResult
    ? resultCopy[displayedKind]
    : {
        explanation:
          "Ingresa una evidencia o usa un caso de prueba para consultar el ledger distribuido.",
        label: "SIN VERIFICACION",
        tone: "neutral" as const,
      };
  const progressValue = displayedResult ? (displayedResult.match ? 100 : displayedResult.kind === "not_found" ? 18 : 54) : 0;

  return (
    <div ref={pageRef}>
      <MotionPage
        className="grid min-w-0 gap-3"
        data-testid="public-verification"
        staggerSelector="[data-verification-panel]"
      >
        <section
          className="rounded-lg border border-border bg-card p-4 shadow-[inset_0_1px_0_hsl(var(--foreground)/0.035),0_24px_70px_-46px_hsl(var(--shadow-ledger)/1)]"
          data-verification-panel
        >
          <div className="flex min-w-0 flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div className="min-w-0">
              <div className="mb-3 flex flex-wrap gap-2">
                <StatusBadge tone="online">Acceso publico</StatusBadge>
                <StatusBadge tone="syncing">Ledger distribuido</StatusBadge>
                <StatusBadge tone="neutral">Sin backend real</StatusBadge>
              </div>
              <h1 className="text-2xl font-semibold tracking-tight text-foreground">
                Verificacion publica
              </h1>
              <p className="mt-1 max-w-3xl text-sm leading-6 text-muted-foreground">
                Una empresa, universidad o institucion puede confirmar autenticidad sin llamar a la
                universidad emisora. La verificacion funciona aunque la universidad este fuera de
                linea porque se consulta el registro distribuido.
              </p>
            </div>
            <div className="rounded-md border border-border/55 bg-black/45 p-3">
              <p className="text-xs font-semibold text-muted-foreground">Consulta actual</p>
              <p className="mt-2 truncate font-mono text-sm text-foreground">
                {activeEvidence || "Sin evidencia"}
              </p>
            </div>
          </div>
        </section>

        <section className="grid min-w-0 gap-3 xl:grid-cols-[minmax(0,0.94fr)_minmax(21rem,0.48fr)]">
          <Card data-verification-panel>
            <CardHeader className="flex flex-row items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-foreground">Entrada de evidencia</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Elige una forma de verificacion y usa casos listos para la defensa.
                </p>
              </div>
              <StatusBadge tone={manipulatedMode ? "warning" : "online"}>
                {manipulatedMode ? "Modo alterado" : "Modo original"}
              </StatusBadge>
            </CardHeader>
            <CardContent className="grid gap-4">
              <div className="grid gap-2 md:grid-cols-4">
                {Object.entries(methodLabels).map(([value, label]) => {
                  const method = value as VerificationMethod;

                  return (
                    <button
                      className={cn(
                        "grid min-h-20 gap-2 rounded-md border border-border/55 bg-black/38 p-3 text-left transition-colors hover:border-foreground/20 hover:bg-black/55 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/25",
                        activeMethod === method && "border-primary/35 bg-primary/10",
                      )}
                      key={method}
                      onClick={() => {
                        setActiveMethod(method);
                        setResult(null);
                      }}
                      type="button"
                    >
                      <span className="text-xs font-semibold text-foreground">{label}</span>
                      <span className="text-[11px] leading-5 text-muted-foreground">
                        {methodDescriptions[method]}
                      </span>
                    </button>
                  );
                })}
              </div>

              <div className="grid gap-3 rounded-md border border-border/55 bg-black/35 p-3">
                {activeMethod === "code" ? (
                  <label className="grid gap-2 text-xs font-semibold text-foreground">
                    Codigo publico
                    <Input
                      aria-label="Codigo publico"
                      onChange={(event) => setCodeInput(event.target.value.toUpperCase())}
                      placeholder="CERT-2026-0001"
                      value={codeInput}
                    />
                  </label>
                ) : null}

                {activeMethod === "hash" ? (
                  <label className="grid gap-2 text-xs font-semibold text-foreground">
                    Hash del documento
                    <Input
                      aria-label="Hash del documento"
                      onChange={(event) => {
                        setHashInput(event.target.value);
                        setManipulatedMode(false);
                      }}
                      placeholder="0x..."
                      value={hashInput}
                    />
                  </label>
                ) : null}

                {activeMethod === "pdf" ? (
                  <label className="grid gap-2 text-xs font-semibold text-foreground">
                    PDF simulado
                    <Textarea
                      aria-label="PDF simulado"
                      className="min-h-36"
                      onChange={(event) => {
                        setPdfInput(event.target.value);
                        setManipulatedMode(false);
                      }}
                      value={pdfInput}
                    />
                  </label>
                ) : null}

                {activeMethod === "qr" ? (
                  <label className="grid gap-2 text-xs font-semibold text-foreground">
                    QR simulado
                    <Textarea
                      aria-label="QR simulado"
                      className="min-h-28"
                      onChange={(event) => {
                        setQrInput(event.target.value);
                        setManipulatedMode(false);
                      }}
                      value={qrInput}
                    />
                  </label>
                ) : null}

                <div className="grid gap-2 sm:grid-cols-5">
                  <Button
                    icon={busy ? <ScanLine className="h-4 w-4" aria-hidden="true" /> : <Search className="h-4 w-4" aria-hidden="true" />}
                    onClick={() => void runVerification()}
                  >
                    {busy ? "Verificando" : "Verificar"}
                  </Button>
                  <Button
                    icon={<RotateCcw className="h-4 w-4" aria-hidden="true" />}
                    onClick={clearVerification}
                    variant="secondary"
                  >
                    Limpiar
                  </Button>
                  <Button
                    icon={<ClipboardCopy className="h-4 w-4" aria-hidden="true" />}
                    onClick={() => void copyResult()}
                    variant="secondary"
                  >
                    Copiar resultado
                  </Button>
                  <Button
                    icon={<FileSearch className="h-4 w-4" aria-hidden="true" />}
                    onClick={showDetail}
                    variant="secondary"
                  >
                    Ver detalle
                  </Button>
                  <Button
                    icon={<ShieldAlert className="h-4 w-4" aria-hidden="true" />}
                    onClick={simulateManipulatedDocument}
                    variant="secondary"
                  >
                    Simular documento manipulado
                  </Button>
                </div>
              </div>

              <div className="grid gap-2 md:grid-cols-4">
                {[
                  {
                    description: "Hash y estado vigente coinciden.",
                    id: "valid" as const,
                    label: "Certificado valido",
                  },
                  {
                    description: "Existe, pero fue revocado.",
                    id: "revoked" as const,
                    label: "Certificado revocado",
                  },
                  {
                    description: "PDF alterado frente al hash.",
                    id: "manipulated" as const,
                    label: "Documento manipulado",
                  },
                  {
                    description: "Codigo sin registro distribuido.",
                    id: "missing" as const,
                    label: "Certificado inexistente",
                  },
                ].map((item) => (
                  <button
                    aria-label={item.label}
                    className={cn(
                      "rounded-md border border-border/55 bg-black/38 p-3 text-left transition-colors hover:border-foreground/20 hover:bg-black/55 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/25",
                      caseId === item.id && "border-primary/35 bg-primary/10",
                    )}
                    key={item.id}
                    onClick={() => applyCase(item.id)}
                    type="button"
                  >
                    <span className="block text-xs font-semibold text-foreground">{item.label}</span>
                    <span className="mt-1 block text-[11px] leading-5 text-muted-foreground">
                      Usar caso de prueba. {item.description}
                    </span>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card data-verification-panel>
            <CardHeader className="flex flex-row items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-foreground">Resultado publico</p>
                <p className="mt-1 text-xs text-muted-foreground">Respuesta lista para una entidad verificadora.</p>
              </div>
              <StatusBadge tone={displayedCopy.tone}>{displayedCopy.label}</StatusBadge>
            </CardHeader>
            <CardContent className="grid gap-3">
              <div className="relative overflow-hidden rounded-md border border-border/55 bg-black/70 p-4">
                <div
                  className="pointer-events-none absolute inset-y-0 left-0 w-1/3 bg-primary/10 blur-md"
                  data-scan-line
                />
                <div className="relative z-10 grid gap-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-[11px] font-semibold uppercase text-muted-foreground">
                        Estado
                      </p>
                      <p
                        className={cn(
                          "mt-2 text-xl font-semibold tracking-tight",
                          displayedResult?.kind === "valid" && "text-success",
                          displayedResult?.kind === "revoked" && "text-warning",
                          displayedResult?.kind === "invalid" && "text-destructive",
                          !displayedResult || displayedResult.kind === "not_found"
                            ? "text-foreground"
                            : "",
                        )}
                        data-testid="verification-status"
                      >
                        {displayedCopy.label}
                      </p>
                    </div>
                    <span
                      className={cn(
                        "grid h-11 w-11 shrink-0 place-items-center rounded-md border border-border/70 bg-secondary",
                        displayedResult?.kind === "valid" && "border-success/35 text-success",
                        displayedResult?.kind === "revoked" && "border-warning/35 text-warning",
                        displayedResult?.kind === "invalid" && "border-destructive/35 text-destructive",
                      )}
                      data-result-seal
                    >
                      {displayedResult?.kind === "valid" ? (
                        <BadgeCheck className="h-5 w-5" aria-hidden="true" />
                      ) : displayedResult?.kind === "revoked" ? (
                        <AlertTriangle className="h-5 w-5" aria-hidden="true" />
                      ) : displayedResult?.kind === "invalid" ? (
                        <XCircle className="h-5 w-5" aria-hidden="true" />
                      ) : (
                        <Info className="h-5 w-5" aria-hidden="true" />
                      )}
                    </span>
                  </div>
                  <p className="text-sm leading-6 text-muted-foreground">{displayedCopy.explanation}</p>
                  <Progress value={progressValue} />
                </div>
              </div>

              <div className="grid gap-1 rounded-md border border-border/55 bg-black/45 p-3">
                <FieldLine
                  label="Estudiante"
                  value={displayedResult?.certificate?.studentName ?? "No encontrado"}
                />
                <FieldLine label="Carrera" value={displayedResult?.certificate?.career ?? "Sin dato"} />
                <FieldLine
                  label="Universidad"
                  value={displayedResult?.certificate?.university ?? "Sin dato"}
                />
                <FieldLine
                  label="Tipo de documento"
                  value={
                    displayedResult?.certificate
                      ? certificateTypeLabels[displayedResult.certificate.type]
                      : "Sin dato"
                  }
                />
                <FieldLine
                  label="Fecha de emision"
                  value={
                    displayedResult?.certificate
                      ? formatDateTime(displayedResult.certificate.issueDate)
                      : "Sin dato"
                  }
                />
                <FieldLine label="Emisor" value={displayedResult?.certificate?.issuerName ?? "Sin dato"} />
                <FieldLine
                  label="Transaction hash"
                  value={
                    displayedResult?.certificate
                      ? shortenHash(displayedResult.certificate.transactionHash, 10)
                      : "Sin dato"
                  }
                />
                <FieldLine
                  label="Numero de bloque"
                  value={
                    displayedResult?.certificate
                      ? numberFormatter.format(displayedResult.certificate.blockNumber)
                      : "Sin dato"
                  }
                />
              </div>
            </CardContent>
          </Card>
        </section>

        <section className="grid min-w-0 gap-3 xl:grid-cols-[minmax(0,0.78fr)_minmax(20rem,0.42fr)]">
          <Card data-hash-compare data-verification-panel>
            <CardHeader className="flex flex-row items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Fingerprint className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                <p className="text-sm font-semibold text-foreground">Comparacion de hashes</p>
              </div>
              <StatusBadge tone={displayedResult?.match ? "online" : "warning"}>
                Coincidencia {displayedResult?.match ? "si" : "no"}
              </StatusBadge>
            </CardHeader>
            <CardContent className="grid gap-3 md:grid-cols-3">
              <TechnicalHash label="Hash calculado" value={displayedResult?.calculatedHash ?? ""} />
              <TechnicalHash label="Hash registrado" value={displayedResult?.registeredHash ?? ""} />
              <div className="rounded-md border border-border/55 bg-black/45 p-3">
                <p className="text-[11px] font-semibold uppercase text-muted-foreground">Coincidencia</p>
                <p className="mt-2 text-sm font-semibold text-foreground">
                  {displayedResult ? (displayedResult.match ? "Si, coincide con blockchain" : "No coincide") : "Pendiente"}
                </p>
                <p className="mt-2 text-[11px] leading-5 text-muted-foreground">
                  La comparacion se hace contra el hash anclado en el contrato inteligente mock.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card data-verification-panel>
            <CardHeader className="flex flex-row items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <SlidersHorizontal className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                <p className="text-sm font-semibold text-foreground">Seccion tecnica</p>
              </div>
              <Button
                onClick={() => setTechnicalOpen((current) => !current)}
                variant="secondary"
              >
                {technicalOpen ? "Ocultar" : "Mostrar"}
              </Button>
            </CardHeader>
            {technicalOpen ? (
              <CardContent className="grid gap-2 text-xs">
                <FieldLine label="Metodo" value={methodLabels[activeMethod]} />
                <FieldLine label="Evidencia" value={displayedResult?.requestedEvidence ?? activeEvidence} />
                <FieldLine
                  label="Estado contractual"
                  value={
                    displayedResult?.certificate
                      ? certificateStatusLabels[displayedResult.certificate.status]
                      : "Sin contrato"
                  }
                />
                <FieldLine label="Eventos asociados" value={displayedResult?.events.length ?? 0} />
              </CardContent>
            ) : (
              <CardContent>
                <p className="text-xs leading-5 text-muted-foreground">
                  La lectura tecnica queda colapsada para mantener clara la experiencia publica.
                </p>
              </CardContent>
            )}
          </Card>
        </section>

        <Card data-verification-panel>
          <CardHeader className="flex flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <History className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
              <p className="text-sm font-semibold text-foreground">Historial de eventos</p>
            </div>
            <StatusBadge tone="neutral">{displayedResult?.events.length ?? 0} eventos</StatusBadge>
          </CardHeader>
          <CardContent>
            {displayedResult?.events.length ? (
              <ol className="grid gap-2 md:grid-cols-3">
                {displayedResult.events.map((event) => (
                  <li
                    className="rounded-md border border-border/55 bg-black/40 p-3 motion-transform"
                    data-verification-event
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
              <div className="rounded-md border border-border/55 bg-black/40 p-4 text-sm text-muted-foreground">
                Sin eventos asociados todavia. Usa un caso de prueba y presiona Verificar.
              </div>
            )}
          </CardContent>
        </Card>

        <section className="grid gap-3 md:grid-cols-4" data-verification-panel>
          <div className="rounded-lg border border-border bg-card/95 p-3">
            <FileText className="h-4 w-4 text-primary" aria-hidden="true" />
            <p className="mt-2 text-xs font-semibold text-foreground">Documento</p>
            <p className="mt-1 text-[11px] leading-5 text-muted-foreground">
              PDF o QR se transforma en evidencia verificable.
            </p>
          </div>
          <div className="rounded-lg border border-border bg-card/95 p-3">
            <Fingerprint className="h-4 w-4 text-primary" aria-hidden="true" />
            <p className="mt-2 text-xs font-semibold text-foreground">Hash</p>
            <p className="mt-1 text-[11px] leading-5 text-muted-foreground">
              SHA-256 evita aceptar contenido alterado.
            </p>
          </div>
          <div className="rounded-lg border border-border bg-card/95 p-3">
            <QrCode className="h-4 w-4 text-primary" aria-hidden="true" />
            <p className="mt-2 text-xs font-semibold text-foreground">QR publico</p>
            <p className="mt-1 text-[11px] leading-5 text-muted-foreground">
              El QR puede transportar codigo y hash registrado.
            </p>
          </div>
          <div className="rounded-lg border border-border bg-card/95 p-3">
            <ShieldCheck className="h-4 w-4 text-primary" aria-hidden="true" />
            <p className="mt-2 text-xs font-semibold text-foreground">Disponibilidad</p>
            <p className="mt-1 text-[11px] leading-5 text-muted-foreground">
              La consulta sigue disponible por la replica distribuida.
            </p>
          </div>
        </section>
      </MotionPage>
    </div>
  );
}

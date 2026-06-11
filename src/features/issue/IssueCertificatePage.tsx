import { useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { useGSAP } from "@gsap/react";
import { gsap } from "gsap";
import {
  BadgeCheck,
  Blocks,
  CheckCircle2,
  ClipboardCopy,
  Database,
  FileSignature,
  FileText,
  Fingerprint,
  KeyRound,
  Landmark,
  Loader2,
  LockKeyhole,
  Send,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  UserCheck,
  WalletCards,
} from "lucide-react";
import { MotionPage } from "@/components/motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { Progress } from "@/components/ui/progress";
import { Select } from "@/components/ui/select";
import { StatusBadge } from "@/components/ui/status-badge";
import { Textarea } from "@/components/ui/textarea";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { cn } from "@/lib/cn";
import { formatDateTime, numberFormatter } from "@/lib/formatters";
import { calculateSha256, normalizeHash, shortenHash } from "@/lib/hash";
import { motionPresets, setMotionCompleteState, shouldSkipMotion } from "@/lib/motion";
import { useWalletPermissionOptions } from "@/hooks/useWalletPermissionOptions";
import { canIssueCertificate } from "@/lib/permissions";
import { canNavigateToRoute, canShowIssueActions } from "@/lib/ui-permissions";
import { ROLE_LABELS } from "@/lib/roles";
import { certificateIssueSchema } from "@/lib/validators";
import { useAppStore } from "@/store/app-store";
import type { Certificate, CertificateType, Issuer, Student } from "@/types/domain";

const certificateTypeLabels: Record<CertificateType, string> = {
  academic_diploma: "Diploma academico",
  grade_certificate: "Certificado de notas",
  graduation_certificate: "Certificado de egreso",
  professional_title: "Titulo profesional",
  study_record: "Constancia de estudios",
};

const issueSteps = [
  {
    detail: "Revisa campos, rol activo, wallet y emisor.",
    icon: CheckCircle2,
    title: "Validar datos",
  },
  {
    detail: "Carga el PDF academico real que sera anclado.",
    icon: FileText,
    title: "Preparar PDF",
  },
  {
    detail: "Calcula la huella criptografica del documento.",
    icon: Fingerprint,
    title: "Calcular hash SHA-256",
  },
  {
    detail: "Solicita firma real desde MetaMask.",
    icon: KeyRound,
    title: "Firmar digitalmente la emision",
  },
  {
    detail: "Invoca emitirCertificado() en el contrato desplegado.",
    icon: Send,
    title: "Enviar transaccion Ethereum",
  },
  {
    detail: "Espera consenso y asignacion de bloque.",
    icon: Blocks,
    title: "Esperar confirmacion de bloque",
  },
  {
    detail: "Guarda certificado, hash y firma institucional.",
    icon: BadgeCheck,
    title: "Registrar certificado",
  },
  {
    detail: "Agrega evento certificate_issued al ledger.",
    icon: Database,
    title: "Agregar evento al ledger",
  },
  {
    detail: "Abre el resumen verificable de la emision.",
    icon: Sparkles,
    title: "Mostrar resultado",
  },
] as const;

type IssueFormState = {
  career: string;
  certificateType: CertificateType;
  code: string;
  faculty: string;
  identityDocument: string;
  issueDate: string;
  issuerId: string;
  issuerRole: string;
  observations: string;
  pdfName: string;
  studentId: string;
  studentName: string;
  university: string;
};

function todayInputValue() {
  return new Date().toISOString().slice(0, 10);
}

function nextCertificateCode(count: number) {
  return `CERT-2026-${String(count + 1).padStart(4, "0")}`;
}

function defaultIssueForm(count: number): IssueFormState {
  const code = nextCertificateCode(count);

  return {
    career: "",
    certificateType: "grade_certificate",
    code,
    faculty: "",
    identityDocument: "",
    issueDate: todayInputValue(),
    issuerId: "",
    issuerRole: "",
    observations: "Emision academica para defensa de sistemas distribuidos.",
    pdfName: `${code.toLowerCase()}.pdf`,
    studentId: "",
    studentName: "",
    university: "",
  };
}

function delay(ms: number) {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

function FieldShell({
  children,
  error,
  label,
}: {
  children: ReactNode;
  error?: string;
  label: string;
}) {
  return (
    <label className="grid gap-2 text-xs font-semibold text-foreground">
      <span>{label}</span>
      {children}
      {error ? <span className="text-[11px] font-medium text-destructive">{error}</span> : null}
    </label>
  );
}

function DetailRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="grid grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] gap-3 border-b border-border/45 py-2 last:border-b-0">
      <span className="text-[11px] text-muted-foreground">{label}</span>
      <span className="min-w-0 truncate text-right font-mono text-[11px] text-foreground">
        {value}
      </span>
    </div>
  );
}

function StudentOption({
  onSelect,
  selected,
  student,
}: {
  onSelect: (student: Student) => void;
  selected: boolean;
  student: Student;
}) {
  return (
    <button
      aria-label={`Seleccionar estudiante ${student.fullName}`}
      className={cn(
        "grid w-full grid-cols-[auto_1fr] items-start gap-3 rounded-md border border-border/55 bg-muted/48 p-3 text-left transition-all hover:border-foreground/20 hover:bg-muted/65 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/20",
        selected && "border-primary/35 bg-primary/10 text-primary",
      )}
      onClick={() => onSelect(student)}
      type="button"
    >
      <span className="grid h-8 w-8 place-items-center rounded-md border border-border/70 bg-secondary text-muted-foreground">
        <UserCheck className="h-4 w-4" aria-hidden="true" />
      </span>
      <span className="min-w-0">
        <span className="block truncate text-xs font-semibold text-foreground">
          {student.fullName}
        </span>
        <span className="mt-1 block truncate font-mono text-[11px] text-muted-foreground">
          {student.identityDocument} | {student.enrollmentCode}
        </span>
      </span>
    </button>
  );
}

function IssuerOption({
  issuer,
  onSelect,
  selected,
}: {
  issuer: Issuer;
  onSelect: (issuer: Issuer) => void;
  selected: boolean;
}) {
  return (
    <button
      aria-label={`Usar emisor ${issuer.name}`}
      className={cn(
        "grid w-full grid-cols-[auto_1fr_auto] items-start gap-3 rounded-md border border-border/55 bg-muted/48 p-3 text-left transition-all hover:border-foreground/20 hover:bg-muted/65 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-55",
        selected && "border-success/35 bg-success/10",
      )}
      disabled={!issuer.active}
      onClick={() => onSelect(issuer)}
      type="button"
    >
      <span className="grid h-8 w-8 place-items-center rounded-md border border-border/70 bg-secondary text-muted-foreground">
        <Landmark className="h-4 w-4" aria-hidden="true" />
      </span>
      <span className="min-w-0">
        <span className="block truncate text-xs font-semibold text-foreground">{issuer.name}</span>
        <span className="mt-1 block truncate text-[11px] text-muted-foreground">
          {issuer.institution} | {issuer.role}
        </span>
      </span>
      <StatusBadge tone={issuer.active ? "online" : "offline"}>
        {issuer.active ? "Activo" : "Inactivo"}
      </StatusBadge>
    </button>
  );
}

export function IssueCertificatePage() {
  const pageRef = useRef<HTMLDivElement>(null);
  const certificates = useAppStore((state) => state.certificates);
  const students = useAppStore((state) => state.students);
  const issuers = useAppStore((state) => state.issuers);
  const wallet = useAppStore((state) => state.wallet);
  const activeRole = useAppStore((state) => state.activeRole);
  const activePersona = useAppStore((state) => state.activePersona);
  const selectedNetwork = useAppStore((state) => state.selectedNetwork);
  const walletOptions = useWalletPermissionOptions();
  const chainConnected = useAppStore((state) => state.chainConnected);
  const issueCertificate = useAppStore((state) => state.issueCertificate);
  const connectWallet = useAppStore((state) => state.connectWallet);
  const setRoute = useAppStore((state) => state.setRoute);
  const addToast = useAppStore((state) => state.addToast);
  const reducedMotion = useReducedMotion();
  const [form, setForm] = useState<IssueFormState>(() => defaultIssueForm(certificates.length));
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [activeStep, setActiveStep] = useState(-1);
  const [busy, setBusy] = useState(false);
  const [confirmedBlock, setConfirmedBlock] = useState<number | null>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const [generatedHash, setGeneratedHash] = useState("");
  const [issuerSignature, setIssuerSignature] = useState("");
  const [issuedCertificate, setIssuedCertificate] = useState<Certificate | null>(null);
  const [invalidPulse, setInvalidPulse] = useState(0);
  const [resultOpen, setResultOpen] = useState(false);
  const [transactionHash, setTransactionHash] = useState("");

  const visibleIssuers = useMemo(() => {
    if (activeRole === "authorized_issuer" && activePersona.issuerId) {
      return issuers.filter((issuer) => issuer.id === activePersona.issuerId);
    }

    return issuers;
  }, [activePersona.issuerId, activeRole, issuers]);

  const selectedStudent = students.find((student) => student.id === form.studentId);
  const selectedIssuer = issuers.find((issuer) => issuer.id === form.issuerId);
  const progress = activeStep < 0 ? 0 : Math.round(((activeStep + 1) / issueSteps.length) * 100);
  const contractReady = Boolean(
    wallet.connected &&
      chainConnected &&
      wallet.isContractReady &&
      wallet.isSupportedNetwork &&
      canIssueCertificate(selectedIssuer, activeRole, walletOptions),
  );

  useEffect(() => {
    if (activeRole !== "authorized_issuer" || !activePersona.issuerId) {
      return;
    }

    const issuer = issuers.find((item) => item.id === activePersona.issuerId);

    if (!issuer) {
      return;
    }

    setForm((current) => ({
      ...current,
      issuerId: issuer.id,
      issuerRole: issuer.role,
      university: issuer.institution,
    }));
  }, [activePersona.issuerId, activeRole, issuers]);

  useGSAP(
    () => {
      const page = pageRef.current;

      if (!page) {
        return;
      }

      const stepItems = page.querySelectorAll("[data-issue-step]");
      const panels = page.querySelectorAll("[data-issue-panel]");

      if (shouldSkipMotion(reducedMotion)) {
        setMotionCompleteState(stepItems);
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

      if (!page || activeStep < 0 || shouldSkipMotion(reducedMotion)) {
        return;
      }

      const timeline = gsap.timeline({ defaults: { duration: 0.22, ease: "power2.out" } });
      const currentStep = page.querySelector(`[data-issue-step="${activeStep}"]`);

      if (currentStep) {
        timeline.fromTo(currentStep, { scale: 0.98, y: 6 }, { scale: 1, y: 0 }, 0);
      }

      if (activeStep === 2) {
        timeline.to("[data-hash-panel]", motionPresets.hashCalculation.to, 0);
      }

      if (activeStep === 3) {
        timeline.fromTo(
          "[data-signature-panel]",
          { autoAlpha: 0.72, scale: 0.98 },
          { autoAlpha: 1, scale: 1, duration: 0.3 },
          0,
        );
      }

      if (activeStep === 4) {
        timeline.fromTo(
          "[data-transaction-panel]",
          motionPresets.transactionConfirm.from,
          motionPresets.transactionConfirm.to,
          0,
        );
      }

      if (activeStep === 5) {
        timeline.fromTo(
          "[data-contract-status]",
          { autoAlpha: 0.75, y: 8 },
          { autoAlpha: 1, y: 0, duration: 0.28 },
          0,
        );
      }

      return () => timeline.kill();
    },
    { dependencies: [activeStep, reducedMotion], revertOnUpdate: true, scope: pageRef },
  );

  useGSAP(
    () => {
      const page = pageRef.current;
      const errorBox = page?.querySelector("[data-issue-errors]");

      if (!page || !errorBox || invalidPulse === 0 || shouldSkipMotion(reducedMotion)) {
        return;
      }

      const tween = gsap.to(errorBox, motionPresets.invalidShake.to);

      return () => tween.kill();
    },
    { dependencies: [invalidPulse, reducedMotion], revertOnUpdate: true, scope: pageRef },
  );

  const updateForm = <K extends keyof IssueFormState>(key: K, value: IssueFormState[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const selectStudent = (student: Student) => {
    setForm((current) => ({
      ...current,
      career: student.career,
      faculty: student.faculty,
      identityDocument: student.identityDocument,
      studentId: student.id,
      studentName: student.fullName,
      university: student.university,
    }));
  };

  const selectIssuer = (issuer: Issuer) => {
    if (!issuer.active) {
      return;
    }

    setForm((current) => ({
      ...current,
      issuerId: issuer.id,
      issuerRole: issuer.role,
    }));
  };

  const validateForm = () => {
    const nextErrors: string[] = [];
    const requiredValues = [
      form.career,
      form.code,
      form.faculty,
      form.identityDocument,
      form.issueDate,
      form.issuerId,
      form.issuerRole,
      form.observations,
      form.pdfName,
      form.studentId,
      form.studentName,
      form.university,
    ];

    if (!wallet.connected || !chainConnected || !wallet.isContractReady) {
      nextErrors.push("Conecta MetaMask con el contrato academico");
    }

    if (!pdfFile) {
      nextErrors.push("Carga un archivo PDF real");
    }

    if (requiredValues.some((value) => !value.trim())) {
      nextErrors.push("Completa los campos obligatorios");
    }

    if (!/^CERT-\d{4}-\d{4}$/.test(form.code.trim())) {
      nextErrors.push("El codigo debe usar formato CERT-2026-0001");
    }

    if (certificates.some((certificate) => certificate.code === form.code.trim())) {
      nextErrors.push("El codigo del certificado ya existe en el ledger");
    }

    if (Number.isNaN(new Date(form.issueDate).getTime())) {
      nextErrors.push("La fecha de emision no es valida");
    }

    if (selectedIssuer && !selectedIssuer.active) {
      nextErrors.push("El emisor seleccionado esta inactivo");
    }

    if (!(activeRole === "academic_admin" || activeRole === "authorized_issuer")) {
      nextErrors.push("El rol activo no puede emitir certificados");
    }

    const schemaResult = certificateIssueSchema.safeParse({
      career: form.career,
      certificateType: form.certificateType,
      code: form.code,
      faculty: form.faculty,
      identityDocument: form.identityDocument,
      issueDate: form.issueDate,
      issuerId: form.issuerId,
      observations: form.observations,
      pdfName: form.pdfName,
      studentId: form.studentId,
      university: form.university,
    });

    if (!schemaResult.success && !nextErrors.includes("Completa los campos obligatorios")) {
      nextErrors.push("Completa los campos obligatorios");
    }

    setErrors(nextErrors);

    return nextErrors.length === 0;
  };

  const runIssueFlow = async () => {
    if (busy) {
      return;
    }

    if (!validateForm() || !selectedIssuer || !selectedStudent) {
      setInvalidPulse((current) => current + 1);
      return;
    }

    setActiveStep(-1);
    setBusy(true);
    setConfirmedBlock(null);
    setErrors([]);
    setGeneratedHash("");
    setIssuerSignature("");
    setIssuedCertificate(null);
    setResultOpen(false);
    setTransactionHash("");

    const motionDelay = shouldSkipMotion(reducedMotion) ? 0 : 105;
    for (let index = 0; index < issueSteps.length; index += 1) {
      setActiveStep(index);

      if (index === 2) {
        const hash = normalizeHash(await calculateSha256(pdfFile as File));
        setGeneratedHash(hash);
      }

      if (index === 3) {
        setIssuerSignature(`MetaMask:${shortenHash(wallet.address, 8)}`);
      }

      if (index === 5) {
        setConfirmedBlock(null);
      }

      if (index === 6) {
        const certificate = await issueCertificate({
          career: form.career.trim(),
          certificateType: form.certificateType,
          code: form.code.trim(),
          faculty: form.faculty.trim(),
          identityDocument: form.identityDocument.trim(),
          issueDate: form.issueDate,
          issuerId: selectedIssuer.id,
          observations: form.observations.trim(),
          pdfFile: pdfFile ?? undefined,
          pdfName: form.pdfName.trim(),
          studentId: selectedStudent.id,
          studentWallet: selectedStudent.walletAddress,
          university: form.university.trim(),
        });

        if (!certificate || !canIssueCertificate(selectedIssuer, activeRole, walletOptions)) {
          setErrors(["No se pudo registrar el certificado con los permisos actuales"]);
          setInvalidPulse((current) => current + 1);
          setBusy(false);
          return;
        }

        setConfirmedBlock(certificate.blockNumber);
        setGeneratedHash(certificate.documentHash);
        setIssuedCertificate(certificate);
        setTransactionHash(certificate.transactionHash);
      }

      if (motionDelay > 0) {
        await delay(motionDelay);
      }
    }

    setBusy(false);
    setResultOpen(true);
  };

  const copyValue = async (label: string, value: string) => {
    if (!value) {
      return;
    }

    await navigator.clipboard?.writeText(value);
    addToast({
      title: `${label} copiado`,
      description: shortenHash(value, 12),
      intent: "info",
    });
  };

  const stepState = (index: number) => {
    if (activeStep > index) {
      return "complete";
    }

    if (activeStep === index) {
      return "active";
    }

    return "pending";
  };

  return (
    <div ref={pageRef}>
      <MotionPage
        className="grid min-w-0 gap-3"
        data-testid="issue-flow"
        staggerSelector="[data-issue-panel]"
      >
      <section
        className="rounded-lg border border-border bg-card p-4 shadow-[inset_0_1px_0_hsl(var(--foreground)/0.035),0_24px_70px_-46px_hsl(var(--shadow-ledger)/1)]"
        data-issue-panel
      >
        <div className="flex min-w-0 flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0">
            <div className="mb-3 flex flex-wrap gap-2">
              <StatusBadge tone={wallet.connected ? "online" : "warning"}>
                {wallet.connected ? "Wallet conectada" : "Wallet requerida"}
              </StatusBadge>
              <StatusBadge tone={contractReady ? "online" : "neutral"}>
                Contrato academico {contractReady ? "listo" : "en espera"}
              </StatusBadge>
              <StatusBadge tone="syncing">{selectedNetwork}</StatusBadge>
            </div>
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">
              Emitir certificado
            </h1>
            <p className="mt-1 max-w-3xl text-sm leading-6 text-muted-foreground">
              Carga un PDF, calcula SHA-256, firma con MetaMask y ancla la evidencia en
              Ethereum para una universidad boliviana emisora.
            </p>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            <Button
              className="min-w-0"
              icon={<WalletCards className="h-4 w-4" aria-hidden="true" />}
              onClick={() => void connectWallet()}
              variant={wallet.connected ? "secondary" : "primary"}
            >
              {wallet.connected ? "Wallet activa" : "Conectar MetaMask"}
            </Button>
            {canNavigateToRoute(activeRole, "issuers") ? (
              <Button
                className="min-w-0"
                icon={<ShieldCheck className="h-4 w-4" aria-hidden="true" />}
                onClick={() => setRoute("issuers")}
                variant="secondary"
              >
                Ver emisores
              </Button>
            ) : null}
          </div>
        </div>
      </section>

      <section className="grid min-w-0 gap-3 xl:grid-cols-[minmax(0,1fr)_minmax(21rem,0.52fr)]">
        <Card className="min-w-0" data-issue-panel>
          <CardHeader className="flex flex-row items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-foreground">Datos academicos</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Selecciona un estudiante precargado o ajusta manualmente la evidencia.
              </p>
            </div>
            <StatusBadge tone={activeRole === "student" ? "warning" : "online"}>
              {ROLE_LABELS[activeRole]}
            </StatusBadge>
          </CardHeader>
          <CardContent>
            {errors.length > 0 ? (
              <div
                className="mb-4 rounded-md border border-warning/30 bg-warning/10 p-3 text-xs text-warning"
                data-issue-errors
              >
                <div className="flex items-center gap-2 font-semibold">
                  <ShieldAlert className="h-4 w-4" aria-hidden="true" />
                  Revision requerida antes de emitir
                </div>
                <ul className="mt-2 grid gap-1">
                  {errors.map((error) => (
                    <li key={error}>{error}</li>
                  ))}
                </ul>
              </div>
            ) : null}

            <form
              className="grid gap-4"
              onSubmit={(event) => {
                event.preventDefault();
                void runIssueFlow();
              }}
            >
              <div className="grid gap-3 lg:grid-cols-3">
                <FieldShell label="Codigo del certificado">
                  <Input
                    onChange={(event) => {
                      const nextCode = event.target.value.toUpperCase();
                      setForm((current) => ({
                        ...current,
                        code: nextCode,
                        pdfName:
                          current.pdfName === `${current.code.toLowerCase()}.pdf`
                            ? `${nextCode.toLowerCase()}.pdf`
                            : current.pdfName,
                      }));
                    }}
                    value={form.code}
                  />
                </FieldShell>
                <FieldShell label="Tipo de documento">
                  <Select
                    ariaLabel="Tipo de documento"
                    className="w-full"
                    onValueChange={(value) => updateForm("certificateType", value as CertificateType)}
                    options={Object.entries(certificateTypeLabels).map(([value, label]) => ({
                      label,
                      value,
                    }))}
                    value={form.certificateType}
                  />
                </FieldShell>
                <FieldShell label="Fecha de emision">
                  <Input
                    onChange={(event) => updateForm("issueDate", event.target.value)}
                    type="date"
                    value={form.issueDate}
                  />
                </FieldShell>
              </div>

              <div className="grid gap-3 xl:grid-cols-[minmax(0,0.76fr)_minmax(0,1.24fr)]">
                <div className="grid gap-2">
                  <p className="text-xs font-semibold text-foreground">Estudiantes precargados</p>
                  {students.slice(0, 4).map((student) => (
                    <StudentOption
                      key={student.id}
                      onSelect={selectStudent}
                      selected={form.studentId === student.id}
                      student={student}
                    />
                  ))}
                </div>

                <div className="grid gap-3 rounded-md border border-border/55 bg-muted/45 p-3">
                  <div className="grid gap-3 md:grid-cols-2">
                    <FieldShell label="Nombre del estudiante">
                      <Input
                        onChange={(event) => updateForm("studentName", event.target.value)}
                        placeholder="Nombre completo"
                        value={form.studentName}
                      />
                    </FieldShell>
                    <FieldShell label="Documento de identidad">
                      <Input
                        onChange={(event) => updateForm("identityDocument", event.target.value)}
                        placeholder="LP-0000000"
                        value={form.identityDocument}
                      />
                    </FieldShell>
                  </div>
                  <div className="grid gap-3 md:grid-cols-2">
                    <FieldShell label="Carrera">
                      <Input
                        onChange={(event) => updateForm("career", event.target.value)}
                        placeholder="Ingenieria de Sistemas"
                        value={form.career}
                      />
                    </FieldShell>
                    <FieldShell label="Facultad">
                      <Input
                        onChange={(event) => updateForm("faculty", event.target.value)}
                        placeholder="Facultad de Tecnologia"
                        value={form.faculty}
                      />
                    </FieldShell>
                  </div>
                  <FieldShell label="Universidad">
                    <Input
                      onChange={(event) => updateForm("university", event.target.value)}
                      placeholder="Universidad Mayor de San Andres"
                      value={form.university}
                    />
                  </FieldShell>
                </div>
              </div>

              <div className="grid gap-3 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
                <div className="grid gap-2">
                  <p className="text-xs font-semibold text-foreground">Emisores autorizados</p>
                  {visibleIssuers.map((issuer) => (
                    <IssuerOption
                      issuer={issuer}
                      key={issuer.id}
                      onSelect={selectIssuer}
                      selected={form.issuerId === issuer.id}
                    />
                  ))}
                </div>

                <div className="grid gap-3 rounded-md border border-border/55 bg-muted/45 p-3">
                  <div className="grid gap-3 md:grid-cols-2">
                    <FieldShell label="Emisor autorizado">
                      <Input
                        onChange={(event) => updateForm("issuerId", event.target.value)}
                        placeholder="Selecciona un emisor activo"
                        readOnly
                        value={selectedIssuer?.name ?? ""}
                      />
                    </FieldShell>
                    <FieldShell label="Cargo del emisor">
                      <Input
                        onChange={(event) => updateForm("issuerRole", event.target.value)}
                        placeholder="Cargo institucional"
                        readOnly
                        value={form.issuerRole}
                      />
                    </FieldShell>
                  </div>
                  <FieldShell label="Archivo PDF">
                    <Input
                      accept="application/pdf"
                      aria-label="Archivo PDF"
                      onChange={(event) => {
                        const file = event.target.files?.[0] ?? null;
                        setPdfFile(file);
                        if (file) {
                          updateForm("pdfName", file.name);
                        }
                      }}
                      type="file"
                    />
                    <span className="font-normal text-muted-foreground">
                      {pdfFile ? pdfFile.name : "Sin archivo seleccionado"}
                    </span>
                  </FieldShell>
                  <FieldShell label="Observaciones">
                    <Textarea
                      onChange={(event) => updateForm("observations", event.target.value)}
                      value={form.observations}
                    />
                  </FieldShell>
                </div>
              </div>

              {canShowIssueActions(activeRole) ? (
                <div className="flex flex-col gap-3 rounded-md border border-border/55 bg-muted/55 p-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-foreground">Permiso de contrato</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      emitirCertificado() requiere MetaMask, contrato desplegado, rol emisor y PDF real.
                    </p>
                  </div>
                  <Button
                    aria-label="Emitir certificado"
                    disabled={busy}
                    icon={
                      busy ? (
                        <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                      ) : (
                        <FileSignature className="h-4 w-4" aria-hidden="true" />
                      )
                    }
                    type="submit"
                  >
                    {busy ? "Emitiendo" : "Emitir certificado"}
                  </Button>
                </div>
              ) : null}
            </form>
          </CardContent>
        </Card>

        <div className="grid min-w-0 gap-3">
          <Card data-issue-panel>
            <CardHeader className="flex flex-row items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-foreground">
                  Panel lateral de previsualizacion
                </p>
                <p className="mt-1 text-xs text-muted-foreground">PDF academico real</p>
              </div>
              <StatusBadge tone={selectedStudent ? "online" : "neutral"}>
                {selectedStudent ? "Datos listos" : "Sin estudiante"}
              </StatusBadge>
            </CardHeader>
            <CardContent className="grid gap-3">
              <div className="rounded-md border border-border/55 bg-muted/75 p-4 shadow-[inset_0_1px_0_hsl(var(--foreground)/0.035)]">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-mono text-xs text-muted-foreground">{form.code}</p>
                    <p className="mt-2 text-base font-semibold text-foreground">
                      {certificateTypeLabels[form.certificateType]}
                    </p>
                  </div>
                  <FileText className="h-5 w-5 text-primary" aria-hidden="true" />
                </div>
                <div className="mt-4 grid gap-1 text-xs">
                  <DetailRow label="Estudiante" value={form.studentName || "Pendiente"} />
                  <DetailRow label="Documento" value={form.identityDocument || "Pendiente"} />
                  <DetailRow label="Carrera" value={form.career || "Pendiente"} />
                  <DetailRow label="Universidad" value={form.university || "Pendiente"} />
                  <DetailRow label="PDF" value={form.pdfName || "Pendiente"} />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card data-hash-panel data-issue-panel>
            <CardContent className="grid gap-3 p-3">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Fingerprint className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                  <p className="text-sm font-semibold text-foreground">Hash generado</p>
                </div>
                <StatusBadge tone={generatedHash ? "online" : "neutral"}>
                  {generatedHash ? "SHA-256" : "Pendiente"}
                </StatusBadge>
              </div>
              <div className="rounded-md border border-border/55 bg-muted/65 p-3 font-mono text-[11px] text-muted-foreground">
                {generatedHash ? shortenHash(generatedHash, 18) : "Esperando calculo SHA-256"}
              </div>
            </CardContent>
          </Card>

          <Card data-issue-panel data-transaction-panel>
            <CardContent className="grid gap-3 p-3">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Send className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                  <p className="text-sm font-semibold text-foreground">Tarjeta de transaccion</p>
                </div>
                <StatusBadge tone={transactionHash ? "syncing" : "neutral"}>
                  {transactionHash ? "Enviada" : "Lista"}
                </StatusBadge>
              </div>
              <div className="rounded-md border border-border/55 bg-muted/65 p-3 font-mono text-[11px] text-muted-foreground">
                {transactionHash ? shortenHash(transactionHash, 14) : "tx pendiente"}
              </div>
              <div className="rounded-md border border-border/45 bg-muted/45 p-3" data-signature-panel>
                <p className="text-[11px] text-muted-foreground">Firma de emision</p>
                <p className="mt-1 truncate font-mono text-[11px] text-foreground">
                  {issuerSignature || "firma digital pendiente"}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card data-contract-status data-issue-panel>
            <CardContent className="grid gap-3 p-3">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <LockKeyhole className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                  <p className="text-sm font-semibold text-foreground">Estado del contrato</p>
                </div>
                <StatusBadge tone={contractReady ? "online" : "warning"}>
                  {contractReady ? "Operativo" : "Bloqueado"}
                </StatusBadge>
              </div>
              <div className="grid gap-2 rounded-md border border-border/55 bg-muted/65 p-3 text-xs">
                <DetailRow label="Metodo" value="emitirCertificado()" />
                <DetailRow label="Bloque" value={confirmedBlock ? numberFormatter.format(confirmedBlock) : "Pendiente"} />
                <DetailRow label="Red" value={selectedNetwork} />
                <DetailRow label="Eventos" value={`${certificates.length} certificados`} />
              </div>
              <div>
                <div className="mb-2 flex items-center justify-between gap-3">
                  <p className="text-xs font-semibold text-foreground">Barra de progreso</p>
                  <span className="font-mono text-[11px] text-muted-foreground">{progress}%</span>
                </div>
                <Progress value={progress} />
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      <Card data-issue-panel>
        <CardHeader className="flex flex-row items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-foreground">Secuencia Web3</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Cada etapa representa una accion observable durante la defensa.
            </p>
          </div>
          <StatusBadge tone={busy ? "syncing" : issuedCertificate ? "online" : "neutral"}>
            {busy ? "Procesando" : issuedCertificate ? "Confirmado" : "Preparado"}
          </StatusBadge>
        </CardHeader>
        <CardContent>
          <ol className="grid gap-2 md:grid-cols-3 xl:grid-cols-9">
            {issueSteps.map((step, index) => {
              const Icon = step.icon;
              const state = stepState(index);

              return (
                <li
                  className={cn(
                    "grid min-h-[8.5rem] gap-3 rounded-md border border-border/55 bg-muted/48 p-3 motion-transform",
                    state === "active" && "border-primary/35 bg-primary/10",
                    state === "complete" && "border-success/25 bg-success/10",
                  )}
                  data-issue-step={index}
                  key={step.title}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={cn(
                        "grid h-8 w-8 place-items-center rounded-md border border-border/70 bg-secondary text-muted-foreground",
                        state === "active" && "border-primary/35 text-primary",
                        state === "complete" && "border-success/35 text-success",
                      )}
                    >
                      <Icon className="h-4 w-4" aria-hidden="true" />
                    </span>
                    <span className="font-mono text-[11px] text-muted-foreground">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-foreground">{step.title}</p>
                    <p className="mt-1 text-[11px] leading-5 text-muted-foreground">{step.detail}</p>
                  </div>
                </li>
              );
            })}
          </ol>
        </CardContent>
      </Card>

        <Modal
        description="El hash SHA-256, la firma institucional y la transaccion Ethereum quedaron asociados al estudiante seleccionado."
        onOpenChange={setResultOpen}
        open={resultOpen}
        title="Certificado emitido"
      >
        <div className="grid gap-4">
          <div className="grid gap-2 rounded-md border border-border/55 bg-muted/65 p-3 text-xs">
            <DetailRow label="Codigo" value={issuedCertificate?.code ?? form.code} />
            <DetailRow label="Estudiante" value={issuedCertificate?.studentName ?? form.studentName} />
            <DetailRow label="Estado" value={issuedCertificate ? "Pendiente de recepcion" : "Confirmado"} />
            <DetailRow
              label="Bloque"
              value={
                issuedCertificate
                  ? numberFormatter.format(issuedCertificate.blockNumber)
                  : confirmedBlock
                    ? numberFormatter.format(confirmedBlock)
                    : "Pendiente"
              }
            />
            <DetailRow
              label="Fecha"
              value={issuedCertificate ? formatDateTime(issuedCertificate.issueDate) : form.issueDate}
            />
          </div>

          <div className="grid gap-3 rounded-md border border-border/55 bg-muted/65 p-3">
            <div>
              <p className="text-xs font-semibold text-foreground">Hash SHA-256</p>
              <p className="mt-1 break-all font-mono text-[11px] leading-5 text-muted-foreground">
                {issuedCertificate?.documentHash ?? generatedHash}
              </p>
            </div>
            <div>
              <p className="text-xs font-semibold text-foreground">Transaction hash</p>
              <p className="mt-1 break-all font-mono text-[11px] leading-5 text-muted-foreground">
                {issuedCertificate?.transactionHash ?? transactionHash}
              </p>
            </div>
          </div>

          <div className="grid gap-2 sm:grid-cols-3">
            <Button
              aria-label="Copiar hash"
              icon={<ClipboardCopy className="h-4 w-4" aria-hidden="true" />}
              onClick={() => void copyValue("Hash", issuedCertificate?.documentHash ?? generatedHash)}
              variant="secondary"
            >
              Copiar hash
            </Button>
            <Button
              aria-label="Copiar transaction hash"
              icon={<ClipboardCopy className="h-4 w-4" aria-hidden="true" />}
              onClick={() =>
                void copyValue("Transaction hash", issuedCertificate?.transactionHash ?? transactionHash)
              }
              variant="secondary"
            >
              Copiar tx
            </Button>
            <Button
              icon={<FileSignature className="h-4 w-4" aria-hidden="true" />}
              onClick={() => {
                setResultOpen(false);
                setRoute("certificates");
              }}
            >
              Ver detalle
            </Button>
          </div>
        </div>
        </Modal>
      </MotionPage>
    </div>
  );
}

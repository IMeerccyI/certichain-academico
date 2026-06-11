import { useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { useGSAP } from "@gsap/react";
import { gsap } from "gsap";
import {
  BadgeCheck,
  FileSignature,
  Fingerprint,
  GraduationCap,
  History,
  IdCard,
  Mail,
  PenLine,
  ShieldAlert,
  UserRound,
  WalletCards,
} from "lucide-react";
import { MotionPage } from "@/components/motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { StatusBadge } from "@/components/ui/status-badge";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { canSignStudentReception } from "@/lib/ui-permissions";
import { cn } from "@/lib/cn";
import { formatDateTime, numberFormatter } from "@/lib/formatters";
import { shortenHash } from "@/lib/hash";
import { setMotionCompleteState, shouldSkipMotion } from "@/lib/motion";
import { useAppStore } from "@/store/app-store";
import type { BlockchainEvent, Certificate, CertificateStatus, Student } from "@/types/domain";

type StudentView = {
  academicState: string;
  certificates: Certificate[];
  events: BlockchainEvent[];
  lastActivity: string;
  pendingReception: Certificate[];
  receivedCount: number;
  student: Student;
};

const certificateStatusLabels: Record<CertificateStatus, string> = {
  manipulated: "Observado",
  not_found: "No encontrado",
  pending_reception: "Pendiente de recepcion",
  revoked: "Revocado",
  valid: "Recepcion firmada",
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

function academicStateFor(certificates: Certificate[]) {
  if (certificates.some((certificate) => certificate.status === "manipulated")) {
    return "Observado";
  }

  if (certificates.some((certificate) => certificate.status === "pending_reception")) {
    return "Pendiente recepcion";
  }

  if (
    certificates.some(
      (certificate) =>
        certificate.status === "valid" &&
        (certificate.type === "professional_title" || certificate.type === "graduation_certificate"),
    )
  ) {
    return "Egreso verificado";
  }

  if (certificates.length > 0) {
    return "Regular";
  }

  return "Sin certificados";
}

function latestIso(values: Array<string | undefined>) {
  const sorted = values
    .filter(Boolean)
    .sort((left, right) => new Date(right ?? "").getTime() - new Date(left ?? "").getTime());

  return sorted[0] ?? new Date().toISOString();
}

function statusTone(status: Certificate["status"]) {
  if (status === "valid") {
    return "online" as const;
  }

  if (status === "pending_reception" || status === "revoked") {
    return "warning" as const;
  }

  if (status === "manipulated") {
    return "offline" as const;
  }

  return "neutral" as const;
}

export function StudentsPage() {
  const pageRef = useRef<HTMLDivElement>(null);
  const activeRole = useAppStore((state) => state.activeRole);
  const activePersona = useAppStore((state) => state.activePersona);
  const students = useAppStore((state) => state.students);
  const certificates = useAppStore((state) => state.certificates);
  const blockchainEvents = useAppStore((state) => state.blockchainEvents);
  const chainConnected = useAppStore((state) => state.chainConnected);
  const signStudentReception = useAppStore((state) => state.signStudentReception);
  const addToast = useAppStore((state) => state.addToast);
  const reducedMotion = useReducedMotion();
  const [selectedStudentId, setSelectedStudentId] = useState(students[0]?.id ?? "");
  const [signedCertificateId, setSignedCertificateId] = useState<string | null>(null);

  const scopedStudents = useMemo(() => {
    if (activeRole === "student" && activePersona.studentId) {
      return students.filter((student) => student.id === activePersona.studentId);
    }

    return students;
  }, [activePersona.studentId, activeRole, students]);

  useEffect(() => {
    if (activeRole === "student" && activePersona.studentId) {
      setSelectedStudentId(activePersona.studentId);
    }
  }, [activePersona.studentId, activeRole]);

  const studentViews = useMemo<StudentView[]>(() => {
    return scopedStudents.map((student) => {
      const studentCertificates = certificates.filter((certificate) => certificate.studentId === student.id);
      const ids = new Set(studentCertificates.map((certificate) => certificate.id));
      const events = blockchainEvents.filter(
        (event) => Boolean(event.certificateId && ids.has(event.certificateId)),
      );
      const pendingReception = studentCertificates.filter(
        (certificate) => certificate.status === "pending_reception" && !certificate.receptionSignature,
      );

      return {
        academicState: academicStateFor(studentCertificates),
        certificates: studentCertificates,
        events,
        lastActivity: latestIso([
          ...studentCertificates.map((certificate) => certificate.updatedAt),
          ...events.map((event) => event.createdAt),
        ]),
        pendingReception,
        receivedCount: studentCertificates.filter((certificate) => Boolean(certificate.receptionSignature)).length,
        student,
      };
    });
  }, [blockchainEvents, certificates, scopedStudents]);

  const selectedStudent =
    studentViews.find((item) => item.student.id === selectedStudentId) ?? studentViews[0];
  const totalCertificates = studentViews.reduce((sum, item) => sum + item.certificates.length, 0);
  const totalPending = studentViews.reduce((sum, item) => sum + item.pendingReception.length, 0);
  const pendingCertificate = selectedStudent?.pendingReception[0];
  const receptionProgress = selectedStudent?.certificates.length
    ? Math.round((selectedStudent.receivedCount / selectedStudent.certificates.length) * 100)
    : 0;

  useGSAP(
    () => {
      if (!signedCertificateId) {
        return;
      }

      const target = pageRef.current?.querySelector(`[data-certificate-id="${signedCertificateId}"]`);

      if (!target) {
        return;
      }

      if (shouldSkipMotion(reducedMotion)) {
        setMotionCompleteState(target);
        return;
      }

      const timeline = gsap.timeline({
        defaults: { duration: 0.28, ease: "power2.out" },
        onComplete: () => setSignedCertificateId(null),
      });
      timeline
        .fromTo(target, { scale: 0.98, autoAlpha: 0.7 }, { scale: 1, autoAlpha: 1 })
        .fromTo("[data-reception-seal]", { scale: 0.86, rotate: -5 }, { scale: 1, rotate: 0 }, "<");

      return () => timeline.kill();
    },
    { dependencies: [signedCertificateId, reducedMotion], revertOnUpdate: true, scope: pageRef },
  );

  const signReception = async () => {
    if (!pendingCertificate) {
      addToast({
        title: "Sin recepcion pendiente",
        description: "El estudiante seleccionado no tiene certificados esperando firma.",
        intent: "info",
      });
      return;
    }

    const signed = await signStudentReception(pendingCertificate.id);
    setSignedCertificateId(signed?.id ?? pendingCertificate.id);
  };

  return (
    <div ref={pageRef}>
      <MotionPage
        className="grid min-w-0 gap-3"
        data-testid="students-workspace"
        staggerSelector="[data-student-panel]"
      >
        <section
          className="rounded-lg border border-border bg-card p-4 shadow-[inset_0_1px_0_hsl(var(--foreground)/0.035),0_24px_70px_-46px_hsl(var(--shadow-ledger)/1)]"
          data-student-panel
        >
          <div className="flex min-w-0 flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div className="min-w-0">
              <div className="mb-3 flex flex-wrap gap-2">
                <StatusBadge tone="online">Identidad academica</StatusBadge>
                <StatusBadge tone={chainConnected ? "online" : "warning"}>
                  {chainConnected ? "Contrato conectado" : "Contrato requerido"}
                </StatusBadge>
                <StatusBadge tone="neutral">Wallet estudiantil</StatusBadge>
              </div>
              <h1 className="text-2xl font-semibold tracking-tight text-foreground">
                Gestion de estudiantes
              </h1>
              <p className="mt-1 max-w-3xl text-sm leading-6 text-muted-foreground">
                Cada perfil asocia documento de identidad, carrera, wallet y certificados
                recibidos. La firma de recepcion registra que el estudiante acepta el documento
                emitido sin alterar el historial previo.
              </p>
            </div>
            <div className="grid grid-cols-3 gap-2 sm:min-w-[23rem]">
              <MetricTile
                icon={<UserRound className="h-4 w-4" aria-hidden="true" />}
                label="Estudiantes"
                value={numberFormatter.format(students.length)}
              />
              <MetricTile
                icon={<FileSignature className="h-4 w-4" aria-hidden="true" />}
                label="Certificados"
                value={numberFormatter.format(totalCertificates)}
              />
              <MetricTile
                icon={<PenLine className="h-4 w-4" aria-hidden="true" />}
                label="Pendientes"
                value={numberFormatter.format(totalPending)}
              />
            </div>
          </div>
        </section>

        <section className="grid min-w-0 gap-3 xl:grid-cols-[minmax(0,1fr)_minmax(20rem,0.44fr)]">
          <Card data-student-panel>
            <CardHeader className="flex flex-row items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-foreground">Lista de estudiantes</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Identidad, carrera, wallet registrada, certificados recibidos y firma de recepcion.
                </p>
              </div>
              <StatusBadge tone="neutral">{numberFormatter.format(studentViews.length)} perfiles</StatusBadge>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto rounded-lg border border-border bg-muted/40">
                <table className="w-full min-w-[58rem] text-left text-xs" data-testid="students-table">
                  <thead className="bg-muted/65 text-muted-foreground">
                    <tr>
                      <th className="px-3 py-2 font-medium">Nombre</th>
                      <th className="px-3 py-2 font-medium">Documento de identidad</th>
                      <th className="px-3 py-2 font-medium">Carrera</th>
                      <th className="px-3 py-2 font-medium">Facultad</th>
                      <th className="px-3 py-2 font-medium">Wallet estudiantil</th>
                      <th className="px-3 py-2 text-right font-medium">Certificados recibidos</th>
                      <th className="px-3 py-2 font-medium">Firma de recepcion</th>
                      <th className="px-3 py-2 font-medium">Estado academico</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/70">
                    {studentViews.map((item) => {
                      const signedLabel = `${item.receivedCount}/${item.certificates.length}`;

                      return (
                        <tr
                          className={cn(
                            "cursor-pointer text-foreground/85 transition-colors hover:bg-secondary/45",
                            selectedStudent?.student.id === item.student.id && "bg-secondary/35",
                          )}
                          data-testid={`student-row-${item.student.id}`}
                          key={item.student.id}
                          onClick={() => setSelectedStudentId(item.student.id)}
                        >
                          <td className="px-3 py-3">
                            <div className="font-semibold text-foreground">{item.student.fullName}</div>
                            <div className="mt-1 text-[11px] text-muted-foreground">{item.student.email}</div>
                          </td>
                          <td className="px-3 py-3 font-mono text-[11px]">{item.student.identityDocument}</td>
                          <td className="px-3 py-3">{item.student.career}</td>
                          <td className="px-3 py-3">{item.student.faculty}</td>
                          <td className="px-3 py-3 font-mono text-[11px] text-muted-foreground">
                            {shortenHash(item.student.walletAddress, 7)}
                          </td>
                          <td className="px-3 py-3 text-right font-mono">{item.certificates.length}</td>
                          <td className="px-3 py-3">
                            <div className="grid gap-1.5">
                              <div className="flex items-center justify-between gap-2">
                                <span className="font-mono text-[11px] text-foreground">{signedLabel}</span>
                                <span className="text-[11px] text-muted-foreground">
                                  {item.pendingReception.length ? "Pendiente" : "Firmado"}
                                </span>
                              </div>
                              <Progress
                                value={
                                  item.certificates.length
                                    ? Math.round((item.receivedCount / item.certificates.length) * 100)
                                    : 0
                                }
                              />
                            </div>
                          </td>
                          <td className="px-3 py-3">
                            <StatusBadge tone={item.academicState === "Observado" ? "offline" : item.pendingReception.length ? "warning" : "online"}>
                              {item.academicState}
                            </StatusBadge>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          <Card data-student-panel data-testid="student-detail-panel">
            <CardHeader className="flex flex-row items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-foreground">Detalle del estudiante</p>
                <p className="mt-1 text-xs text-muted-foreground">Historial academico y recepcion de certificados.</p>
              </div>
              <StatusBadge tone={pendingCertificate ? "warning" : "online"}>
                {pendingCertificate ? "Firma pendiente" : "Recepcion firmada"}
              </StatusBadge>
            </CardHeader>
            <CardContent className="grid gap-3">
              {selectedStudent ? (
                <>
                  <div className="rounded-md border border-border/55 bg-muted/55 p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-foreground">{selectedStudent.student.fullName}</p>
                        <p className="mt-1 text-xs leading-5 text-muted-foreground">
                          {selectedStudent.student.career} · {selectedStudent.student.faculty}
                        </p>
                      </div>
                      <span
                        className="grid h-9 w-9 shrink-0 place-items-center rounded-md border border-border/60 bg-secondary text-primary"
                        data-reception-seal
                      >
                        <GraduationCap className="h-4 w-4" aria-hidden="true" />
                      </span>
                    </div>
                    <div className="mt-3 grid gap-1">
                      <FieldLine label="Documento" value={selectedStudent.student.identityDocument} />
                      <FieldLine label="Universidad" value={selectedStudent.student.university} />
                      <FieldLine label="Matricula" value={selectedStudent.student.enrollmentCode} />
                      <FieldLine label="Wallet" value={shortenHash(selectedStudent.student.walletAddress, 10)} />
                      <FieldLine label="Ultima actividad" value={formatDateTime(selectedStudent.lastActivity)} />
                      <FieldLine label="Estado academico" value={selectedStudent.academicState} />
                    </div>
                  </div>

                  <div className="rounded-md border border-border/55 bg-muted/45 p-3">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-xs font-semibold text-foreground">Firma de recepcion</p>
                        <p className="mt-1 text-[11px] text-muted-foreground">
                          {selectedStudent.receivedCount} de {selectedStudent.certificates.length} certificados aceptados.
                        </p>
                      </div>
                      <span className="font-mono text-sm font-semibold text-foreground">{receptionProgress}%</span>
                    </div>
                    <Progress className="mt-3" value={receptionProgress} />
                    {canSignStudentReception(activeRole) ? (
                      <Button
                        className="mt-3 w-full"
                        disabled={!pendingCertificate}
                        icon={<PenLine className="h-4 w-4" aria-hidden="true" />}
                        onClick={signReception}
                        variant={pendingCertificate ? "primary" : "secondary"}
                      >
                        {pendingCertificate ? "Firmar recepcion" : "Recepcion completa"}
                      </Button>
                    ) : null}
                  </div>

                  <div className="grid gap-2">
                    <div className="flex items-center gap-2">
                      <History className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                      <p className="text-xs font-semibold text-foreground">Historial academico</p>
                    </div>
                    <ol className="grid gap-2">
                      {selectedStudent.certificates.map((certificate) => (
                        <li
                          className="rounded-md border border-border/55 bg-muted/45 p-3"
                          data-certificate-id={certificate.id}
                          key={certificate.id}
                        >
                          <div className="flex items-center justify-between gap-3">
                            <span className="font-mono text-[11px] text-muted-foreground">{certificate.code}</span>
                            <StatusBadge tone={statusTone(certificate.status)}>
                              {certificateStatusLabels[certificate.status]}
                            </StatusBadge>
                          </div>
                          <p className="mt-2 text-xs font-semibold text-foreground">
                            {certificateTypeLabels[certificate.type]}
                          </p>
                          <p className="mt-1 text-[11px] leading-5 text-muted-foreground">
                            {certificate.issuerName} · bloque {numberFormatter.format(certificate.blockNumber)}
                          </p>
                          <div className="mt-3 grid gap-1">
                            <FieldLine label="Hash" value={shortenHash(certificate.documentHash, 7)} />
                            <FieldLine
                              label="Recepcion"
                              value={certificate.receptionSignature ? "Recepcion firmada" : "Pendiente de recepcion"}
                            />
                            <FieldLine label="Fecha" value={formatDateTime(certificate.updatedAt)} />
                          </div>
                        </li>
                      ))}
                    </ol>
                  </div>

                  <div className="grid gap-2">
                    <div className="flex items-center gap-2">
                      <Fingerprint className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                      <p className="text-xs font-semibold text-foreground">Eventos del ledger</p>
                    </div>
                    <ol className="grid gap-2">
                      {selectedStudent.events.slice(0, 5).map((event) => (
                        <li className="rounded-md border border-border/55 bg-muted/45 p-3" key={event.id}>
                          <div className="flex items-center justify-between gap-3">
                            <span className="font-mono text-[11px] text-muted-foreground">
                              #{numberFormatter.format(event.blockNumber)}
                            </span>
                            <span className="text-[11px] text-muted-foreground">
                              {formatDateTime(event.createdAt)}
                            </span>
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

        <section className="grid gap-3 md:grid-cols-4" data-student-panel>
          <div className="rounded-lg border border-border bg-card/95 p-3">
            <IdCard className="h-4 w-4 text-primary" aria-hidden="true" />
            <p className="mt-2 text-xs font-semibold text-foreground">Identidad</p>
            <p className="mt-1 text-[11px] leading-5 text-muted-foreground">
              Cada certificado conserva el documento de identidad asociado.
            </p>
          </div>
          <div className="rounded-lg border border-border bg-card/95 p-3">
            <WalletCards className="h-4 w-4 text-primary" aria-hidden="true" />
            <p className="mt-2 text-xs font-semibold text-foreground">Wallet</p>
            <p className="mt-1 text-[11px] leading-5 text-muted-foreground">
              La direccion registrada representa la recepcion del estudiante.
            </p>
          </div>
          <div className="rounded-lg border border-border bg-card/95 p-3">
            <Fingerprint className="h-4 w-4 text-primary" aria-hidden="true" />
            <p className="mt-2 text-xs font-semibold text-foreground">Firma</p>
            <p className="mt-1 text-[11px] leading-5 text-muted-foreground">
              La recepcion agrega una evidencia trazable al ledger.
            </p>
          </div>
          <div className="rounded-lg border border-border bg-card/95 p-3">
            <ShieldAlert className="h-4 w-4 text-primary" aria-hidden="true" />
            <p className="mt-2 text-xs font-semibold text-foreground">Riesgo</p>
            <p className="mt-1 text-[11px] leading-5 text-muted-foreground">
              Estados observados o pendientes quedan visibles para auditoria.
            </p>
          </div>
        </section>

        <section className="grid gap-3 md:grid-cols-3" data-student-panel>
          <div className="rounded-lg border border-border bg-card/95 p-3">
            <Mail className="h-4 w-4 text-primary" aria-hidden="true" />
            <p className="mt-2 text-xs font-semibold text-foreground">Correo academico</p>
            <p className="mt-1 text-[11px] leading-5 text-muted-foreground">
              {selectedStudent?.student.email ?? "Sin estudiante seleccionado"}
            </p>
          </div>
          <div className="rounded-lg border border-border bg-card/95 p-3">
            <BadgeCheck className="h-4 w-4 text-primary" aria-hidden="true" />
            <p className="mt-2 text-xs font-semibold text-foreground">Certificados firmados</p>
            <p className="mt-1 font-mono text-sm font-semibold text-foreground">
              {selectedStudent ? `${selectedStudent.receivedCount}/${selectedStudent.certificates.length}` : "0/0"}
            </p>
          </div>
          <div className="rounded-lg border border-border bg-card/95 p-3">
            <GraduationCap className="h-4 w-4 text-primary" aria-hidden="true" />
            <p className="mt-2 text-xs font-semibold text-foreground">Estado academico</p>
            <p className="mt-1 text-sm font-semibold text-foreground">
              {selectedStudent?.academicState ?? "Sin datos"}
            </p>
          </div>
        </section>
      </MotionPage>
    </div>
  );
}

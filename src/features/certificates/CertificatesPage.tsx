import { useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { useGSAP } from "@gsap/react";
import { gsap } from "gsap";
import {
  ArrowDownUp,
  ChevronLeft,
  ChevronRight,
  ClipboardCopy,
  Download,
  Eye,
  FileClock,
  FileSearch,
  FileText,
  Fingerprint,
  History,
  Link2,
  QrCode,
  RotateCcw,
  Search,
  ShieldAlert,
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
import { canRevokeCertificate } from "@/lib/permissions";
import { useAppStore } from "@/store/app-store";
import type { Certificate, CertificateType, Issuer } from "@/types/domain";

type StatusFilter = "all" | Certificate["status"];
type SortKey = "block_desc" | "code_asc" | "date_asc" | "date_desc" | "status_asc" | "student_asc";

type Option = {
  label: string;
  value: string;
};

const pageSize = 6;

const certificateTypeLabels: Record<CertificateType, string> = {
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

const sortOptions: Option[] = [
  { label: "Fecha reciente", value: "date_desc" },
  { label: "Fecha antigua", value: "date_asc" },
  { label: "Codigo A-Z", value: "code_asc" },
  { label: "Bloque mayor", value: "block_desc" },
  { label: "Estado", value: "status_asc" },
  { label: "Estudiante", value: "student_asc" },
];

const statusOptions: Option[] = [
  { label: "Todos", value: "all" },
  { label: "Valido", value: "valid" },
  { label: "Pendiente recepcion", value: "pending_reception" },
  { label: "Revocado", value: "revoked" },
  { label: "Manipulado", value: "manipulated" },
];

function FieldLine({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="grid grid-cols-[minmax(0,0.7fr)_minmax(0,1.3fr)] gap-3 border-b border-border/45 py-2 last:border-b-0">
      <span className="text-[11px] font-medium text-muted-foreground">{label}</span>
      <span className="min-w-0 break-words text-right text-xs font-semibold text-foreground">
        {value}
      </span>
    </div>
  );
}

function SelectControl({
  ariaLabel,
  icon,
  onChange,
  options,
  value,
}: {
  ariaLabel: string;
  icon?: ReactNode;
  onChange: (value: string) => void;
  options: Option[];
  value: string;
}) {
  return (
    <label className="grid gap-1.5 text-[11px] font-semibold text-muted-foreground">
      <span className="flex items-center gap-2">
        {icon}
        {ariaLabel}
      </span>
      <select
        aria-label={ariaLabel}
        className="h-8 w-full rounded-md border border-border/80 bg-black/35 px-3 text-xs font-semibold text-foreground outline-none shadow-[inset_0_1px_0_hsl(var(--foreground)/0.025)] transition-colors focus:border-primary/70 focus:ring-4 focus:ring-primary/15"
        onChange={(event) => onChange(event.target.value)}
        value={value}
      >
        {options.map((option) => (
          <option className="bg-card text-foreground" key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function DetailSection({ children, title }: { children: ReactNode; title: string }) {
  return (
    <div className="rounded-md border border-border/55 bg-black/38 p-3">
      <p className="text-[11px] font-semibold uppercase text-muted-foreground">{title}</p>
      <div className="mt-2">{children}</div>
    </div>
  );
}

function HashBlock({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-border/55 bg-black/50 p-3" data-full-hash>
      <p className="text-[11px] font-semibold uppercase text-muted-foreground">{label}</p>
      <p className="mt-2 break-all font-mono text-[11px] leading-5 text-foreground">{value}</p>
    </div>
  );
}

function buildQrCells(certificate: Certificate) {
  const compact = `${certificate.code}${certificate.documentHash}${certificate.blockNumber}`;

  return Array.from({ length: 81 }, (_, index) => {
    const char = compact.charCodeAt(index % compact.length);
    return (char + index * 7) % 5 !== 0;
  });
}

function getMonthKey(value: string) {
  return value.slice(0, 7);
}

function uniqueOptions(values: string[]) {
  return Array.from(new Set(values)).sort((a, b) => a.localeCompare(b, "es"));
}

function monthLabel(monthKey: string) {
  const date = new Date(`${monthKey}-01T12:00:00.000Z`);
  return new Intl.DateTimeFormat("es-BO", { month: "short", year: "numeric" }).format(date);
}

function compareBySort(sort: SortKey) {
  return (a: Certificate, b: Certificate) => {
    if (sort === "code_asc") {
      return a.code.localeCompare(b.code);
    }

    if (sort === "date_asc") {
      return new Date(a.issueDate).getTime() - new Date(b.issueDate).getTime();
    }

    if (sort === "status_asc") {
      return statusLabels[a.status].localeCompare(statusLabels[b.status], "es");
    }

    if (sort === "student_asc") {
      return a.studentName.localeCompare(b.studentName, "es");
    }

    if (sort === "block_desc") {
      return b.blockNumber - a.blockNumber;
    }

    return new Date(b.issueDate).getTime() - new Date(a.issueDate).getTime();
  };
}

export function CertificatesPage() {
  const pageRef = useRef<HTMLDivElement>(null);
  const certificates = useAppStore((state) => state.certificates);
  const blockchainEvents = useAppStore((state) => state.blockchainEvents);
  const issuers = useAppStore((state) => state.issuers);
  const selectedNetwork = useAppStore((state) => state.selectedNetwork);
  const activeRole = useAppStore((state) => state.activeRole);
  const addToast = useAppStore((state) => state.addToast);
  const setRoute = useAppStore((state) => state.setRoute);
  const reducedMotion = useReducedMotion();
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [facultyFilter, setFacultyFilter] = useState("all");
  const [careerFilter, setCareerFilter] = useState("all");
  const [issuerFilter, setIssuerFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("all");
  const [sort, setSort] = useState<SortKey>("code_asc");
  const [page, setPage] = useState(1);
  const [selectedId, setSelectedId] = useState(certificates[0]?.id ?? "");

  const issuerById = useMemo(() => {
    const map = new Map<string, Issuer>();

    for (const issuer of issuers) {
      map.set(issuer.id, issuer);
    }

    return map;
  }, [issuers]);

  const eventsByCertificate = useMemo(() => {
    const map = new Map<string, typeof blockchainEvents>();

    for (const event of blockchainEvents) {
      if (!event.certificateId) {
        continue;
      }

      map.set(event.certificateId, [...(map.get(event.certificateId) ?? []), event]);
    }

    return map;
  }, [blockchainEvents]);

  const typeOptions = useMemo<Option[]>(
    () => [
      { label: "Todos", value: "all" },
      ...uniqueOptions(certificates.map((certificate) => certificate.type)).map((type) => ({
        label: certificateTypeLabels[type as CertificateType],
        value: type,
      })),
    ],
    [certificates],
  );

  const facultyOptions = useMemo<Option[]>(
    () => [
      { label: "Todas", value: "all" },
      ...uniqueOptions(certificates.map((certificate) => certificate.faculty)).map((faculty) => ({
        label: faculty,
        value: faculty,
      })),
    ],
    [certificates],
  );

  const careerOptions = useMemo<Option[]>(
    () => [
      { label: "Todas", value: "all" },
      ...uniqueOptions(certificates.map((certificate) => certificate.career)).map((career) => ({
        label: career,
        value: career,
      })),
    ],
    [certificates],
  );

  const issuerOptions = useMemo<Option[]>(
    () => [
      { label: "Todos", value: "all" },
      ...uniqueOptions(certificates.map((certificate) => certificate.issuerId)).map((issuerId) => ({
        label: issuerById.get(issuerId)?.name ?? issuerId,
        value: issuerId,
      })),
    ],
    [certificates, issuerById],
  );

  const dateOptions = useMemo<Option[]>(
    () => [
      { label: "Todas", value: "all" },
      ...uniqueOptions(certificates.map((certificate) => getMonthKey(certificate.issueDate))).map(
        (monthKey) => ({
          label: monthLabel(monthKey),
          value: monthKey,
        }),
      ),
    ],
    [certificates],
  );

  const filteredCertificates = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return certificates
      .filter((certificate) => {
        const searchable = [
          certificate.code,
          certificate.studentName,
          certificate.career,
          certificate.faculty,
          certificate.issuerName,
          certificate.documentHash,
          certificate.blockNumber.toString(),
        ]
          .join(" ")
          .toLowerCase();

        return (
          (!normalizedQuery || searchable.includes(normalizedQuery)) &&
          (statusFilter === "all" || certificate.status === statusFilter) &&
          (typeFilter === "all" || certificate.type === typeFilter) &&
          (facultyFilter === "all" || certificate.faculty === facultyFilter) &&
          (careerFilter === "all" || certificate.career === careerFilter) &&
          (issuerFilter === "all" || certificate.issuerId === issuerFilter) &&
          (dateFilter === "all" || getMonthKey(certificate.issueDate) === dateFilter)
        );
      })
      .sort(compareBySort(sort));
  }, [
    careerFilter,
    certificates,
    dateFilter,
    facultyFilter,
    issuerFilter,
    query,
    sort,
    statusFilter,
    typeFilter,
  ]);

  const totalPages = Math.max(1, Math.ceil(filteredCertificates.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pagedCertificates = filteredCertificates.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize,
  );
  const selectedCertificate =
    certificates.find((certificate) => certificate.id === selectedId) ?? filteredCertificates[0] ?? certificates[0];
  const selectedEvents = selectedCertificate
    ? eventsByCertificate.get(selectedCertificate.id) ?? []
    : [];
  const qrCells = selectedCertificate ? buildQrCells(selectedCertificate) : [];
  const canRevokeSelected = selectedCertificate
    ? canRevokeCertificate(issuerById.get(selectedCertificate.issuerId), selectedCertificate, activeRole)
    : false;

  useGSAP(
    () => {
      const pageNode = pageRef.current;

      if (!pageNode) {
        return;
      }

      const panels = pageNode.querySelectorAll("[data-certificate-panel]");
      const rows = pageNode.querySelectorAll("[data-certificate-row]");

      if (shouldSkipMotion(reducedMotion)) {
        setMotionCompleteState([...Array.from(panels), ...Array.from(rows)]);
        return;
      }

      const timeline = gsap.timeline({ defaults: { duration: 0.28, ease: "power2.out" } });
      timeline
        .fromTo(panels, { autoAlpha: 0, y: 12, scale: 0.992 }, { autoAlpha: 1, y: 0, scale: 1, stagger: 0.045 })
        .fromTo(rows, { autoAlpha: 0, y: 8 }, { autoAlpha: 1, y: 0, stagger: 0.035 }, "-=0.1");

      return () => timeline.kill();
    },
    { dependencies: [currentPage, filteredCertificates.length, reducedMotion], scope: pageRef },
  );

  useGSAP(
    () => {
      const pageNode = pageRef.current;

      if (!pageNode || !selectedCertificate || shouldSkipMotion(reducedMotion)) {
        return;
      }

      const timeline = gsap.timeline({ defaults: { duration: 0.3, ease: "power2.out" } });
      timeline
        .fromTo(
          "[data-certificate-detail-inner]",
          { autoAlpha: 0, x: 14, scale: 0.992 },
          { autoAlpha: 1, x: 0, scale: 1 },
        )
        .fromTo("[data-full-hash]", { autoAlpha: 0, y: 8 }, { autoAlpha: 1, y: 0, stagger: 0.04 }, "-=0.1")
        .fromTo("[data-qr-cell]", { autoAlpha: 0, scale: 0.7 }, { autoAlpha: 1, scale: 1, stagger: 0.006 }, "-=0.14")
        .fromTo("[data-certificate-event]", { autoAlpha: 0, y: 8 }, { autoAlpha: 1, y: 0, stagger: 0.05 }, "-=0.08");

      return () => timeline.kill();
    },
    { dependencies: [reducedMotion, selectedCertificate?.id], revertOnUpdate: true, scope: pageRef },
  );

  const resetFilters = () => {
    setQuery("");
    setStatusFilter("all");
    setTypeFilter("all");
    setFacultyFilter("all");
    setCareerFilter("all");
    setIssuerFilter("all");
    setDateFilter("all");
    setSort("code_asc");
    setPage(1);
  };

  const selectCertificate = (certificate: Certificate) => {
    setSelectedId(certificate.id);
  };

  const copyHash = async (certificate: Certificate) => {
    selectCertificate(certificate);
    await window.navigator.clipboard?.writeText(certificate.documentHash);
    addToast({
      title: "Hash copiado",
      description: `${certificate.code} listo para comparar contra el ledger.`,
      intent: "info",
    });
  };

  const copyPublicLink = async (certificate: Certificate) => {
    selectCertificate(certificate);
    await window.navigator.clipboard?.writeText(certificate.verificationUrl);
    addToast({
      title: "Enlace publico copiado",
      description: "La URL puede compartirse con una entidad verificadora.",
      intent: "info",
    });
  };

  const simulatePdf = (certificate: Certificate) => {
    selectCertificate(certificate);
    addToast({
      title: "PDF preparado",
      description: `${certificate.pdfName} se genero como descarga simulada.`,
      intent: "success",
    });
  };

  const simulateQr = (certificate: Certificate) => {
    selectCertificate(certificate);
    addToast({
      title: "QR simulado",
      description: `QR publico generado para ${certificate.code}.`,
      intent: "success",
    });
  };

  const focusHistory = (certificate: Certificate) => {
    selectCertificate(certificate);
    addToast({
      title: "Historial enfocado",
      description: "El panel de detalle muestra los eventos del certificado.",
      intent: "info",
    });
  };

  const goToRevocation = (certificate: Certificate) => {
    selectCertificate(certificate);
    addToast({
      title: "Flujo de revocacion abierto",
      description: `${certificate.code} queda listo para revision administrativa.`,
      intent: "warning",
    });
    setRoute("revocation");
  };

  return (
    <div ref={pageRef}>
      <MotionPage
        className="grid min-w-0 gap-3"
        data-testid="certificates-workspace"
        staggerSelector="[data-certificate-panel]"
      >
        <section
          className="rounded-lg border border-border bg-card p-4 shadow-[inset_0_1px_0_hsl(var(--foreground)/0.035),0_24px_70px_-46px_hsl(var(--shadow-ledger)/1)]"
          data-certificate-panel
        >
          <div className="flex min-w-0 flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div className="min-w-0">
              <div className="mb-3 flex flex-wrap gap-2">
                <StatusBadge tone="online">{certificates.length} emitidos</StatusBadge>
                <StatusBadge tone="syncing">
                  {certificates.filter((certificate) => certificate.status === "valid").length} validos
                </StatusBadge>
                <StatusBadge tone="warning">
                  {certificates.filter((certificate) => certificate.status === "revoked").length} revocados
                </StatusBadge>
              </div>
              <h1 className="text-2xl font-semibold tracking-tight text-foreground">
                Certificados emitidos
              </h1>
              <p className="mt-1 max-w-3xl text-sm leading-6 text-muted-foreground">
                Gestiona certificados academicos anclados en Ethereum simulado, revisa hashes,
                firmas digitales, eventos de trazabilidad y acciones publicas sin abandonar el
                inventario.
              </p>
            </div>
            <div className="grid min-w-48 gap-1 rounded-md border border-border/55 bg-black/45 p-3">
              <p className="text-xs font-semibold text-muted-foreground">Registro seleccionado</p>
              <p className="font-mono text-sm font-semibold text-foreground">
                {selectedCertificate?.code ?? "Sin seleccion"}
              </p>
              <p className="truncate text-[11px] text-muted-foreground">
                Bloque {selectedCertificate ? numberFormatter.format(selectedCertificate.blockNumber) : "-"}
              </p>
            </div>
          </div>
        </section>

        <Card data-certificate-panel>
          <CardHeader className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-foreground">Busqueda y filtros</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Combina filtros academicos, estado y fechas para localizar evidencia documental.
              </p>
            </div>
            <Button
              icon={<RotateCcw className="h-4 w-4" aria-hidden="true" />}
              onClick={resetFilters}
              variant="secondary"
            >
              Limpiar filtros
            </Button>
          </CardHeader>
          <CardContent className="grid gap-3">
            <label className="grid gap-1.5 text-[11px] font-semibold text-muted-foreground">
              <span className="flex items-center gap-2">
                <Search className="h-3.5 w-3.5" aria-hidden="true" />
                Buscar certificado
              </span>
              <Input
                aria-label="Buscar certificado"
                onChange={(event) => {
                  setQuery(event.target.value);
                  setPage(1);
                }}
                placeholder="Codigo, estudiante, carrera, emisor, hash o bloque"
                value={query}
              />
            </label>
            <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-4">
              <SelectControl
                ariaLabel="Estado"
                icon={<ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />}
                onChange={(value) => {
                  setStatusFilter(value as StatusFilter);
                  setPage(1);
                }}
                options={statusOptions}
                value={statusFilter}
              />
              <SelectControl
                ariaLabel="Tipo"
                icon={<FileText className="h-3.5 w-3.5" aria-hidden="true" />}
                onChange={(value) => {
                  setTypeFilter(value);
                  setPage(1);
                }}
                options={typeOptions}
                value={typeFilter}
              />
              <SelectControl
                ariaLabel="Facultad"
                icon={<FileSearch className="h-3.5 w-3.5" aria-hidden="true" />}
                onChange={(value) => {
                  setFacultyFilter(value);
                  setPage(1);
                }}
                options={facultyOptions}
                value={facultyFilter}
              />
              <SelectControl
                ariaLabel="Carrera"
                icon={<FileClock className="h-3.5 w-3.5" aria-hidden="true" />}
                onChange={(value) => {
                  setCareerFilter(value);
                  setPage(1);
                }}
                options={careerOptions}
                value={careerFilter}
              />
              <SelectControl
                ariaLabel="Emisor"
                icon={<ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />}
                onChange={(value) => {
                  setIssuerFilter(value);
                  setPage(1);
                }}
                options={issuerOptions}
                value={issuerFilter}
              />
              <SelectControl
                ariaLabel="Fecha"
                icon={<FileClock className="h-3.5 w-3.5" aria-hidden="true" />}
                onChange={(value) => {
                  setDateFilter(value);
                  setPage(1);
                }}
                options={dateOptions}
                value={dateFilter}
              />
              <SelectControl
                ariaLabel="Ordenar"
                icon={<ArrowDownUp className="h-3.5 w-3.5" aria-hidden="true" />}
                onChange={(value) => {
                  setSort(value as SortKey);
                  setPage(1);
                }}
                options={sortOptions}
                value={sort}
              />
              <div className="grid content-end">
                <div className="rounded-md border border-border/55 bg-black/35 px-3 py-2">
                  <p className="text-[11px] font-semibold text-muted-foreground">Resultado</p>
                  <p className="mt-1 text-xs font-semibold text-foreground">
                    {filteredCertificates.length} de {certificates.length} certificados
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <section className="grid min-w-0 gap-3 xl:grid-cols-[minmax(0,1.1fr)_minmax(24rem,0.72fr)]">
          <Card data-certificate-panel>
            <CardHeader className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-foreground">Tabla avanzada</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Acciones por fila para inspeccion, trazabilidad, copias y simulaciones.
                </p>
              </div>
              <StatusBadge tone="neutral">
                Pagina {currentPage} de {totalPages}
              </StatusBadge>
            </CardHeader>
            <CardContent className="grid gap-3">
              <div
                className="overflow-x-auto rounded-md border border-border/70 bg-black/40"
                data-testid="certificates-table"
              >
                <table className="min-w-[980px] w-full border-collapse text-left text-xs">
                  <thead className="bg-black/45 text-[11px] uppercase text-muted-foreground">
                    <tr>
                      {[
                        "Codigo",
                        "Estudiante",
                        "Carrera",
                        "Tipo",
                        "Fecha",
                        "Estado",
                        "Emisor",
                        "Hash parcial",
                        "Bloque",
                        "Acciones",
                      ].map((column) => (
                        <th className="border-b border-border/55 px-3 py-2 font-semibold" key={column}>
                          {column}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {pagedCertificates.length ? (
                      pagedCertificates.map((certificate) => {
                        const isSelected = selectedCertificate?.id === certificate.id;
                        const rowCanRevoke = canRevokeCertificate(
                          issuerById.get(certificate.issuerId),
                          certificate,
                          activeRole,
                        );

                        return (
                          <tr
                            className={cn(
                              "border-b border-border/45 transition-colors last:border-b-0 hover:bg-secondary/55",
                              isSelected && "bg-primary/8 outline outline-1 outline-primary/25",
                            )}
                            data-certificate-row
                            data-testid={`certificate-row-${certificate.id}`}
                            key={certificate.id}
                          >
                            <td className="px-3 py-3 font-mono font-semibold text-foreground">
                              {certificate.code}
                            </td>
                            <td className="px-3 py-3 text-foreground">{certificate.studentName}</td>
                            <td className="px-3 py-3 text-muted-foreground">{certificate.career}</td>
                            <td className="px-3 py-3 text-muted-foreground">
                              {certificateTypeLabels[certificate.type]}
                            </td>
                            <td className="px-3 py-3 text-muted-foreground">
                              {formatDateTime(certificate.issueDate)}
                            </td>
                            <td className="px-3 py-3">
                              <StatusBadge tone={statusTone[certificate.status]}>
                                {statusLabels[certificate.status]}
                              </StatusBadge>
                            </td>
                            <td className="px-3 py-3 text-muted-foreground">{certificate.issuerName}</td>
                            <td className="px-3 py-3 font-mono text-muted-foreground">
                              {shortenHash(certificate.documentHash, 7)}
                            </td>
                            <td className="px-3 py-3 font-mono text-muted-foreground">
                              {numberFormatter.format(certificate.blockNumber)}
                            </td>
                            <td className="px-3 py-3">
                              <div className="flex min-w-max flex-wrap gap-1.5">
                                <Button
                                  aria-label="Ver detalle"
                                  className="px-2"
                                  icon={<Eye className="h-3.5 w-3.5" aria-hidden="true" />}
                                  onClick={() => selectCertificate(certificate)}
                                  variant="secondary"
                                >
                                  Ver detalle
                                </Button>
                                <Button
                                  aria-label="Ver historial"
                                  className="px-2"
                                  icon={<History className="h-3.5 w-3.5" aria-hidden="true" />}
                                  onClick={() => focusHistory(certificate)}
                                  variant="secondary"
                                >
                                  Ver historial
                                </Button>
                                <Button
                                  aria-label="Copiar hash"
                                  className="px-2"
                                  icon={<ClipboardCopy className="h-3.5 w-3.5" aria-hidden="true" />}
                                  onClick={() => void copyHash(certificate)}
                                  variant="secondary"
                                >
                                  Copiar hash
                                </Button>
                                <Button
                                  aria-label="Copiar enlace publico"
                                  className="px-2"
                                  icon={<Link2 className="h-3.5 w-3.5" aria-hidden="true" />}
                                  onClick={() => void copyPublicLink(certificate)}
                                  variant="secondary"
                                >
                                  Copiar enlace publico
                                </Button>
                                <Button
                                  aria-label="Simular descarga PDF"
                                  className="px-2"
                                  icon={<Download className="h-3.5 w-3.5" aria-hidden="true" />}
                                  onClick={() => simulatePdf(certificate)}
                                  variant="secondary"
                                >
                                  Simular descarga PDF
                                </Button>
                                <Button
                                  aria-label="Simular QR"
                                  className="px-2"
                                  icon={<QrCode className="h-3.5 w-3.5" aria-hidden="true" />}
                                  onClick={() => simulateQr(certificate)}
                                  variant="secondary"
                                >
                                  Simular QR
                                </Button>
                                {rowCanRevoke ? (
                                  <Button
                                    aria-label="Revocar"
                                    className="px-2"
                                    icon={<ShieldAlert className="h-3.5 w-3.5" aria-hidden="true" />}
                                    onClick={() => goToRevocation(certificate)}
                                    variant="danger"
                                  >
                                    Revocar
                                  </Button>
                                ) : null}
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td className="px-3 py-8 text-center text-sm text-muted-foreground" colSpan={10}>
                          Sin certificados para estos filtros.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              <div className="flex flex-col gap-3 rounded-md border border-border/55 bg-black/35 p-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-xs font-semibold text-muted-foreground">
                  Pagina {currentPage} de {totalPages} · {filteredCertificates.length} resultados
                </p>
                <div className="flex gap-2">
                  <Button
                    disabled={currentPage <= 1}
                    icon={<ChevronLeft className="h-4 w-4" aria-hidden="true" />}
                    onClick={() => setPage((value) => Math.max(1, value - 1))}
                    variant="secondary"
                  >
                    Anterior
                  </Button>
                  <Button
                    disabled={currentPage >= totalPages}
                    icon={<ChevronRight className="h-4 w-4" aria-hidden="true" />}
                    onClick={() => setPage((value) => Math.min(totalPages, value + 1))}
                    variant="secondary"
                  >
                    Siguiente
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card data-certificate-panel data-testid="certificate-detail">
            {selectedCertificate ? (
              <div data-certificate-detail-inner>
                <CardHeader className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div className="min-w-0">
                    <div className="mb-2 flex flex-wrap gap-2">
                      <StatusBadge tone={statusTone[selectedCertificate.status]}>
                        {statusLabels[selectedCertificate.status]}
                      </StatusBadge>
                      <StatusBadge tone="syncing">{selectedNetwork}</StatusBadge>
                    </div>
                    <h2 className="font-mono text-xl font-semibold tracking-tight text-foreground">
                      {selectedCertificate.code}
                    </h2>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Detalle de certificado, evidencia criptografica y panel de contrato.
                    </p>
                  </div>
                  {canRevokeSelected ? (
                    <Button
                      icon={<ShieldAlert className="h-4 w-4" aria-hidden="true" />}
                      onClick={() => goToRevocation(selectedCertificate)}
                      variant="danger"
                    >
                      Revocar
                    </Button>
                  ) : (
                    <StatusBadge tone="neutral">Solo lectura</StatusBadge>
                  )}
                </CardHeader>
                <CardContent className="grid gap-3">
                  <DetailSection title="Informacion academica">
                    <FieldLine label="Tipo" value={certificateTypeLabels[selectedCertificate.type]} />
                    <FieldLine label="Carrera" value={selectedCertificate.career} />
                    <FieldLine label="Facultad" value={selectedCertificate.faculty} />
                    <FieldLine label="Universidad" value={selectedCertificate.university} />
                    <FieldLine label="Fecha de emision" value={formatDateTime(selectedCertificate.issueDate)} />
                  </DetailSection>

                  <DetailSection title="Informacion del estudiante">
                    <FieldLine label="Estudiante" value={selectedCertificate.studentName} />
                    <FieldLine label="Documento" value={selectedCertificate.identityDocument} />
                    <FieldLine
                      label="Firma de recepcion"
                      value={selectedCertificate.receptionSignature ?? "Sin firma de recepcion"}
                    />
                  </DetailSection>

                  <DetailSection title="Informacion del emisor">
                    <FieldLine label="Emisor" value={selectedCertificate.issuerName} />
                    <FieldLine label="Rol" value={selectedCertificate.issuerRole} />
                    <FieldLine label="Firma digital del emisor" value={selectedCertificate.issuerSignature} />
                  </DetailSection>

                  <DetailSection title="Estado actual">
                    <FieldLine
                      label="Estado"
                      value={
                        <StatusBadge tone={statusTone[selectedCertificate.status]}>
                          {statusLabels[selectedCertificate.status]}
                        </StatusBadge>
                      }
                    />
                    <FieldLine label="Observaciones" value={selectedCertificate.observations} />
                    {selectedCertificate.revocationReason ? (
                      <FieldLine
                        label="Motivo de revocacion"
                        value={selectedCertificate.revocationReason}
                      />
                    ) : null}
                    <FieldLine label="Timestamp" value={formatDateTime(selectedCertificate.updatedAt)} />
                  </DetailSection>

                  <div className="grid gap-3">
                    <HashBlock label="Hash SHA-256 completo" value={selectedCertificate.documentHash} />
                    <HashBlock label="Hash registrado" value={selectedCertificate.blockchainHash} />
                    <HashBlock label="Transaction hash" value={selectedCertificate.transactionHash} />
                  </div>

                  <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_13rem]">
                    <div className="rounded-md border border-border/55 bg-black/45 p-4">
                      <p className="text-[11px] font-semibold uppercase text-muted-foreground">
                        Vista tipo documento
                      </p>
                      <div className="mt-3 rounded-md border border-border/55 bg-background p-4">
                        <div className="flex items-start justify-between gap-3 border-b border-border/55 pb-3">
                          <div>
                            <p className="text-xs font-semibold text-foreground">CertiChain Academico</p>
                            <p className="mt-1 text-[11px] text-muted-foreground">{selectedCertificate.university}</p>
                          </div>
                          <Fingerprint className="h-5 w-5 text-primary" aria-hidden="true" />
                        </div>
                        <p className="mt-4 font-mono text-lg font-semibold text-foreground">
                          {selectedCertificate.code}
                        </p>
                        <p className="mt-2 text-sm font-semibold text-foreground">
                          {selectedCertificate.studentName}
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">{selectedCertificate.title}</p>
                        <div className="mt-4 grid gap-1 border-t border-border/55 pt-3 text-[11px] text-muted-foreground">
                          <span>PDF: {selectedCertificate.pdfName}</span>
                          <span>Bloque: {numberFormatter.format(selectedCertificate.blockNumber)}</span>
                          <span>Hash: {shortenHash(selectedCertificate.documentHash, 10)}</span>
                        </div>
                      </div>
                    </div>

                    <div className="rounded-md border border-border/55 bg-black/45 p-4">
                      <p className="text-[11px] font-semibold uppercase text-muted-foreground">QR simulado</p>
                      <div className="mt-3 grid aspect-square grid-cols-9 gap-1 rounded-md border border-border/55 bg-background p-3">
                        {qrCells.map((filled, index) => (
                          <span
                            className={cn(
                              "rounded-[2px]",
                              filled ? "bg-foreground" : "bg-secondary",
                            )}
                            data-qr-cell
                            key={`${selectedCertificate.id}-${index}`}
                          />
                        ))}
                      </div>
                      <p className="mt-3 break-all font-mono text-[10px] leading-4 text-muted-foreground">
                        {selectedCertificate.verificationUrl}
                      </p>
                    </div>
                  </div>

                  <DetailSection title="Panel tecnico de smart contract">
                    <FieldLine label="Metodo usado" value="emitirCertificado(bytes32 hash, address estudiante)" />
                    <FieldLine
                      label="Parametros"
                      value={`${selectedCertificate.code} · ${shortenHash(selectedCertificate.documentHash, 8)}`}
                    />
                    <FieldLine label="Resultado" value={statusLabels[selectedCertificate.status]} />
                    <FieldLine label="Red" value={selectedNetwork} />
                    <FieldLine label="Gas simulado" value="143.820 gas" />
                    <FieldLine label="Confirmaciones" value="36 confirmaciones mock" />
                    <FieldLine
                      label="Numero de bloque"
                      value={numberFormatter.format(selectedCertificate.blockNumber)}
                    />
                  </DetailSection>

                  <DetailSection title="Historial del certificado">
                    {selectedEvents.length ? (
                      <ol className="grid gap-2">
                        {selectedEvents.map((event) => (
                          <li
                            className="rounded-md border border-border/55 bg-black/40 p-3"
                            data-certificate-event
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
                      <p className="text-xs leading-5 text-muted-foreground">
                        Sin eventos asociados en el ledger mock.
                      </p>
                    )}
                  </DetailSection>
                </CardContent>
              </div>
            ) : (
              <CardContent>
                <div className="rounded-md border border-border/55 bg-black/40 p-4 text-sm text-muted-foreground">
                  Selecciona un certificado para revisar su detalle.
                </div>
              </CardContent>
            )}
          </Card>
        </section>
      </MotionPage>
    </div>
  );
}

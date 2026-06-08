import { useMemo, useRef, useState } from "react";
import { useGSAP } from "@gsap/react";
import { gsap } from "gsap";
import {
  BadgeCheck,
  BookOpenCheck,
  Braces,
  Copy,
  FileCheck2,
  Fingerprint,
  History,
  KeyRound,
  LockKeyhole,
  ShieldCheck,
  ShieldX,
  Sparkles,
} from "lucide-react";
import { HashChip } from "@/components/data-display/hash-chip";
import { Timeline } from "@/components/data-display/timeline";
import { MotionPage } from "@/components/motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Modal } from "@/components/ui/modal";
import { StatusBadge } from "@/components/ui/status-badge";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { cn } from "@/lib/cn";
import { formatDateTime, numberFormatter } from "@/lib/formatters";
import { shortenHash } from "@/lib/hash";
import { setMotionCompleteState, shouldSkipMotion } from "@/lib/motion";
import { useAppStore } from "@/store/app-store";
import type { Certificate, NftAcademicToken } from "@/types/domain";

type TransferEvent = {
  certificateId: string;
  createdAt: string;
  description: string;
  id: string;
  meta?: string;
  title: string;
};

const CONTRACT_ADDRESS = "0x7777777777777777777777777777777777777777";

const certificateTypeLabels: Record<Certificate["type"], string> = {
  academic_diploma: "Diploma academico",
  grade_certificate: "Certificado de notas",
  graduation_certificate: "Certificado de egreso",
  professional_title: "Titulo profesional",
  study_record: "Constancia de estudios",
};

const statusLabels: Record<Certificate["status"], string> = {
  manipulated: "Manipulado",
  pending_reception: "Pendiente",
  revoked: "Revocado",
  valid: "Valido",
};

function tokenByCertificate(tokens: NftAcademicToken[], certificate: Certificate | undefined) {
  if (!certificate) {
    return undefined;
  }

  return tokens.find(
    (token) => token.certificateId === certificate.id || token.tokenId === certificate.nftTokenId,
  );
}

function buildMetadata(certificate: Certificate | undefined, token: NftAcademicToken | undefined) {
  if (!certificate) {
    return {};
  }

  return {
    tokenId: token?.tokenId ?? "pendiente_mint",
    estudiante: certificate.studentName,
    carrera: certificate.career,
    universidad: certificate.university,
    fecha: certificate.issueDate.slice(0, 10),
    hash: certificate.documentHash,
    certificado: certificate.code,
    tipo: certificateTypeLabels[certificate.type],
    estadoMint: token ? "minteado" : "pendiente",
    contrato: token?.contractAddress ?? CONTRACT_ADDRESS,
    metadataUri: token?.metadataUri ?? `ipfs://certichain-academico/${certificate.id}.json`,
    uso: "credencial academica ERC-721 no comercial",
  };
}

function eligibleCertificateTone(certificate: Certificate, token: NftAcademicToken | undefined) {
  if (token) {
    return "online";
  }

  if (certificate.status !== "valid") {
    return "warning";
  }

  return "neutral";
}

function copyTextWithSelection(value: string) {
  const textarea = document.createElement("textarea");
  textarea.value = value;
  textarea.setAttribute("readonly", "true");
  textarea.style.position = "fixed";
  textarea.style.left = "-9999px";
  document.body.appendChild(textarea);
  textarea.select();

  try {
    return document.execCommand("copy");
  } finally {
    textarea.remove();
  }
}

async function copyTextToClipboard(value: string) {
  try {
    if (copyTextWithSelection(value)) {
      return true;
    }
  } catch {
    // The selection fallback can be unavailable in strict test/browser contexts.
  }

  try {
    const permission = await window.navigator.permissions?.query({
      name: "clipboard-write" as PermissionName,
    });

    if (permission?.state === "granted" && window.navigator.clipboard?.writeText) {
      await window.navigator.clipboard.writeText(value);
      return true;
    }
  } catch {
    return false;
  }

  return false;
}

export function NftPage() {
  const pageRef = useRef<HTMLDivElement>(null);
  const reducedMotion = useReducedMotion();
  const activeRole = useAppStore((state) => state.activeRole);
  const addToast = useAppStore((state) => state.addToast);
  const certificates = useAppStore((state) => state.certificates);
  const students = useAppStore((state) => state.students);
  const blockchainEvents = useAppStore((state) => state.blockchainEvents);
  const nftAcademicTokens = useAppStore((state) => state.nftAcademicTokens);
  const mintAcademicNft = useAppStore((state) => state.mintAcademicNft);
  const [selectedCertificateId, setSelectedCertificateId] = useState(
    () =>
      certificates.find((certificate) => certificate.nftTokenId)?.id ??
      certificates.find((certificate) => certificate.status === "valid")?.id ??
      certificates[0]?.id ??
      "",
  );
  const [copyStatus, setCopyStatus] = useState("Metadata lista para copiar.");
  const [metadataHighlighted, setMetadataHighlighted] = useState(false);
  const [mintModalOpen, setMintModalOpen] = useState(false);
  const [mintedToken, setMintedToken] = useState<NftAcademicToken | undefined>();
  const [transferEvents, setTransferEvents] = useState<TransferEvent[]>([]);
  const [transferStatus, setTransferStatus] = useState(
    "Regla de transferencia lista para simular.",
  );

  const eligibleCertificates = useMemo(
    () => certificates.filter((certificate) => certificate.status === "valid"),
    [certificates],
  );
  const selectedCertificate =
    certificates.find((certificate) => certificate.id === selectedCertificateId) ??
    eligibleCertificates[0] ??
    certificates[0];
  const selectedToken = tokenByCertificate(nftAcademicTokens, selectedCertificate);
  const selectedStudent = students.find((student) => student.id === selectedCertificate?.studentId);
  const ownerStudent =
    students.find((student) => student.id === selectedToken?.ownerStudentId) ?? selectedStudent;
  const metadata = useMemo(
    () => buildMetadata(selectedCertificate, selectedToken),
    [selectedCertificate, selectedToken],
  );
  const metadataJson = useMemo(() => JSON.stringify(metadata, null, 2), [metadata]);
  const mintedCount = nftAcademicTokens.length;
  const unmintedEligibleCount = eligibleCertificates.filter(
    (certificate) => !tokenByCertificate(nftAcademicTokens, certificate),
  ).length;
  const certificateEvents = useMemo(
    () =>
      selectedCertificate
        ? blockchainEvents
            .filter((event) => event.certificateId === selectedCertificate.id)
            .slice(0, 4)
        : [],
    [blockchainEvents, selectedCertificate],
  );
  const visibleTransferEvents = transferEvents.filter(
    (event) => event.certificateId === selectedCertificate?.id,
  );
  const timelineItems = [
    {
      description: selectedCertificate
        ? `${certificateTypeLabels[selectedCertificate.type]} generado como PDF y firmado por ${selectedCertificate.issuerName}.`
        : "Certificado pendiente de seleccion.",
      id: "issued",
      meta: selectedCertificate ? formatDateTime(selectedCertificate.createdAt) : "sin fecha",
      title: "PDF academico emitido",
    },
    {
      description: selectedCertificate
        ? `Hash SHA-256 ${shortenHash(selectedCertificate.documentHash, 14)} registrado para verificacion publica.`
        : "Hash pendiente.",
      id: "hash",
      meta: selectedCertificate ? `Bloque ${numberFormatter.format(selectedCertificate.blockNumber)}` : "",
      title: "Hash del documento anclado",
    },
    selectedToken
      ? {
          description: `NFT minteado con metadata permanente y asociado al certificado ${selectedCertificate?.code}.`,
          id: selectedToken.id,
          meta: formatDateTime(selectedToken.mintedAt),
          title: "NFT minteado",
        }
      : {
          description: "El certificado todavia no tiene token ERC-721 mock asociado.",
          id: "pending-mint",
          meta: "pendiente",
          title: "Mint pendiente",
        },
    ...certificateEvents.map((event) => ({
      description: event.detail,
      id: event.id,
      meta: `Bloque ${numberFormatter.format(event.blockNumber)}`,
      title:
        event.type === "nft_minted"
          ? "Evento ERC-721 replicado"
          : event.type === "certificate_verified"
            ? "Verificacion publica"
            : "Evento de ledger",
    })),
    ...visibleTransferEvents,
  ];
  const canMint =
    Boolean(selectedCertificate) &&
    selectedCertificate?.status === "valid" &&
    !selectedToken &&
    ["academic_admin", "authorized_issuer"].includes(activeRole);

  useGSAP(
    () => {
      const page = pageRef.current;
      const panels = page?.querySelectorAll("[data-nft-panel]");

      if (!page || !panels) {
        return;
      }

      if (shouldSkipMotion(reducedMotion)) {
        setMotionCompleteState(panels);
        return;
      }

      const timeline = gsap.timeline({ defaults: { duration: 0.34, ease: "power2.out" } });
      timeline.fromTo(
        panels,
        { autoAlpha: 0, scale: 0.985, y: 14 },
        { autoAlpha: 1, scale: 1, y: 0, stagger: 0.045 },
      );

      return () => timeline.kill();
    },
    { dependencies: [reducedMotion], scope: pageRef },
  );

  useGSAP(
    () => {
      const tokenCard = pageRef.current?.querySelector("[data-nft-token-card]");

      if (!tokenCard) {
        return;
      }

      if (shouldSkipMotion(reducedMotion)) {
        setMotionCompleteState(tokenCard);
        return;
      }

      const timeline = gsap.timeline({ defaults: { duration: 0.3, ease: "power2.out" } });
      timeline.fromTo(
        tokenCard,
        { autoAlpha: 0.72, rotateY: -8, scale: 0.985, y: 10 },
        { autoAlpha: 1, rotateY: 0, scale: 1, y: 0 },
      );

      return () => timeline.kill();
    },
    {
      dependencies: [selectedCertificate?.id, selectedToken?.tokenId, reducedMotion],
      revertOnUpdate: true,
      scope: pageRef,
    },
  );

  useGSAP(
    () => {
      const confirmation = pageRef.current?.querySelector("[data-nft-confirmation]");

      if (!confirmation || !mintedToken || shouldSkipMotion(reducedMotion)) {
        return;
      }

      const tween = gsap.fromTo(
        confirmation,
        { scale: 0.96 },
        { duration: 0.34, ease: "back.out(1.7)", scale: 1.02, yoyo: true, repeat: 1 },
      );

      return () => tween.kill();
    },
    {
      dependencies: [mintedToken?.id, reducedMotion],
      revertOnUpdate: true,
      scope: pageRef,
    },
  );

  const handleSelectCertificate = (certificateId: string) => {
    setSelectedCertificateId(certificateId);
    setCopyStatus("Metadata lista para copiar.");
    setMetadataHighlighted(false);
    setTransferStatus("Regla de transferencia lista para simular.");
  };

  const handleViewMetadata = () => {
    setMetadataHighlighted(true);
    setCopyStatus(`Metadata JSON visible para ${selectedCertificate?.code ?? "certificado"}.`);
  };

  const handleCopyMetadata = async () => {
    const copied = await copyTextToClipboard(metadataJson);
    setCopyStatus(
      copied
        ? "Metadata copiada al portapapeles simulado."
        : "Metadata copiada en la simulacion; el JSON queda visible para seleccion manual.",
    );
    addToast({
      title: "Metadata copiada",
      description: selectedCertificate
        ? `${selectedCertificate.code} listo para inspeccion externa.`
        : "Metadata mock lista.",
      intent: copied ? "info" : "warning",
    });
  };

  const handleMint = () => {
    if (!selectedCertificate) {
      return;
    }

    const token = mintAcademicNft(selectedCertificate.id);

    if (!token) {
      return;
    }

    setMintedToken(token);
    setMintModalOpen(true);
    setTransferStatus("NFT academico minteado y vinculado al certificado.");
    setMetadataHighlighted(true);
  };

  const addTransferEvent = (title: string, description: string) => {
    if (!selectedCertificate) {
      return;
    }

    setTransferEvents((current) => [
      {
        certificateId: selectedCertificate.id,
        createdAt: new Date().toISOString(),
        description,
        id: `transfer-${selectedCertificate.id}-${Date.now()}`,
        meta: "",
        title,
      },
      ...current,
    ]);
  };

  const handleBlockedTransfer = () => {
    const message =
      "Transferencia bloqueada: el NFT academico no se vende ni se transfiere a terceros.";

    setTransferStatus(message);
    addTransferEvent("Transferencia bloqueada", message);
    addToast({
      title: "Transferencia bloqueada",
      description: "La regla no comercial protege la credencial academica.",
      intent: "warning",
    });
  };

  const handleAllowedTransfer = () => {
    if (activeRole !== "academic_admin") {
      const message =
        "Transferencia bloqueada: solo un administrador academico puede corregir la wallet.";

      setTransferStatus(message);
      addTransferEvent("Transferencia bloqueada", message);
      return;
    }

    const message =
      "Transferencia permitida: correccion administrativa de wallet del mismo estudiante registrada.";

    setTransferStatus(message);
    addTransferEvent("Transferencia permitida", message);
    addToast({
      title: "Transferencia controlada",
      description: "La simulacion mantiene el propietario academico y solo corrige wallet.",
      intent: "success",
    });
  };

  return (
    <div ref={pageRef}>
      <MotionPage
        className="grid min-w-0 gap-3"
        data-testid="nft-workspace"
        staggerSelector="[data-nft-panel]"
      >
        <section
          className="rounded-lg border border-border bg-card p-4 shadow-[inset_0_1px_0_hsl(var(--foreground)/0.035),0_24px_70px_-46px_hsl(var(--shadow-ledger)/1)]"
          data-nft-panel
        >
          <div className="grid min-w-0 gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(19rem,0.34fr)]">
            <div className="min-w-0">
              <div className="mb-3 flex flex-wrap gap-2">
                <StatusBadge tone="syncing">ERC-721 mock</StatusBadge>
                <StatusBadge tone="online">Metadata verificable</StatusBadge>
                <StatusBadge tone="neutral">{mintedCount} tokens</StatusBadge>
              </div>
              <h1 className="text-2xl font-semibold tracking-tight text-foreground">
                NFT Academico ERC-721
              </h1>
              <p className="mt-1 max-w-3xl text-sm leading-6 text-muted-foreground">
                Extension opcional para representar cada certificado como una credencial academica
                tokenizada, con Token ID unico, metadata JSON, propietario estudiantil, hash del
                documento e historial permanente replicado en el ledger simulado.
              </p>
            </div>

            <div className="rounded-md border border-border/55 bg-black/45 p-3">
              <div className="flex items-center gap-2 text-muted-foreground">
                <ShieldCheck className="h-4 w-4" aria-hidden="true" />
                <p className="text-xs font-semibold uppercase">Regla de uso</p>
              </div>
              <p className="mt-3 text-sm font-semibold text-foreground">
                No es venta ni activo economico real
              </p>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">
                La demo evita cualquier flujo de mercado: el token solo explica identidad,
                trazabilidad y asociacion academica.
              </p>
            </div>
          </div>
        </section>

        <section className="grid min-w-0 gap-3 xl:grid-cols-[minmax(18rem,0.42fr)_minmax(0,1fr)_minmax(21rem,0.43fr)]">
          <Card data-nft-panel>
            <CardHeader className="flex flex-row items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <FileCheck2 className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                <p className="text-sm font-semibold text-foreground">Certificados elegibles</p>
              </div>
              <StatusBadge tone="neutral">{unmintedEligibleCount} pendientes</StatusBadge>
            </CardHeader>
            <CardContent className="grid max-h-[37rem] gap-2 overflow-y-auto pr-1">
              {eligibleCertificates.map((certificate) => {
                const token = tokenByCertificate(nftAcademicTokens, certificate);
                const selected = certificate.id === selectedCertificate?.id;

                return (
                  <button
                    aria-label={`Seleccionar certificado ${certificate.code}`}
                    className={cn(
                      "grid rounded-md border p-3 text-left transition-all duration-200 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/25",
                      selected
                        ? "border-foreground/25 bg-foreground text-background shadow-[inset_0_1px_0_hsl(var(--background)/0.18),0_18px_42px_-30px_hsl(var(--foreground)/0.7)]"
                        : "border-border/60 bg-black/42 text-foreground hover:border-foreground/18 hover:bg-secondary",
                    )}
                    key={certificate.id}
                    onClick={() => handleSelectCertificate(certificate.id)}
                    type="button"
                  >
                    <span className="flex items-start justify-between gap-3">
                      <span className="min-w-0">
                        <span className="block font-mono text-xs font-semibold">
                          {certificate.code}
                        </span>
                        <span
                          className={cn(
                            "mt-1 block truncate text-xs",
                            selected ? "text-background/70" : "text-muted-foreground",
                          )}
                        >
                          {certificate.studentName}
                        </span>
                      </span>
                      <StatusBadge
                        className={selected ? "border-background/20 bg-background/10 text-background" : ""}
                        tone={eligibleCertificateTone(certificate, token)}
                      >
                        {token ? "Minteado" : statusLabels[certificate.status]}
                      </StatusBadge>
                    </span>
                    <span
                      className={cn(
                        "mt-3 flex items-center justify-between gap-3 rounded-md border px-2.5 py-2 text-[11px]",
                        selected
                          ? "border-background/15 bg-background/12 text-background/72"
                          : "border-border/50 bg-black/35 text-muted-foreground",
                      )}
                    >
                      <span>{certificateTypeLabels[certificate.type]}</span>
                      <span className="font-mono">{token?.tokenId ?? "sin token"}</span>
                    </span>
                  </button>
                );
              })}
            </CardContent>
          </Card>

          <div className="grid min-w-0 gap-3">
            <Card data-nft-panel>
              <CardHeader className="flex flex-row items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <BookOpenCheck className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                  <p className="text-sm font-semibold text-foreground">Vista tipo token</p>
                </div>
                <StatusBadge tone={selectedToken ? "online" : "warning"}>
                  {selectedToken ? "Minteado" : "Pendiente"}
                </StatusBadge>
              </CardHeader>
              <CardContent>
                <article
                  className="motion-transform relative overflow-hidden rounded-lg border border-border bg-black/55 p-4 shadow-[inset_0_1px_0_hsl(var(--foreground)/0.035),0_20px_70px_-42px_hsl(var(--shadow-ledger)/1)]"
                  data-nft-token-card
                  data-testid="nft-token-card"
                >
                  <div className="absolute inset-x-0 top-0 h-px bg-foreground/12" aria-hidden="true" />
                  <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_12rem]">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-md border border-primary/25 bg-primary/10 px-2 py-1 font-mono text-[11px] font-semibold text-primary">
                          ERC-721
                        </span>
                        <span className="rounded-md border border-border/55 bg-black/45 px-2 py-1 font-mono text-[11px] text-muted-foreground">
                          CertiChain Academic Token
                        </span>
                      </div>
                      <p className="mt-5 text-xs font-semibold uppercase text-muted-foreground">
                        Token ID
                      </p>
                      <p className="mt-1 break-words font-mono text-3xl font-semibold text-foreground">
                        {selectedToken?.tokenId ?? "NFT-ACAD-PENDING"}
                      </p>
                      <div className="mt-4 grid gap-2 rounded-md border border-border/60 bg-background/80 p-3">
                        <div className="flex items-center justify-between gap-3">
                          <span className="text-xs text-muted-foreground">Propietario actual</span>
                          <span className="text-right text-xs font-semibold text-foreground">
                            {ownerStudent?.fullName ?? "Sin estudiante"}
                          </span>
                        </div>
                        <div className="flex items-center justify-between gap-3">
                          <span className="text-xs text-muted-foreground">Certificado asociado</span>
                          <span className="text-right font-mono text-xs font-semibold text-foreground">
                            {selectedCertificate?.code ?? "sin certificado"}
                          </span>
                        </div>
                        <div className="flex items-center justify-between gap-3">
                          <span className="text-xs text-muted-foreground">Contrato</span>
                          <span className="max-w-[12rem] truncate text-right font-mono text-xs text-foreground">
                            {selectedToken?.contractAddress ?? CONTRACT_ADDRESS}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="grid rounded-md border border-border/55 bg-card/60 p-3">
                      <div className="grid place-items-center rounded-md border border-border/55 bg-black/45 p-4">
                        <Fingerprint className="h-12 w-12 text-primary" aria-hidden="true" />
                        <p className="mt-3 text-center text-xs font-semibold text-foreground">
                          Credencial academica ERC-721
                        </p>
                      </div>
                      <div className="mt-3 grid gap-2 text-xs">
                        <div className="flex items-center justify-between gap-3">
                          <span className="text-muted-foreground">Mint</span>
                          <span className="font-semibold text-foreground">
                            {selectedToken ? "Confirmado" : "No ejecutado"}
                          </span>
                        </div>
                        <div className="flex items-center justify-between gap-3">
                          <span className="text-muted-foreground">Metadata</span>
                          <span className="font-semibold text-foreground">JSON</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    <Button
                      disabled={!canMint}
                      icon={<Sparkles className="h-4 w-4" aria-hidden="true" />}
                      onClick={handleMint}
                    >
                      Simular mint de NFT
                    </Button>
                    <Button
                      icon={<Braces className="h-4 w-4" aria-hidden="true" />}
                      onClick={handleViewMetadata}
                      variant="secondary"
                    >
                      Ver metadata
                    </Button>
                    <Button
                      icon={<Copy className="h-4 w-4" aria-hidden="true" />}
                      onClick={handleCopyMetadata}
                      variant="secondary"
                    >
                      Copiar metadata
                    </Button>
                  </div>
                </article>
              </CardContent>
            </Card>

            <Card data-nft-panel data-testid="nft-related-certificate">
              <CardHeader className="flex flex-row items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <BadgeCheck className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                  <p className="text-sm font-semibold text-foreground">Certificado relacionado</p>
                </div>
                <StatusBadge tone="online">{selectedCertificate?.code ?? "Sin codigo"}</StatusBadge>
              </CardHeader>
              <CardContent className="grid gap-3">
                <div className="grid gap-3 rounded-md border border-border/55 bg-black/45 p-3 md:grid-cols-2">
                  <div>
                    <p className="text-xs text-muted-foreground">Documento</p>
                    <p className="mt-1 text-sm font-semibold text-foreground">
                      {selectedCertificate ? certificateTypeLabels[selectedCertificate.type] : "Sin documento"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Universidad</p>
                    <p className="mt-1 text-sm font-semibold text-foreground">
                      {selectedCertificate?.university ?? "Sin universidad"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Carrera</p>
                    <p className="mt-1 text-sm font-semibold text-foreground">
                      {selectedCertificate?.career ?? "Sin carrera"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Estado contractual</p>
                    <p className="mt-1 text-sm font-semibold text-foreground">
                      {selectedCertificate ? statusLabels[selectedCertificate.status] : "Sin estado"}
                    </p>
                  </div>
                </div>
                <div className="rounded-md border border-border/55 bg-black/45 p-3">
                  <p className="mb-2 text-xs font-semibold text-muted-foreground">
                    Hash del documento
                  </p>
                  {selectedCertificate ? <HashChip hash={selectedCertificate.documentHash} size={16} /> : null}
                </div>
              </CardContent>
            </Card>
          </div>

          <Card data-nft-panel>
            <CardHeader className="flex flex-row items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Braces className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                <p className="text-sm font-semibold text-foreground">Metadata JSON</p>
              </div>
              <StatusBadge tone={metadataHighlighted ? "syncing" : "neutral"}>
                {metadataHighlighted ? "Visible" : "Lista"}
              </StatusBadge>
            </CardHeader>
            <CardContent className="grid gap-3">
              <pre
                className={cn(
                  "max-h-[27rem] overflow-auto rounded-md border bg-black/55 p-3 font-mono text-[11px] leading-5 text-foreground shadow-[inset_0_1px_0_hsl(var(--foreground)/0.025)]",
                  metadataHighlighted ? "border-primary/35" : "border-border/55",
                )}
                data-testid="nft-metadata-json"
              >
                {metadataJson}
              </pre>
              <div
                className="rounded-md border border-border/55 bg-black/35 p-3 text-xs leading-5 text-muted-foreground"
                data-testid="nft-copy-status"
              >
                {copyStatus}
              </div>
            </CardContent>
          </Card>
        </section>

        <section className="grid min-w-0 gap-3 xl:grid-cols-[minmax(0,1fr)_minmax(20rem,0.36fr)]">
          <Card data-nft-panel data-testid="nft-token-timeline">
            <CardHeader className="flex flex-row items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <History className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                <div>
                  <p className="text-sm font-semibold text-foreground">Historial permanente</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Eventos de certificado, hash, mint y reglas de transferencia.
                  </p>
                </div>
              </div>
              <StatusBadge tone="neutral">{timelineItems.length} eventos</StatusBadge>
            </CardHeader>
            <CardContent>
              <Timeline items={timelineItems} />
            </CardContent>
          </Card>

          <Card data-nft-panel>
            <CardHeader className="flex flex-row items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <KeyRound className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                <p className="text-sm font-semibold text-foreground">Transferencia controlada</p>
              </div>
              <StatusBadge tone={activeRole === "academic_admin" ? "online" : "warning"}>
                {activeRole === "academic_admin" ? "Admin" : "Limitado"}
              </StatusBadge>
            </CardHeader>
            <CardContent className="grid gap-3">
              <div className="grid gap-2 rounded-md border border-border/55 bg-black/45 p-3 text-xs">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-muted-foreground">Regla base</span>
                  <span className="text-right font-semibold text-foreground">No comercial</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-muted-foreground">Permitido</span>
                  <span className="text-right font-semibold text-foreground">
                    Correccion de wallet
                  </span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-muted-foreground">Bloqueado</span>
                  <span className="text-right font-semibold text-foreground">
                    Transferencia a terceros
                  </span>
                </div>
              </div>

              <div className="grid gap-2">
                <Button
                  disabled={!selectedToken}
                  icon={<ShieldX className="h-4 w-4" aria-hidden="true" />}
                  onClick={handleBlockedTransfer}
                  variant="secondary"
                >
                  Simular transferencia bloqueada
                </Button>
                <Button
                  disabled={!selectedToken}
                  icon={<LockKeyhole className="h-4 w-4" aria-hidden="true" />}
                  onClick={handleAllowedTransfer}
                  variant="secondary"
                >
                  Simular transferencia permitida
                </Button>
              </div>

              <div
                className="rounded-md border border-border/55 bg-black/35 p-3 text-xs leading-5 text-muted-foreground"
                data-testid="nft-transfer-status"
              >
                {transferStatus}
              </div>
            </CardContent>
          </Card>
        </section>
      </MotionPage>

      <Modal
        description="El Token ID quedo vinculado al certificado y la metadata se puede inspeccionar sin conexion real a Ethereum."
        onOpenChange={setMintModalOpen}
        open={mintModalOpen}
        title="Mint NFT academico exitoso"
      >
        <div
          className="grid gap-3 rounded-md border border-success/25 bg-success/10 p-4"
          data-nft-confirmation
        >
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-md border border-success/25 bg-success/10 text-success">
              <Sparkles className="h-5 w-5" aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <p className="font-mono text-sm font-semibold text-success">
                {mintedToken?.tokenId ?? selectedToken?.tokenId ?? "NFT-ACAD"}
              </p>
              <p className="mt-1 text-xs text-success/85">
                Asociado a {selectedCertificate?.code ?? "certificado academico"}
              </p>
            </div>
          </div>
          <div className="rounded-md border border-success/25 bg-black/25 p-3 text-xs leading-5 text-success/85">
            La operacion crea trazabilidad para defensa academica. No representa venta,
            inversion ni activo economico real.
          </div>
        </div>
      </Modal>
    </div>
  );
}

import { useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { useGSAP } from "@gsap/react";
import { gsap } from "gsap";
import {
  Accessibility,
  AlertTriangle,
  Check,
  Code2,
  Copy,
  Database,
  Download,
  FileJson,
  KeyRound,
  LockKeyhole,
  MonitorCog,
  Network,
  PlugZap,
  Presentation,
  RotateCcw,
  Settings,
  ShieldCheck,
  ShieldX,
  UserRound,
  Wallet,
} from "lucide-react";
import { MotionPage } from "@/components/motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Modal } from "@/components/ui/modal";
import { StatusBadge } from "@/components/ui/status-badge";
import { Textarea } from "@/components/ui/textarea";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { cn } from "@/lib/cn";
import { formatEth, numberFormatter } from "@/lib/formatters";
import { importedAppStateSchema } from "@/lib/validators";
import { shouldSkipMotion } from "@/lib/motion";
import { useAppStore } from "@/store/app-store";
import type { NetworkType, Role } from "@/types/domain";

type PermissionAction = {
  allowed: Record<Role, boolean>;
  description: string;
  label: string;
  method: string;
};

const roleLabels: Record<Role, string> = {
  academic_admin: "Administrador academico",
  auditor: "Auditor",
  authorized_issuer: "Emisor autorizado",
  public_verifier: "Verificador publico",
  student: "Estudiante",
};

const roleDescriptions: Record<Role, string> = {
  academic_admin: "Administra emisores, redes, importacion y permisos de alto impacto.",
  auditor: "Consulta evidencia, ledger y trazabilidad sin modificar certificados.",
  authorized_issuer: "Emite, firma, revoca y puede mintear credenciales academicas validas.",
  public_verifier: "Verifica autenticidad por codigo, hash o PDF mock sin alterar historial.",
  student: "Firma recepcion y consulta certificados asociados a su identidad academica.",
};

const roleOptions: Role[] = [
  "academic_admin",
  "authorized_issuer",
  "student",
  "public_verifier",
  "auditor",
];

const networkOptions: NetworkType[] = ["sepolia", "hardhat", "ganache"];

const networkLabels: Record<NetworkType, string> = {
  ganache: "ganache",
  hardhat: "hardhat",
  sepolia: "sepolia",
};

const permissionActions: PermissionAction[] = [
  {
    allowed: {
      academic_admin: true,
      auditor: false,
      authorized_issuer: true,
      public_verifier: false,
      student: false,
    },
    description: "Crea PDF, hash SHA-256, firma y evento certificate_issued.",
    label: "Emitir certificado",
    method: "emitirCertificado()",
  },
  {
    allowed: {
      academic_admin: true,
      auditor: false,
      authorized_issuer: true,
      public_verifier: false,
      student: false,
    },
    description: "Registra correccion administrativa sin borrar historial.",
    label: "Revocar certificado",
    method: "revocarCertificado()",
  },
  {
    allowed: {
      academic_admin: true,
      auditor: true,
      authorized_issuer: true,
      public_verifier: true,
      student: true,
    },
    description: "Consulta hash, estado y transaccion desde evidencia publica.",
    label: "Verificacion publica",
    method: "verificarCertificado()",
  },
  {
    allowed: {
      academic_admin: true,
      auditor: false,
      authorized_issuer: true,
      public_verifier: false,
      student: false,
    },
    description: "Asocia Token ID ERC-721 mock a certificado valido.",
    label: "Mint NFT",
    method: "mintAcademicNft()",
  },
  {
    allowed: {
      academic_admin: true,
      auditor: false,
      authorized_issuer: false,
      public_verifier: false,
      student: false,
    },
    description: "Autoriza o desactiva wallets emisoras universitarias.",
    label: "Gestionar emisores",
    method: "autorizarEmisor()",
  },
  {
    allowed: {
      academic_admin: true,
      auditor: true,
      authorized_issuer: true,
      public_verifier: false,
      student: true,
    },
    description: "Revisa eventos replicados y timeline distribuido.",
    label: "Consultar historial",
    method: "consultarHistorial()",
  },
];

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

function SettingToggle({
  active,
  description,
  icon,
  label,
  onClick,
}: {
  active: boolean;
  description: string;
  icon: ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      aria-label={label}
      aria-pressed={active}
      className={cn(
        "grid gap-2 rounded-md border p-3 text-left transition-all duration-200 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/25",
        active
          ? "border-foreground/25 bg-foreground text-background shadow-[inset_0_1px_0_hsl(var(--background)/0.18),0_18px_42px_-30px_hsl(var(--foreground)/0.7)]"
          : "border-border/60 bg-black/42 text-foreground hover:border-foreground/18 hover:bg-secondary",
      )}
      onClick={onClick}
      type="button"
    >
      <span className="flex items-center justify-between gap-3">
        <span className="flex min-w-0 items-center gap-2">
          <span
            className={cn(
              "grid h-8 w-8 shrink-0 place-items-center rounded-md border",
              active ? "border-background/20 bg-background/10" : "border-border/55 bg-secondary",
            )}
          >
            {icon}
          </span>
          <span className="min-w-0 text-xs font-semibold">{label}</span>
        </span>
        <span
          className={cn(
            "h-2.5 w-2.5 rounded-full",
            active ? "bg-background" : "bg-muted-foreground/50",
          )}
          aria-hidden="true"
        />
      </span>
      <span className={cn("text-[11px] leading-5", active ? "text-background/72" : "text-muted-foreground")}>
        {description}
      </span>
    </button>
  );
}

function PermissionCell({ allowed }: { allowed: boolean }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-[11px] font-semibold",
        allowed
          ? "border-success/25 bg-success/10 text-success"
          : "border-destructive/25 bg-destructive/10 text-destructive",
      )}
    >
      {allowed ? <Check className="h-3 w-3" aria-hidden="true" /> : <ShieldX className="h-3 w-3" aria-hidden="true" />}
      {allowed ? "Permitido" : "Bloqueado"}
    </span>
  );
}

export function SettingsPage() {
  const pageRef = useRef<HTMLDivElement>(null);
  const reducedMotion = useReducedMotion();
  const activeRole = useAppStore((state) => state.activeRole);
  const addToast = useAppStore((state) => state.addToast);
  const certificates = useAppStore((state) => state.certificates);
  const connectWallet = useAppStore((state) => state.connectWallet);
  const disconnectWallet = useAppStore((state) => state.disconnectWallet);
  const exportState = useAppStore((state) => state.exportState);
  const importState = useAppStore((state) => state.importState);
  const issuers = useAppStore((state) => state.issuers);
  const nftAcademicTokens = useAppStore((state) => state.nftAcademicTokens);
  const resetDemoData = useAppStore((state) => state.resetDemoData);
  const revocationRecords = useAppStore((state) => state.revocationRecords);
  const selectedNetwork = useAppStore((state) => state.selectedNetwork);
  const setActiveRole = useAppStore((state) => state.setActiveRole);
  const settings = useAppStore((state) => state.settings);
  const students = useAppStore((state) => state.students);
  const switchNetwork = useAppStore((state) => state.switchNetwork);
  const updateSettings = useAppStore((state) => state.updateSettings);
  const verificationAttempts = useAppStore((state) => state.verificationAttempts);
  const wallet = useAppStore((state) => state.wallet);
  const blockchainEvents = useAppStore((state) => state.blockchainEvents);
  const [exportJson, setExportJson] = useState("");
  const [exportStatus, setExportStatus] = useState("Exportacion lista para generar.");
  const [importText, setImportText] = useState("");
  const [importStatus, setImportStatus] = useState("Esperando JSON validado.");
  const [pendingImport, setPendingImport] = useState("");
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [resetModalOpen, setResetModalOpen] = useState(false);
  const [resetStatus, setResetStatus] = useState("Datos demo activos.");

  const blockedActions = useMemo(
    () => permissionActions.filter((action) => !action.allowed[activeRole]),
    [activeRole],
  );
  const modeSummary = useMemo(() => {
    const modes = [
      settings.presentationMode ? "Presentacion" : null,
      settings.technicalMode ? "Tecnico" : null,
      settings.accessibleMode ? "Accesible" : null,
      settings.reducedMotion ? "Movimiento reducido" : null,
      settings.intenseEffects ? "Efectos intensos" : "Efectos moderados",
    ].filter(Boolean);

    return modes.join(" · ");
  }, [settings]);

  useGSAP(
    () => {
      const matrix = pageRef.current?.querySelector("[data-permission-matrix]");

      if (!matrix || shouldSkipMotion(reducedMotion || settings.reducedMotion)) {
        return;
      }

      const tween = gsap.fromTo(
        matrix.querySelectorAll("[data-permission-row]"),
        { autoAlpha: 0, y: 8 },
        { autoAlpha: 1, duration: 0.25, ease: "power2.out", stagger: 0.035, y: 0 },
      );

      return () => tween.kill();
    },
    {
      dependencies: [activeRole, reducedMotion, settings.reducedMotion],
      revertOnUpdate: true,
      scope: pageRef,
    },
  );

  const handleExport = () => {
    const json = exportState();
    setExportJson(json);
    setExportStatus("Estado JSON exportado para copia o descarga.");
    addToast({
      title: "Estado exportado",
      description: "La instantanea local incluye certificados, estudiantes, emisores, eventos y settings.",
      intent: "success",
    });
  };

  const handleCopyExport = () => {
    if (!exportJson) {
      handleExport();
      return;
    }

    try {
      copyTextWithSelection(exportJson);
      setExportStatus("JSON copiado en la simulacion.");
    } catch {
      setExportStatus("JSON visible para seleccion manual.");
    }
  };

  const handleDownloadExport = () => {
    const json = exportJson || exportState();
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "certichain-academico-state.json";
    anchor.click();
    URL.revokeObjectURL(url);
    setExportJson(json);
    setExportStatus("Descarga JSON preparada por el navegador.");
  };

  const handleImportRequest = () => {
    try {
      const parsed = JSON.parse(importText) as unknown;
      const result = importedAppStateSchema.safeParse(parsed);

      if (!result.success) {
        setImportStatus("JSON invalido: faltan colecciones o settings requeridos.");
        return;
      }

      setPendingImport(JSON.stringify(parsed));
      setImportStatus("JSON valido. Confirma antes de reemplazar estado.");
      setImportModalOpen(true);
    } catch {
      setImportStatus("JSON invalido: revisa sintaxis antes de importar.");
    }
  };

  const handleConfirmImport = () => {
    const imported = importState(pendingImport);

    setImportModalOpen(false);
    setImportStatus(imported ? "Estado importado correctamente." : "JSON invalido: no se reemplazo estado.");
    addToast({
      title: imported ? "Estado importado" : "Importacion rechazada",
      description: imported
        ? "La DApp mock actualizo datos, permisos y red activa."
        : "El JSON no paso validacion estructural.",
      intent: imported ? "success" : "error",
    });
  };

  const handleConfirmReset = () => {
    resetDemoData("settings");
    setResetStatus("Demo reiniciada con datos mock originales.");
    setResetModalOpen(false);
    addToast({
      title: "Demo reiniciada",
      description: "Los certificados, eventos, tokens NFT y preferencias volvieron a fixtures.",
      intent: "success",
    });
  };

  return (
    <div ref={pageRef}>
      <MotionPage
        className="grid min-w-0 gap-3"
        data-testid="settings-workspace"
        staggerSelector="[data-settings-panel]"
      >
        <section
          className="rounded-lg border border-border bg-card p-4 shadow-[inset_0_1px_0_hsl(var(--foreground)/0.035),0_24px_70px_-46px_hsl(var(--shadow-ledger)/1)]"
          data-settings-panel
        >
          <div className="grid min-w-0 gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(19rem,0.34fr)]">
            <div className="min-w-0">
              <div className="mb-3 flex flex-wrap gap-2">
                <StatusBadge tone="syncing">Configuracion local</StatusBadge>
                <StatusBadge tone="online">Permisos activos</StatusBadge>
                <StatusBadge tone="neutral">Demo sin backend</StatusBadge>
              </div>
              <h1 className="text-2xl font-semibold tracking-tight text-foreground">
                Configuracion operativa
              </h1>
              <p className="mt-1 max-w-3xl text-sm leading-6 text-muted-foreground">
                Centro de control para rol, red, wallet, contrato mock, preferencias visuales,
                accesibilidad, datos precargados, importacion/exportacion y seguridad de sesion
                simulada.
              </p>
            </div>

            <div className="rounded-md border border-border/55 bg-black/45 p-3">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Settings className="h-4 w-4" aria-hidden="true" />
                <p className="text-xs font-semibold uppercase">Estado operativo</p>
              </div>
              <p className="mt-3 font-mono text-2xl font-semibold text-foreground">
                {roleLabels[activeRole]}
              </p>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">
                {blockedActions.length} acciones bloqueadas por permisos en este rol.
              </p>
            </div>
          </div>
        </section>

        <section className="grid min-w-0 gap-3 xl:grid-cols-[minmax(0,0.72fr)_minmax(0,1fr)]">
          <div className="grid min-w-0 gap-3">
            <Card data-settings-panel>
              <CardHeader className="flex flex-row items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <UserRound className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                  <p className="text-sm font-semibold text-foreground">Perfil demo</p>
                </div>
                <StatusBadge tone="neutral">{numberFormatter.format(certificates.length)} certificados</StatusBadge>
              </CardHeader>
              <CardContent className="grid gap-3">
                <div className="grid gap-2 rounded-md border border-border/55 bg-black/45 p-3 text-xs">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-muted-foreground">Universidades emisoras</span>
                    <span className="font-mono font-semibold text-foreground">{issuers.length}</span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-muted-foreground">Estudiantes demo</span>
                    <span className="font-mono font-semibold text-foreground">{students.length}</span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-muted-foreground">Eventos blockchain</span>
                    <span className="font-mono font-semibold text-foreground">{blockchainEvents.length}</span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-muted-foreground">NFT academicos</span>
                    <span className="font-mono font-semibold text-foreground">{nftAcademicTokens.length}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card data-settings-panel>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <KeyRound className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                  <p className="text-sm font-semibold text-foreground">Rol activo</p>
                </div>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">
                  Cambia los permisos reales usados por emision, revocacion, emisores y NFT.
                </p>
              </CardHeader>
              <CardContent className="grid gap-3">
                <div
                  className="rounded-md border border-border/55 bg-black/45 p-3 text-xs leading-5 text-muted-foreground"
                  data-testid="settings-active-role"
                >
                  <span className="font-semibold text-foreground">{roleLabels[activeRole]}</span>
                  <span className="block">{roleDescriptions[activeRole]}</span>
                </div>
                <div className="grid gap-2 sm:grid-cols-2">
                  {roleOptions.map((role) => (
                    <button
                      aria-label={`Cambiar rol a ${roleLabels[role]}`}
                      aria-pressed={activeRole === role}
                      className={cn(
                        "rounded-md border px-3 py-2 text-left text-xs font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/25",
                        activeRole === role
                          ? "border-foreground/25 bg-foreground text-background"
                          : "border-border/60 bg-black/42 text-muted-foreground hover:bg-secondary hover:text-foreground",
                      )}
                      key={role}
                      onClick={() => setActiveRole(role)}
                      type="button"
                    >
                      {roleLabels[role]}
                    </button>
                  ))}
                </div>
                <div
                  className="rounded-md border border-warning/25 bg-warning/10 p-3 text-xs leading-5 text-warning"
                  data-testid="settings-role-guard"
                >
                  {blockedActions.length} acciones bloqueadas para {roleLabels[activeRole]}.
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid min-w-0 gap-3">
            <Card data-settings-panel>
              <CardHeader className="flex flex-row items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Network className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                  <p className="text-sm font-semibold text-foreground">Red activa</p>
                </div>
                <span data-testid="settings-active-network">
                  <StatusBadge tone="syncing">{networkLabels[selectedNetwork]}</StatusBadge>
                </span>
              </CardHeader>
              <CardContent className="grid gap-3">
                <div className="grid gap-2 sm:grid-cols-3">
                  {networkOptions.map((network) => (
                    <button
                      aria-label={`Cambiar red a ${networkLabels[network]}`}
                      aria-pressed={selectedNetwork === network}
                      className={cn(
                        "rounded-md border p-3 text-left transition-all duration-200 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/25",
                        selectedNetwork === network
                          ? "border-foreground/25 bg-foreground text-background"
                          : "border-border/60 bg-black/42 text-foreground hover:bg-secondary",
                      )}
                      key={network}
                      onClick={() => switchNetwork(network)}
                      type="button"
                    >
                      <span className="block font-mono text-sm font-semibold">{networkLabels[network]}</span>
                      <span className={cn("mt-1 block text-[11px]", selectedNetwork === network ? "text-background/70" : "text-muted-foreground")}>
                        {network === "sepolia" ? "Demo publica" : network === "hardhat" ? "Nodo local" : "Laboratorio"}
                      </span>
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>

            <section className="grid min-w-0 gap-3 md:grid-cols-2">
              <Card data-settings-panel>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Wallet className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                    <p className="text-sm font-semibold text-foreground">Wallet</p>
                  </div>
                </CardHeader>
                <CardContent className="grid gap-3">
                  <div className="rounded-md border border-border/55 bg-black/45 p-3 text-xs">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-muted-foreground">Estado</span>
                      <span className="font-semibold text-foreground" data-testid="settings-wallet-state">
                        {wallet.connected ? "Conectada" : "Desconectada"}
                      </span>
                    </div>
                    <div className="mt-2 flex items-center justify-between gap-3">
                      <span className="text-muted-foreground">Balance</span>
                      <span className="font-mono text-foreground">{formatEth(wallet.balanceEth)}</span>
                    </div>
                  </div>
                  {wallet.connected ? (
                    <Button
                      icon={<PlugZap className="h-4 w-4" aria-hidden="true" />}
                      onClick={disconnectWallet}
                      variant="secondary"
                    >
                      Desconectar wallet
                    </Button>
                  ) : (
                    <Button
                      icon={<PlugZap className="h-4 w-4" aria-hidden="true" />}
                      onClick={connectWallet}
                    >
                      Conectar wallet mock
                    </Button>
                  )}
                </CardContent>
              </Card>

              <Card data-settings-panel>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Code2 className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                    <p className="text-sm font-semibold text-foreground">Smart contract mock</p>
                  </div>
                </CardHeader>
                <CardContent className="grid gap-2 text-xs">
                  <div className="rounded-md border border-border/55 bg-black/45 p-3">
                    <p className="text-muted-foreground">Contrato academico</p>
                    <p className="mt-1 truncate font-mono text-foreground">
                      0xC3A7c01E00000000000000000000000000AcaD01
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <StatusBadge tone="neutral">emitirCertificado()</StatusBadge>
                    <StatusBadge tone="neutral">revocarCertificado()</StatusBadge>
                    <StatusBadge tone="neutral">verificarCertificado()</StatusBadge>
                    <StatusBadge tone="neutral">consultarHistorial()</StatusBadge>
                  </div>
                </CardContent>
              </Card>
            </section>
          </div>
        </section>

        <section className="grid min-w-0 gap-3 xl:grid-cols-[minmax(0,0.92fr)_minmax(0,1fr)]">
          <Card data-settings-panel>
            <CardHeader>
              <div className="flex items-center gap-2">
                <MonitorCog className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                <p className="text-sm font-semibold text-foreground">Preferencias visuales</p>
              </div>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">
                Ajustes locales para defensa, modo tecnico y carga visual.
              </p>
            </CardHeader>
            <CardContent className="grid gap-3">
              <div className="grid gap-2 sm:grid-cols-2">
                <SettingToggle
                  active={settings.presentationMode}
                  description="Aumenta enfasis de lectura para exponer el flujo en clase."
                  icon={<Presentation className="h-4 w-4" aria-hidden="true" />}
                  label="Activar modo presentacion"
                  onClick={() => updateSettings({ presentationMode: !settings.presentationMode })}
                />
                <SettingToggle
                  active={settings.technicalMode}
                  description="Prioriza metodos, eventos, hashes y direcciones del contrato."
                  icon={<Code2 className="h-4 w-4" aria-hidden="true" />}
                  label="Activar modo tecnico"
                  onClick={() => updateSettings({ technicalMode: !settings.technicalMode })}
                />
                <SettingToggle
                  active={!settings.intenseEffects}
                  description="Mantiene capas y sombras, pero reduce efectos intensos."
                  icon={<MonitorCog className="h-4 w-4" aria-hidden="true" />}
                  label="Desactivar efectos intensos"
                  onClick={() => updateSettings({ intenseEffects: !settings.intenseEffects })}
                />
                <SettingToggle
                  active={settings.demoMode}
                  description="Evita conexiones reales y mantiene la simulacion controlada."
                  icon={<ShieldCheck className="h-4 w-4" aria-hidden="true" />}
                  label="Activar modo demo"
                  onClick={() => updateSettings({ demoMode: !settings.demoMode })}
                />
              </div>
              <div
                className="rounded-md border border-border/55 bg-black/35 p-3 text-xs leading-5 text-muted-foreground"
                data-testid="settings-mode-summary"
              >
                {modeSummary || "Modo estandar"}
              </div>
            </CardContent>
          </Card>

          <Card data-settings-panel>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Accessibility className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                <p className="text-sm font-semibold text-foreground">Accesibilidad</p>
              </div>
            </CardHeader>
            <CardContent className="grid gap-3">
              <div className="grid gap-2 sm:grid-cols-2">
                <SettingToggle
                  active={settings.accessibleMode}
                  description="Refuerza lectura, estados y controles para demo inclusiva."
                  icon={<Accessibility className="h-4 w-4" aria-hidden="true" />}
                  label="Activar modo accesible"
                  onClick={() => updateSettings({ accessibleMode: !settings.accessibleMode })}
                />
                <SettingToggle
                  active={settings.reducedMotion}
                  description="Respeta usuarios sensibles al movimiento y GSAP salta revelados."
                  icon={<MonitorCog className="h-4 w-4" aria-hidden="true" />}
                  label="Reducir animaciones"
                  onClick={() => updateSettings({ reducedMotion: !settings.reducedMotion })}
                />
              </div>
            </CardContent>
          </Card>
        </section>

        <section className="grid min-w-0 gap-3 xl:grid-cols-[minmax(0,0.7fr)_minmax(0,1fr)]">
          <Card data-settings-panel>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Database className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                <p className="text-sm font-semibold text-foreground">Datos demo</p>
              </div>
            </CardHeader>
            <CardContent className="grid gap-3">
              <div className="grid gap-2 rounded-md border border-border/55 bg-black/45 p-3 text-xs">
                <div className="flex justify-between gap-3">
                  <span className="text-muted-foreground">Revocaciones</span>
                  <span className="font-mono text-foreground">{revocationRecords.length}</span>
                </div>
                <div className="flex justify-between gap-3">
                  <span className="text-muted-foreground">Verificaciones publicas</span>
                  <span className="font-mono text-foreground">{verificationAttempts.length}</span>
                </div>
                <div className="flex justify-between gap-3">
                  <span className="text-muted-foreground">Persistencia local</span>
                  <span className="font-semibold text-foreground">
                    {settings.autoPersist ? "Activa" : "Manual"}
                  </span>
                </div>
              </div>
              <Button
                icon={<RotateCcw className="h-4 w-4" aria-hidden="true" />}
                onClick={() => setResetModalOpen(true)}
                variant="danger"
              >
                Resetear datos demo
              </Button>
              <div
                className="rounded-md border border-border/55 bg-black/35 p-3 text-xs leading-5 text-muted-foreground"
                data-testid="settings-reset-status"
              >
                {resetStatus}
              </div>
            </CardContent>
          </Card>

          <Card data-settings-panel>
            <CardHeader>
              <div className="flex items-center gap-2">
                <FileJson className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                <p className="text-sm font-semibold text-foreground">Importar/exportar</p>
              </div>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">
                Exporta certificates, students, issuers, events, settings y tokens NFT; importa
                solo JSON validado con confirmacion previa.
              </p>
            </CardHeader>
            <CardContent className="grid gap-3">
              <div className="flex flex-wrap gap-2">
                <Button
                  icon={<FileJson className="h-4 w-4" aria-hidden="true" />}
                  onClick={handleExport}
                >
                  Exportar estado JSON
                </Button>
                <Button
                  icon={<Copy className="h-4 w-4" aria-hidden="true" />}
                  onClick={handleCopyExport}
                  variant="secondary"
                >
                  Copiar JSON
                </Button>
                <Button
                  icon={<Download className="h-4 w-4" aria-hidden="true" />}
                  onClick={handleDownloadExport}
                  variant="secondary"
                >
                  Descargar JSON
                </Button>
              </div>
              <Textarea
                aria-label="JSON exportado"
                className="min-h-32 font-mono"
                data-testid="settings-export-json"
                readOnly
                value={exportJson}
              />
              <div className="rounded-md border border-border/55 bg-black/35 p-3 text-xs text-muted-foreground">
                {exportStatus}
              </div>
              <label className="grid gap-2 text-xs font-semibold text-muted-foreground">
                JSON para importar
                <Textarea
                  aria-label="JSON para importar"
                  className="min-h-32 font-mono"
                  onChange={(event) => setImportText(event.target.value)}
                  placeholder='{"activeRole":"authorized_issuer", ...}'
                  value={importText}
                />
              </label>
              <Button
                icon={<FileJson className="h-4 w-4" aria-hidden="true" />}
                onClick={handleImportRequest}
                variant="secondary"
              >
                Importar estado JSON
              </Button>
              <div
                className="rounded-md border border-border/55 bg-black/35 p-3 text-xs leading-5 text-muted-foreground"
                data-testid="settings-import-status"
              >
                {importStatus}
              </div>
            </CardContent>
          </Card>
        </section>

        <section className="grid min-w-0 gap-3 xl:grid-cols-[minmax(0,1fr)_minmax(0,0.62fr)]">
          <Card data-permission-matrix data-settings-panel data-testid="settings-permission-matrix">
            <CardHeader>
              <div className="flex items-center gap-2">
                <LockKeyhole className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                <p className="text-sm font-semibold text-foreground">Matriz de permisos</p>
              </div>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">
                Explica visualmente que puede hacer cada rol y respalda los bloqueos reales de la
                app.
              </p>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto rounded-lg border border-border bg-black/35">
                <table className="w-full min-w-[58rem] text-left text-xs">
                  <thead className="bg-black/55 text-muted-foreground">
                    <tr>
                      <th className="px-3 py-2 font-medium">Accion</th>
                      {roleOptions.map((role) => (
                        <th className="px-3 py-2 font-medium" key={role}>
                          {roleLabels[role]}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/70">
                    {permissionActions.map((action) => (
                      <tr data-permission-row key={action.label}>
                        <td className="px-3 py-3">
                          <p className="font-semibold text-foreground">{action.label}</p>
                          <p className="mt-1 font-mono text-[11px] text-muted-foreground">{action.method}</p>
                          <p className="mt-1 text-[11px] leading-4 text-muted-foreground">
                            {action.description}
                          </p>
                        </td>
                        {roleOptions.map((role) => (
                          <td className="px-3 py-3" key={`${action.label}-${role}`}>
                            <PermissionCell allowed={action.allowed[role]} />
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          <Card data-settings-panel>
            <CardHeader>
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                <p className="text-sm font-semibold text-foreground">Seguridad de sesion mock</p>
              </div>
            </CardHeader>
            <CardContent className="grid gap-3">
              <SettingToggle
                active={settings.autoPersist}
                description="Guarda cambios en localStorage para mantener la defensa entre recargas."
                icon={<Database className="h-4 w-4" aria-hidden="true" />}
                label="Activar persistencia local"
                onClick={() => updateSettings({ autoPersist: !settings.autoPersist })}
              />
              <div className="rounded-md border border-warning/25 bg-warning/10 p-3 text-xs leading-5 text-warning">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4" aria-hidden="true" />
                  <span className="font-semibold">Sesion simulada</span>
                </div>
                <p className="mt-2">
                  No se envian firmas, llaves privadas ni transacciones reales. Los permisos se
                  aplican sobre el estado local para demostrar el contrato.
                </p>
              </div>
            </CardContent>
          </Card>
        </section>
      </MotionPage>

      <Modal
        description="La importacion reemplazara certificados, estudiantes, emisores, eventos, settings y red activa si el JSON es compatible."
        onOpenChange={setImportModalOpen}
        open={importModalOpen}
        title="Confirmar importacion de estado"
      >
        <div className="grid gap-3">
          <div className="rounded-md border border-warning/25 bg-warning/10 p-3 text-xs leading-5 text-warning">
            Revisa que el JSON venga de esta demo o de una copia confiable antes de reemplazar el
            estado local.
          </div>
          <div className="flex flex-wrap justify-end gap-2">
            <Button onClick={() => setImportModalOpen(false)} variant="secondary">
              Cancelar
            </Button>
            <Button
              icon={<FileJson className="h-4 w-4" aria-hidden="true" />}
              onClick={handleConfirmImport}
            >
              Confirmar reemplazo
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        description="El reset volvera a cargar fixtures academicos, eventos blockchain mock, tokens NFT y preferencias iniciales."
        onOpenChange={setResetModalOpen}
        open={resetModalOpen}
        title="Confirmar reset de demo"
      >
        <div className="grid gap-3">
          <div className="rounded-md border border-destructive/25 bg-destructive/10 p-3 text-xs leading-5 text-destructive">
            Esta accion descarta cambios locales hechos durante la simulacion actual.
          </div>
          <div className="flex flex-wrap justify-end gap-2">
            <Button onClick={() => setResetModalOpen(false)} variant="secondary">
              Cancelar
            </Button>
            <Button
              icon={<RotateCcw className="h-4 w-4" aria-hidden="true" />}
              onClick={handleConfirmReset}
              variant="danger"
            >
              Confirmar reset
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

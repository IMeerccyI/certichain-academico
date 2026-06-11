import { create } from "zustand";
import type { RouteId } from "@/app/routes";
import {
  blockchainEvents,
  certificates,
  defaultSettings,
  issuers,
  nftAcademicTokens,
  revocationRecords,
  students,
  verificationAttempts,
  verifierEntities,
} from "@/data/fixture-data";
import { calculateSha256, normalizeHash } from "@/lib/hash";
import {
  canIssueCertificate,
  canRevokeCertificate,
  canSignStudentReception,
} from "@/lib/permissions";
import {
  DEFAULT_ROUTE_BY_ROLE,
  defaultPersonaForRole,
  detectPersonaFromWallet,
  isRouteAllowedForRole,
  resolveActiveStudent,
} from "@/lib/roles";
import { readStorage, writeStorage } from "@/lib/storage";
import { importedAppStateSchema } from "@/lib/validators";
import {
  type CertificateHistorialEntry,
  mapChainHistorial,
} from "@/lib/web3/historial";
import { getDeploymentByNetwork, isDeploymentReady } from "@/lib/web3/deployments";
import {
  CONTRACT_ADDRESS,
  autorizarEmisorOnChain,
  connectMetaMask,
  refreshWalletConnection,
  consultarHistorialOnChain,
  consultarPorCodigoOnChain,
  desactivarEmisorOnChain,
  emitirCertificadoOnChain,
  extraerMensajeError,
  firmarRecepcionOnChain,
  bindWalletEvents,
  hasMetaMask,
  listarCertificadosOnChain,
  listarEmisoresOnChain,
  revocarCertificadoOnChain,
  setWalletSessionActive,
  shouldSuppressChainReconnect,
  switchToNetwork,
  unbindWalletEvents,
  verificarCertificadoOnChain,
  type ChainCertificado,
  type WalletConnection,
} from "@/lib/web3/service";
import type {
  ActivePersona,
  AppSettings,
  AppToast,
  BlockchainEvent,
  Certificate,
  CertificateIssueInput,
  ExportedAppState,
  Issuer,
  NetworkType,
  NftAcademicToken,
  RevocationRecord,
  Role,
  Student,
  VerificationAttempt,
  VerificationResult,
  VerifierEntity,
  WalletState,
} from "@/types/domain";

export type ActiveRole = Role;

type DemoDataState = {
  activeRoute: RouteId;
  activePersona: ActivePersona;
  activeRole: Role;
  blockchainEvents: BlockchainEvent[];
  certificates: Certificate[];
  issuers: Issuer[];
  nftAcademicTokens: NftAcademicToken[];
  revocationRecords: RevocationRecord[];
  selectedCertificateId?: string;
  selectedNetwork: NetworkType;
  settings: AppSettings;
  students: Student[];
  verificationAttempts: VerificationAttempt[];
  verifierEntities: VerifierEntity[];
  wallet: WalletState;
};

type AppStore = DemoDataState & {
  certificateHistorial: Record<string, CertificateHistorialEntry[]>;
  currentRouteId: RouteId;
  historialSyncing: boolean;
  sidebarExpanded: boolean;
  sidebarPinned: boolean;
  toasts: AppToast[];
  chainConnected: boolean;
  contractAddress: string;
  fetchCertificateHistorial: (codigo: string) => Promise<CertificateHistorialEntry[]>;
  addBlockchainEvent: (event: BlockchainEvent) => void;
  addToast: (toast: Omit<AppToast, "id">) => void;
  authorizeIssuer: (issuerId: string) => Promise<Issuer | undefined>;
  connectWallet: () => Promise<void>;
  deactivateIssuer: (issuerId: string) => Promise<Issuer | undefined>;
  disconnectWallet: () => void;
  exportState: () => string;
  importState: (serialized: string) => boolean;
  issueCertificate: (input: CertificateIssueInput) => Promise<Certificate | null>;
  mintAcademicNft: (certificateId: string) => NftAcademicToken | undefined;
  removeToast: (toastId: string) => void;
  resetDemoData: (routeId?: RouteId) => void;
  revokeCertificate: (certificateId: string, reason: string) => Promise<Certificate | undefined>;
  setActivePersona: (persona: Partial<ActivePersona>) => void;
  setActiveRole: (role: Role) => void;
  setActiveRoute: (routeId: RouteId) => void;
  setRoute: (routeId: RouteId) => void;
  setSidebarExpanded: (expanded: boolean) => void;
  signStudentReception: (certificateId: string) => Promise<Certificate | undefined>;
  switchNetwork: (network: NetworkType) => void;
  syncFromChain: () => Promise<void>;
  syncLedgerHistorial: () => Promise<void>;
  syncWalletFromMetaMask: (options?: { silent?: boolean }) => Promise<void>;
  toggleSidebarPinned: () => void;
  updateSettings: (settings: Partial<AppSettings>) => void;
  verifyCertificateByCode: (code: string) => VerificationResult;
  verifyCertificateByCodeAsync: (code: string) => Promise<VerificationResult>;
  verifyCertificateByHash: (hash: string) => VerificationResult;
  verifyCertificateByHashAsync: (hash: string) => Promise<VerificationResult>;
  verifyCertificateByPdf: (file: Blob) => Promise<VerificationResult>;
};

const STORAGE_KEY = "certichain-academico-state-v1";

const defaultWallet: WalletState = {
  connected: false,
  address: "",
  network: "sepolia",
  balanceEth: 0,
  isContractReady: false,
  isSupportedNetwork: false,
};

let toastIndex = 0;
let connectWalletInFlight: Promise<void> | null = null;
let walletSyncInFlight: Promise<void> | null = null;

function cloneData<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function createInitialState(): DemoDataState {
  const activeRole: Role = "authorized_issuer";

  return {
    activeRoute: DEFAULT_ROUTE_BY_ROLE[activeRole],
    activePersona: defaultPersonaForRole(
      activeRole,
      issuers,
      students,
      verifierEntities,
    ),
    activeRole,
    blockchainEvents: cloneData(blockchainEvents),
    certificates: cloneData(certificates),
    issuers: cloneData(issuers),
    nftAcademicTokens: cloneData(nftAcademicTokens),
    revocationRecords: cloneData(revocationRecords),
    selectedCertificateId: certificates[0]?.id,
    selectedNetwork: "sepolia",
    settings: cloneData(defaultSettings),
    students: cloneData(students),
    verificationAttempts: cloneData(verificationAttempts),
    verifierEntities: cloneData(verifierEntities),
    wallet: cloneData(defaultWallet),
  };
}

function walletPermissionOptions(state: DemoDataState) {
  return {
    persona: state.activePersona,
    walletAddress: state.wallet.connected ? state.wallet.address : undefined,
    requireWallet: state.wallet.connected,
  };
}

function toExportedState(state: DemoDataState): ExportedAppState {
  return {
    activeRole: state.activeRole,
    activePersona: state.activePersona,
    activeRoute: state.activeRoute,
    blockchainEvents: state.blockchainEvents,
    certificates: state.certificates,
    issuers: state.issuers,
    nftAcademicTokens: state.nftAcademicTokens,
    selectedCertificateId: state.selectedCertificateId,
    selectedNetwork: state.selectedNetwork,
    settings: state.settings,
    students: state.students,
    verificationAttempts: state.verificationAttempts,
    verifierEntities: state.verifierEntities,
  };
}

function persistState(state: DemoDataState) {
  if (state.settings.autoPersist) {
    writeStorage(STORAGE_KEY, toExportedState(state));
  }
}

function createToast(title: string, description: string, intent: AppToast["intent"]): AppToast {
  toastIndex += 1;

  return {
    id: `toast-${toastIndex}`,
    title,
    description,
    intent,
  };
}

function resolveDetectedNetwork(
  connection: WalletConnection,
  fallback: NetworkType,
): NetworkType {
  return connection.network ?? fallback;
}

function buildWalletStateFromConnection(
  connection: WalletConnection,
  selectedNetwork: NetworkType,
) {
  const detectedNetwork = resolveDetectedNetwork(connection, selectedNetwork);
  const chainReady = connection.isSupportedNetwork && connection.isContractReady;

  return {
    chainReady,
    detectedNetwork,
    wallet: {
      connected: true,
      address: connection.address,
      balanceEth: connection.balanceEth,
      chainId: connection.chainId,
      contractAddress: connection.contractAddress,
      isContractReady: connection.isContractReady,
      isSupportedNetwork: connection.isSupportedNetwork,
      lastError: chainReady
        ? undefined
        : connection.isSupportedNetwork
          ? "Contrato no desplegado para la red conectada."
          : "Red no soportada por CertiChain.",
      network: detectedNetwork,
    } satisfies WalletState,
  };
}

type WalletAwareState = DemoDataState & {
  chainConnected: boolean;
  toasts: AppToast[];
};

function mergeWalletConnectionIntoState(
  current: WalletAwareState,
  connection: WalletConnection,
  selectedNetwork: NetworkType,
  toast?: AppToast,
): WalletAwareState {
  const { chainReady, detectedNetwork, wallet } = buildWalletStateFromConnection(
    connection,
    selectedNetwork,
  );
  const detectedPersona = detectPersonaFromWallet(
    connection.address,
    current.issuers,
    current.students,
  );
  const nextPersona =
    detectedPersona.issuerId || detectedPersona.studentId
      ? {
          ...current.activePersona,
          ...detectedPersona,
        }
      : current.activePersona;

  return {
    ...current,
    activePersona: nextPersona,
    chainConnected: chainReady,
    selectedNetwork: detectedNetwork,
    wallet,
    toasts: toast ? [...current.toasts, toast] : current.toasts,
  };
}

function verificationResult(certificate: Certificate | undefined): VerificationResult {
  if (!certificate) {
    return {
      message: "No existe un certificado asociado a esa evidencia.",
      status: "not_found",
    };
  }

  return {
    certificate,
    message:
      certificate.status === "manipulated"
        ? "El documento no coincide con el hash registrado."
        : "Certificado encontrado en el registro academico precargado.",
    status: certificate.status,
  };
}

function chainStatus(cert: ChainCertificado): Certificate["status"] {
  if (cert.estado === 2n) {
    return "revoked";
  }
  return cert.fechaRecepcion > 0n ? "valid" : "pending_reception";
}

function chainDate(timestamp: bigint): string {
  return timestamp > 0n ? new Date(Number(timestamp) * 1000).toISOString() : "";
}

/** Convierte un certificado del smart contract al modelo del frontend. */
function mapChainCertificate(cert: ChainCertificado, state: DemoDataState): Certificate {
  const issuer = state.issuers.find(
    (item) => item.walletAddress?.toLowerCase() === cert.emisor.toLowerCase(),
  );
  const student = state.students.find(
    (item) => item.fullName === cert.nombreEstudiante,
  );
  const issuedAt = chainDate(cert.fechaEmision) || new Date().toISOString();

  return {
    id: `chain-${cert.codigo}`,
    code: cert.codigo,
    type: (cert.tipoDocumento as Certificate["type"]) || "Diploma Academico",
    studentId: student?.id ?? cert.estudianteWallet,
    studentName: cert.nombreEstudiante,
    identityDocument: student?.identityDocument ?? "Registrado on-chain",
    career: cert.carrera,
    faculty: student?.faculty ?? "Registrado on-chain",
    university: student?.university ?? "Universidad (on-chain)",
    issueDate: issuedAt,
    issuerId: issuer?.id ?? cert.emisor,
    issuerName: issuer?.name ?? `Emisor ${cert.emisor.slice(0, 10)}...`,
    issuerRole: issuer?.role ?? "Rector",
    documentHash: cert.hashDocumento,
    blockchainHash: cert.hashDocumento,
    transactionHash: "",
    blockNumber: 0,
    status: chainStatus(cert),
    pdfName: `${cert.codigo.toLowerCase()}.pdf`,
    observations: "Certificado registrado en el contrato inteligente.",
    receptionSignature:
      cert.fechaRecepcion > 0n ? `onchain-reception-${cert.codigo}` : undefined,
    issuerSignature: `onchain-issuer-${cert.emisor}`,
    revokedAt: chainDate(cert.fechaRevocacion) || undefined,
    revocationReason: cert.motivoRevocacion || undefined,
    verificationUrl: `https://certichain.demo.bo/verify/${cert.codigo}`,
    nftTokenId: cert.tokenId > 0n ? `NFT-ACAD-${String(cert.tokenId).padStart(4, "0")}` : undefined,
    createdAt: issuedAt,
    updatedAt: issuedAt,
    title: `${cert.tipoDocumento} - ${cert.nombreEstudiante}`,
    kind: (cert.tipoDocumento as Certificate["type"]) || "Diploma Academico",
    issuedAt,
    pdfHash: cert.hashDocumento,
    txHash: "",
    signature: `onchain-issuer-${cert.emisor}`,
  };
}

function mergeChainCertificates(state: DemoDataState, chainCerts: ChainCertificado[]): Certificate[] {
  const mapped = chainCerts.map((cert) => mapChainCertificate(cert, state));
  const byCode = new Map(mapped.map((cert) => [cert.code, cert]));
  const untouched = state.certificates.filter((cert) => !byCode.has(cert.code));
  return [...mapped.reverse(), ...untouched];
}

function buildChainEvent(
  _state: DemoDataState,
  type: BlockchainEvent["type"],
  actor: string,
  detail: string,
  actorRole: Role,
  txHash: string,
  blockNumber: number,
  certificateId?: string,
): BlockchainEvent {
  return {
    id: `event-chain-${txHash}-${type}`,
    type,
    actor,
    actorRole,
    certificateId,
    transactionHash: txHash,
    txHash,
    blockNumber,
    createdAt: new Date().toISOString(),
    detail,
    nodeId: "node-lpz",
  };
}

const persisted = readStorage<Partial<ExportedAppState> | null>(STORAGE_KEY, null);
const initial = createInitialState();
const persistedParse = persisted ? importedAppStateSchema.safeParse(persisted) : null;
const persistedData = persistedParse?.success
  ? (persistedParse.data as Partial<ExportedAppState>)
  : undefined;
const hydratedInitial: DemoDataState = persistedParse?.success
  ? {
      ...initial,
      ...persistedData,
      activePersona:
        persistedData?.activePersona ??
        defaultPersonaForRole(
          persistedData?.activeRole ?? initial.activeRole,
          persistedData?.issuers ?? initial.issuers,
          persistedData?.students ?? initial.students,
          persistedData?.verifierEntities ?? initial.verifierEntities,
        ),
      activeRoute: isRouteAllowedForRole(
        (persistedData?.activeRoute as RouteId) ?? initial.activeRoute,
        persistedData?.activeRole ?? initial.activeRole,
      )
        ? ((persistedData?.activeRoute as RouteId) ?? initial.activeRoute)
        : DEFAULT_ROUTE_BY_ROLE[persistedData?.activeRole ?? initial.activeRole],
      nftAcademicTokens: persistedData?.nftAcademicTokens ?? initial.nftAcademicTokens,
      settings: {
        ...initial.settings,
        ...persistedData?.settings,
      },
      wallet: initial.wallet,
    }
  : initial;

export const useAppStore = create<AppStore>((set, get) => ({
  ...hydratedInitial,
  certificateHistorial: {},
  currentRouteId: hydratedInitial.activeRoute,
  historialSyncing: false,
  sidebarExpanded: false,
  sidebarPinned: false,
  toasts: [],
  chainConnected: false,
  contractAddress: CONTRACT_ADDRESS,
  fetchCertificateHistorial: async (codigo) => {
    const state = get();
    const trimmedCode = codigo.trim();

    if (!trimmedCode) {
      return [];
    }

    const deployment = getDeploymentByNetwork(state.selectedNetwork);
    if (!isDeploymentReady(deployment)) {
      set((current) => ({
        toasts: [
          ...current.toasts,
          createToast(
            "Historial no disponible",
            `Despliega el contrato en ${state.selectedNetwork} para consultar consultarHistorial().`,
            "warning",
          ),
        ],
      }));
      return state.certificateHistorial[trimmedCode] ?? [];
    }

    try {
      const certificate = state.certificates.find((item) => item.code === trimmedCode);
      const rawEvents = await consultarHistorialOnChain(trimmedCode, state.selectedNetwork);
      const mapped = mapChainHistorial(trimmedCode, rawEvents, certificate);

      set((current) => ({
        certificateHistorial: {
          ...current.certificateHistorial,
          [trimmedCode]: mapped,
        },
      }));

      return mapped;
    } catch (error) {
      set((current) => ({
        toasts: [
          ...current.toasts,
          createToast("Historial on-chain fallido", extraerMensajeError(error), "error"),
        ],
      }));
      return state.certificateHistorial[trimmedCode] ?? [];
    }
  },
  syncLedgerHistorial: async () => {
    const state = get();
    const deployment = getDeploymentByNetwork(state.selectedNetwork);

    if (!isDeploymentReady(deployment)) {
      set((current) => ({
        toasts: [
          ...current.toasts,
          createToast(
            "Sincronizacion bloqueada",
            `No hay contrato desplegado para ${state.selectedNetwork}.`,
            "warning",
          ),
        ],
      }));
      return;
    }

    set({ historialSyncing: true });

    try {
      const codes = new Set(state.certificates.map((certificate) => certificate.code));

      if (state.chainConnected) {
        const chainCertificates = await listarCertificadosOnChain(state.selectedNetwork);
        for (const certificate of chainCertificates) {
          codes.add(certificate.codigo);
        }
      }

      const nextHistorial: Record<string, CertificateHistorialEntry[]> = {
        ...state.certificateHistorial,
      };
      let totalEvents = 0;

      for (const code of codes) {
        const certificate = state.certificates.find((item) => item.code === code);
        const rawEvents = await consultarHistorialOnChain(code, state.selectedNetwork);
        const mapped = mapChainHistorial(code, rawEvents, certificate);
        nextHistorial[code] = mapped;
        totalEvents += mapped.length;
      }

      set((current) => ({
        historialSyncing: false,
        certificateHistorial: nextHistorial,
        toasts: [
          ...current.toasts,
          createToast(
            "Historial on-chain sincronizado",
            `${totalEvents} evento(s) leidos con consultarHistorial() en ${codes.size} certificado(s).`,
            "success",
          ),
        ],
      }));
    } catch (error) {
      set((current) => ({
        historialSyncing: false,
        toasts: [
          ...current.toasts,
          createToast("Sincronizacion de historial fallida", extraerMensajeError(error), "error"),
        ],
      }));
    }
  },
  setActiveRoute: (routeId) =>
    set((state) => {
      if (!isRouteAllowedForRole(routeId, state.activeRole)) {
        const fallbackRoute = DEFAULT_ROUTE_BY_ROLE[state.activeRole];
        return {
          ...state,
          activeRoute: fallbackRoute,
          currentRouteId: fallbackRoute,
          toasts: [
            ...state.toasts,
            createToast(
              "Ruta no permitida",
              `Tu rol actual no puede acceder a esa pantalla. Redirigiendo a ${fallbackRoute}.`,
              "warning",
            ),
          ],
        };
      }

      const next = { ...state, activeRoute: routeId, currentRouteId: routeId };
      persistState(next);
      return next;
    }),
  setRoute: (routeId) => get().setActiveRoute(routeId),
  setActivePersona: (persona) =>
    set((state) => {
      const next = {
        ...state,
        activePersona: {
          ...state.activePersona,
          ...persona,
        },
      };
      persistState(next);
      return next;
    }),
  setActiveRole: (role) =>
    set((state) => {
      const activePersona = defaultPersonaForRole(
        role,
        state.issuers,
        state.students,
        state.verifierEntities,
      );
      const nextRoute = isRouteAllowedForRole(state.currentRouteId, role)
        ? state.currentRouteId
        : DEFAULT_ROUTE_BY_ROLE[role];
      const next = {
        ...state,
        activeRole: role,
        activePersona,
        activeRoute: nextRoute,
        currentRouteId: nextRoute,
        toasts: [
          ...state.toasts,
          createToast(
            "Rol activo actualizado",
            "Se ajustaron permisos, persona activa y navegacion permitida.",
            "info",
          ),
        ],
      };
      persistState(next);
      return next;
    }),
  setSidebarExpanded: (expanded) => set({ sidebarExpanded: expanded }),
  toggleSidebarPinned: () =>
    set((state) => {
      const nextPinned = !state.sidebarPinned;

      return {
        sidebarExpanded: nextPinned,
        sidebarPinned: nextPinned,
      };
    }),
  connectWallet: async () => {
    if (connectWalletInFlight) {
      return connectWalletInFlight;
    }

    const runConnect = async () => {
    if (!hasMetaMask()) {
      set((state) => {
        const next = {
          ...state,
          chainConnected: false,
          wallet: {
            ...state.wallet,
            address: "",
            balanceEth: 0,
            connected: false,
            contractAddress: "",
            isContractReady: false,
            isSupportedNetwork: false,
            lastError: "MetaMask no detectado.",
            network: state.selectedNetwork,
          },
          toasts: [
            ...state.toasts,
            createToast(
              "MetaMask no detectado",
              "Instala o habilita MetaMask para firmar transacciones reales.",
              "warning",
            ),
          ],
        };
        persistState(next);
        return next;
      });
      return;
    }

    try {
      const state = get();
      const alreadyConnected = state.wallet.connected;
      let connection = alreadyConnected
        ? await refreshWalletConnection()
        : await connectMetaMask();

      if (!alreadyConnected) {
        setWalletSessionActive(true);
        const targetDeployment = getDeploymentByNetwork(state.selectedNetwork);

        if (
          targetDeployment &&
          isDeploymentReady(targetDeployment) &&
          connection.chainId !== targetDeployment.chainId
        ) {
          try {
            await switchToNetwork(state.selectedNetwork);
            connection = await refreshWalletConnection();
          } catch (switchError) {
            set((current) => ({
              toasts: [
                ...current.toasts,
                createToast(
                  "Red distinta detectada",
                  `${extraerMensajeError(switchError)} Cambia MetaMask a ${targetDeployment.chainName} (chainId ${targetDeployment.chainId}).`,
                  "warning",
                ),
              ],
            }));
          }
        }
      }

      const { chainReady, detectedNetwork } = buildWalletStateFromConnection(
        connection,
        state.selectedNetwork,
      );

      set((current) => {
        const next = mergeWalletConnectionIntoState(
          current,
          connection,
          alreadyConnected ? current.selectedNetwork : state.selectedNetwork,
          createToast(
            alreadyConnected
              ? chainReady
                ? "Wallet sincronizada"
                : "Wallet sincronizada con advertencia"
              : chainReady
                ? "MetaMask conectado"
                : "Wallet conectada con advertencia",
            chainReady
              ? `Cuenta ${connection.address.slice(0, 10)}... en red ${detectedNetwork} (chainId ${connection.chainId}).`
              : `Cuenta ${connection.address.slice(0, 10)}... en chainId ${connection.chainId}. ${connection.isSupportedNetwork ? "Falta desplegar el contrato en esta red." : "Cambia a Hardhat, Ganache o Sepolia."}`,
            chainReady ? "success" : "warning",
          ),
        );
        persistState(next);
        return next;
      });

      bindWalletEvents({
        onAccountsChanged: (accounts) => {
          if (!accounts.length) {
            get().disconnectWallet();
            return;
          }
          set((current) => ({
            wallet: { ...current.wallet, address: accounts[0] },
            toasts: [
              ...current.toasts,
              createToast("Cuenta cambiada", `Ahora usas ${accounts[0].slice(0, 10)}...`, "info"),
            ],
          }));
        },
        onChainChanged: () => {
          if (shouldSuppressChainReconnect()) {
            return;
          }
          void get().syncWalletFromMetaMask();
        },
      });

      if (get().chainConnected) {
        await get().syncFromChain();
      }
    } catch (error) {
      setWalletSessionActive(false);
      const message = extraerMensajeError(error);
      set((current) => {
        const next = {
          ...current,
          chainConnected: false,
          wallet: {
            ...current.wallet,
            connected: false,
            address: "",
            balanceEth: 0,
            chainId: undefined,
            contractAddress: "",
            isContractReady: false,
            isSupportedNetwork: false,
            lastError: message,
          },
          toasts: [...current.toasts, createToast("Conexion fallida", message, "error")],
        };
        persistState(next);
        return next;
      });
    }
    };

    connectWalletInFlight = runConnect().finally(() => {
      connectWalletInFlight = null;
    });

    return connectWalletInFlight;
  },
  syncFromChain: async () => {
    if (!get().chainConnected) {
      return;
    }
    try {
      const network = get().wallet.network ?? get().selectedNetwork;
      const [chainCerts, chainEmisores] = await Promise.all([
        listarCertificadosOnChain(network),
        listarEmisoresOnChain(network),
      ]);

      set((state) => {
        const knownWallets = new Set(
          state.issuers.map((issuer) => issuer.walletAddress?.toLowerCase()),
        );
        const updatedIssuers = state.issuers.map((issuer) => {
          const onChain = chainEmisores.find(
            (emisor) => emisor.address.toLowerCase() === issuer.walletAddress?.toLowerCase(),
          );
          return onChain ? { ...issuer, active: onChain.activo } : issuer;
        });
        const newIssuers: Issuer[] = chainEmisores
          .filter((emisor) => !knownWallets.has(emisor.address.toLowerCase()))
          .map((emisor, index) => ({
            id: `issuer-chain-${index + 1}`,
            name: emisor.nombre || `Emisor ${emisor.address.slice(0, 10)}...`,
            role: "Rector",
            walletAddress: emisor.address,
            active: emisor.activo,
            authorityLevel: 1,
            email: "",
            authorizedAt: new Date().toISOString(),
          }) as unknown as Issuer);

        const next = {
          ...state,
          certificates: mergeChainCertificates(state, chainCerts),
          issuers: [...updatedIssuers, ...newIssuers],
          toasts: [
            ...state.toasts,
            createToast(
              "Ledger sincronizado",
              `${chainCerts.length} certificado(s) y ${chainEmisores.length} emisor(es) leidos del contrato.`,
              "info",
            ),
          ],
        };
        persistState(next);
        return next;
      });
    } catch (error) {
      set((state) => ({
        toasts: [
          ...state.toasts,
          createToast("Sincronizacion fallida", extraerMensajeError(error), "error"),
        ],
      }));
    }
  },
  disconnectWallet: () => {
    setWalletSessionActive(false);
    unbindWalletEvents();
    set((state) => {
      const next = {
        ...state,
        chainConnected: false,
        wallet: {
          ...state.wallet,
          address: "",
          balanceEth: 0,
          connected: false,
          chainId: undefined,
          contractAddress: "",
          isContractReady: false,
          isSupportedNetwork: false,
          lastError: undefined,
        },
        toasts: [
          ...state.toasts,
          createToast("Wallet desconectada", "La sesion queda en modo solo lectura.", "info"),
        ],
      };
      persistState(next);
      return next;
    });
  },
  syncWalletFromMetaMask: async (options) => {
    if (!hasMetaMask() || !get().wallet.connected) {
      return;
    }

    if (walletSyncInFlight) {
      return walletSyncInFlight;
    }

    const runSync = async () => {
      try {
        const connection = await refreshWalletConnection();
        setWalletSessionActive(true);
        const { chainReady, detectedNetwork } = buildWalletStateFromConnection(
          connection,
          get().selectedNetwork,
        );

        set((current) => {
          const next = mergeWalletConnectionIntoState(
            current,
            connection,
            detectedNetwork,
            options?.silent
              ? undefined
              : createToast(
                  chainReady ? "Red sincronizada" : "Red actualizada con advertencia",
                  `MetaMask quedo en ${detectedNetwork} (chainId ${connection.chainId}).`,
                  chainReady ? "success" : "warning",
                ),
          );
          persistState(next);
          return next;
        });

        if (get().chainConnected) {
          await get().syncFromChain();
        }
      } catch (error) {
        set((current) => ({
          toasts: [
            ...current.toasts,
            createToast("Sincronizacion de wallet fallida", extraerMensajeError(error), "error"),
          ],
        }));
      }
    };

    walletSyncInFlight = runSync().finally(() => {
      walletSyncInFlight = null;
    });

    return walletSyncInFlight;
  },
  switchNetwork: (network) => {
    set((state) => ({
      ...state,
      selectedNetwork: network,
      wallet: {
        ...state.wallet,
        network,
      },
    }));

    if (get().wallet.connected && hasMetaMask()) {
      const pendingSync = walletSyncInFlight;

      const runSwitch = async () => {
        if (pendingSync) {
          await pendingSync.catch(() => undefined);
        }
        if (connectWalletInFlight) {
          await connectWalletInFlight.catch(() => undefined);
        }

        try {
          await switchToNetwork(network);
          const connection = await refreshWalletConnection();
          setWalletSessionActive(true);
          const { chainReady, detectedNetwork } = buildWalletStateFromConnection(
            connection,
            network,
          );
          const deployment = getDeploymentByNetwork(network);

          set((current) => {
            const next = mergeWalletConnectionIntoState(
              current,
              connection,
              network,
              createToast(
                chainReady ? "Red actualizada" : "Red cambiada con advertencia",
                chainReady
                  ? `MetaMask ahora usa ${deployment?.chainName ?? detectedNetwork} (chainId ${connection.chainId}).`
                  : `MetaMask quedo en chainId ${connection.chainId}. ${connection.isSupportedNetwork ? "Falta desplegar el contrato en esta red." : "La red no esta soportada por CertiChain."}`,
                chainReady ? "success" : "warning",
              ),
            );
            persistState(next);
            return next;
          });

          if (get().chainConnected) {
            await get().syncFromChain();
          }
        } catch (error) {
          set((state) => ({
            toasts: [
              ...state.toasts,
              createToast("Cambio de red fallido", extraerMensajeError(error), "error"),
            ],
          }));
        }
      };

      walletSyncInFlight = runSwitch().finally(() => {
        walletSyncInFlight = null;
      });
      return;
    }
    set((state) => {
      const next = {
        ...state,
        chainConnected: false,
        wallet: {
          ...state.wallet,
          contractAddress: "",
          isContractReady: false,
          isSupportedNetwork: false,
          lastError: undefined,
          network,
        },
        toasts: [
          ...state.toasts,
          createToast("Red actualizada", `La sesion usa ${network}.`, "info"),
        ],
      };
      persistState(next);
      return next;
    });
  },
  updateSettings: (settings) =>
    set((state) => {
      const next = {
        ...state,
        settings: {
          ...state.settings,
          ...settings,
        },
      };
      persistState(next);
      return next;
    }),
  issueCertificate: async (input) => {
    const state = get();
    const issuer = state.issuers.find((item) => item.id === input.issuerId);

    if (
      state.activeRole === "authorized_issuer" &&
      state.activePersona.issuerId &&
      input.issuerId !== state.activePersona.issuerId
    ) {
      set((current) => ({
        toasts: [
          ...current.toasts,
          createToast(
            "Emisor no coincide",
            "Debes emitir con la universidad activa seleccionada en la barra superior.",
            "warning",
          ),
        ],
      }));
      return null;
    }

    if (!canIssueCertificate(issuer, state.activeRole, walletPermissionOptions(state))) {
      set((current) => ({
        toasts: [
          ...current.toasts,
          createToast(
            "Emision bloqueada",
            state.wallet.connected
              ? "La wallet conectada no corresponde al emisor activo o al rol seleccionado."
              : "El rol activo no puede emitir certificados.",
            "warning",
          ),
        ],
      }));
      return null;
    }

    const student = state.students.find((item) => item.id === input.studentId);

    if (!student || !issuer) {
      return null;
    }

    if (!state.chainConnected) {
      set((current) => ({
        toasts: [
          ...current.toasts,
          createToast(
            "Contrato no conectado",
            "Conecta MetaMask a una red con CertificadoAcademico desplegado para emitir.",
            "warning",
          ),
        ],
      }));
      return null;
    }

    const nextIndex = state.certificates.length + 1;
    const code = input.code?.trim() || `CERT-2026-${String(nextIndex).padStart(4, "0")}`;
    const parsedIssueDate = input.issueDate ? new Date(input.issueDate) : new Date();
    const createdAt = Number.isNaN(parsedIssueDate.getTime())
      ? new Date().toISOString()
      : parsedIssueDate.toISOString();
    // Hash SHA-256 real del PDF cargado; si no hay archivo, hash del contenido sintetico
    const documentHash = normalizeHash(
      await calculateSha256(
        input.pdfFile ?? `${input.pdfName}-${student.identityDocument}-${createdAt}`,
      ),
    );

    let transactionHash = "";
    let realBlockNumber: number | null = null;
    let chainTokenId: number | null = null;

    try {
      const result = await emitirCertificadoOnChain({
        codigo: code,
        nombreEstudiante: student.fullName,
        carrera: input.career,
        tipoDocumento: input.certificateType,
        hashDocumento: documentHash,
        estudianteWallet: (input.studentWallet || student.walletAddress || "").toLowerCase() || undefined,
        metadataURI: `data:application/json;base64,${btoa(
          JSON.stringify({
            estudiante: student.fullName,
            carrera: input.career,
            universidad: input.university,
            fecha: createdAt,
            hash: documentHash,
          }),
        )}`,
      });
      transactionHash = result.txHash;
      realBlockNumber = result.blockNumber;
      chainTokenId = result.tokenId;
    } catch (error) {
      set((current) => ({
        toasts: [
          ...current.toasts,
          createToast("Emision on-chain fallida", extraerMensajeError(error), "error"),
        ],
      }));
      return null;
    }

    const certificate: Certificate = {
      id: `certificate-${String(nextIndex).padStart(3, "0")}`,
      code,
      type: input.certificateType,
      studentId: student.id,
      studentName: student.fullName,
      identityDocument: input.identityDocument,
      career: input.career,
      faculty: input.faculty,
      university: input.university,
      issueDate: createdAt,
      issuerId: issuer.id,
      issuerName: issuer.name,
      issuerRole: issuer.role,
      documentHash,
      blockchainHash: documentHash,
      transactionHash,
      blockNumber: realBlockNumber ?? 0,
      status: "pending_reception",
      pdfName: input.pdfName,
      observations: input.observations,
      issuerSignature: `issuer-signature-${issuer.id}-${code}`,
      verificationUrl: `https://certichain.demo.bo/verify/${code}`,
      createdAt,
      updatedAt: createdAt,
      title: `${input.certificateType} - ${student.fullName}`,
      kind: input.certificateType,
      issuedAt: createdAt,
      pdfHash: documentHash,
      txHash: transactionHash,
      signature: `issuer-signature-${issuer.id}-${code}`,
    };

    if (chainTokenId && chainTokenId > 0) {
      certificate.nftTokenId = `NFT-ACAD-${String(chainTokenId).padStart(4, "0")}`;
    }

    set((current) => {
      const token: NftAcademicToken | null =
        chainTokenId && chainTokenId > 0
          ? {
              id: `nft-academic-token-${String(current.nftAcademicTokens.length + 1).padStart(3, "0")}-${Date.now()}`,
              tokenId: `NFT-ACAD-${String(chainTokenId).padStart(4, "0")}`,
              certificateId: certificate.id,
              ownerStudentId: student.id,
              contractAddress: current.wallet.contractAddress || current.contractAddress,
              metadataUri: `data:application/json;base64,${btoa(
                JSON.stringify({
                  estudiante: student.fullName,
                  carrera: input.career,
                  universidad: input.university,
                  fecha: createdAt,
                  hash: documentHash,
                }),
              )}`,
              mintedAt: createdAt,
              transactionHash,
            }
          : null;
      const issuedEvent = buildChainEvent(
        current,
        "certificate_issued",
        current.wallet.address,
        `Certificado ${code} emitido on-chain (NFT #${chainTokenId}).`,
        "authorized_issuer",
        transactionHash,
        realBlockNumber as number,
        certificate.id,
      );
      const next = {
        ...current,
        blockchainEvents: [issuedEvent, ...current.blockchainEvents],
        certificates: [certificate, ...current.certificates],
        nftAcademicTokens: token ? [token, ...current.nftAcademicTokens] : current.nftAcademicTokens,
        selectedCertificateId: certificate.id,
        toasts: [
          ...current.toasts,
          createToast(
            "Emision registrada",
            `${code} anclado en el contrato. Tx ${transactionHash.slice(0, 14)}... bloque ${realBlockNumber}.`,
            "success",
          ),
        ],
      };
      persistState(next);
      return next;
    });

    return certificate;
  },
  mintAcademicNft: (certificateId) => {
    const state = get();
    const certificate = state.certificates.find((item) => item.id === certificateId);

    if (!certificate) {
      return undefined;
    }

    const existingToken = state.nftAcademicTokens.find(
      (token) => token.certificateId === certificateId || token.tokenId === certificate.nftTokenId,
    );

    if (existingToken) {
      set((current) => ({
        toasts: [
          ...current.toasts,
          createToast("NFT ya asociado", `${certificate.code} ya tiene token ERC-721 registrado.`, "info"),
        ],
      }));
      return existingToken;
    }

    set((current) => ({
      toasts: [
        ...current.toasts,
        createToast(
          "Mint se genera al emitir",
          "El contrato crea el ERC-721 dentro de emitirCertificado(); no hay mint manual separado.",
          "warning",
        ),
      ],
    }));
    return undefined;
  },
  verifyCertificateByCode: (code) => {
    const certificate = get().certificates.find((item) => item.code === code.trim());
    return verificationResult(certificate);
  },
  verifyCertificateByHash: (hashValue) => {
    const normalized = normalizeHash(hashValue);
    const certificate = get().certificates.find(
      (item) => item.documentHash === normalized || item.blockchainHash === normalized,
    );
    return verificationResult(certificate);
  },
  verifyCertificateByCodeAsync: async (code) => {
    const state = get();
    if (!state.chainConnected) {
      return state.verifyCertificateByCode(code);
    }
    try {
      const datos = await consultarPorCodigoOnChain(code.trim());
      if (!datos) {
        return {
          message: "El codigo no existe en el contrato inteligente.",
          status: "not_found",
        };
      }
      const certificate = mapChainCertificate(datos, state);
      return {
        certificate,
        message:
          certificate.status === "revoked"
            ? `Certificado revocado on-chain: ${datos.motivoRevocacion}`
            : "Certificado encontrado en el ledger de Ethereum.",
        status: certificate.status,
      };
    } catch (error) {
      set((current) => ({
        toasts: [
          ...current.toasts,
          createToast("Consulta on-chain fallida", extraerMensajeError(error), "error"),
        ],
      }));
      return state.verifyCertificateByCode(code);
    }
  },
  verifyCertificateByHashAsync: async (hashValue) => {
    const state = get();
    if (!state.chainConnected) {
      return state.verifyCertificateByHash(hashValue);
    }
    try {
      const resultado = await verificarCertificadoOnChain(
        normalizeHash(hashValue),
        state.wallet.network ?? state.selectedNetwork,
      );
      if (!resultado.existe || !resultado.datos) {
        return {
          message: "CERTIFICADO NO VALIDO: el hash no esta registrado en la blockchain.",
          status: "not_found",
        };
      }
      const certificate = mapChainCertificate(resultado.datos, state);
      return {
        certificate,
        message: resultado.valido
          ? "CERTIFICADO VALIDO: el hash coincide con el registro inmutable."
          : `CERTIFICADO NO VALIDO: fue revocado (${resultado.datos.motivoRevocacion}).`,
        status: certificate.status,
      };
    } catch (error) {
      set((current) => ({
        toasts: [
          ...current.toasts,
          createToast("Verificacion on-chain fallida", extraerMensajeError(error), "error"),
        ],
      }));
      return state.verifyCertificateByHash(hashValue);
    }
  },
  verifyCertificateByPdf: async (file) => {
    const hashValue = normalizeHash(await calculateSha256(file));
    return get().verifyCertificateByHashAsync(hashValue);
  },
  revokeCertificate: async (certificateId, reason) => {
    const state = get();
    const certificate = state.certificates.find((item) => item.id === certificateId);
    const issuer = state.issuers.find((item) => item.id === certificate?.issuerId);

    if (!certificate || !canRevokeCertificate(issuer, certificate, state.activeRole, walletPermissionOptions(state))) {
      set((current) => ({
        toasts: [
          ...current.toasts,
          createToast(
            "Revocacion bloqueada",
            state.wallet.connected
              ? "La wallet conectada no corresponde al emisor activo o al certificado."
              : "Solo un emisor autorizado puede revocar.",
            "warning",
          ),
        ],
      }));
      return undefined;
    }

    if (!state.chainConnected) {
      set((current) => ({
        toasts: [
          ...current.toasts,
          createToast(
            "Contrato no conectado",
            "Conecta MetaMask a una red con CertificadoAcademico desplegado para revocar.",
            "warning",
          ),
        ],
      }));
      return undefined;
    }

    const revokedAt = new Date().toISOString();
    let transactionHash = "";
    let realBlockNumber = 0;

    try {
      const result = await revocarCertificadoOnChain(certificate.code, reason);
      transactionHash = result.txHash;
      realBlockNumber = result.blockNumber;
    } catch (error) {
      set((current) => ({
        toasts: [
          ...current.toasts,
          createToast("Revocacion on-chain fallida", extraerMensajeError(error), "error"),
        ],
      }));
      return undefined;
    }
    const updated: Certificate = {
      ...certificate,
      status: "revoked",
      revokedAt,
      revocationReason: reason,
      updatedAt: revokedAt,
    };
    const record: RevocationRecord = {
      id: `revocation-${state.revocationRecords.length + 1}`,
      certificateId,
      issuerId: certificate.issuerId,
      reason,
      revokedAt,
      transactionHash,
      blockNumber: realBlockNumber,
    };

    set((current) => {
      const next = {
        ...current,
        blockchainEvents: [
          buildChainEvent(
            current,
            "certificate_revoked",
            current.wallet.address,
            `Certificado ${updated.code} revocado.`,
            "authorized_issuer",
            transactionHash,
            realBlockNumber,
            updated.id,
          ),
          ...current.blockchainEvents,
        ],
        certificates: current.certificates.map((item) => (item.id === certificateId ? updated : item)),
        revocationRecords: [record, ...current.revocationRecords],
        toasts: [
          ...current.toasts,
          createToast("Certificado revocado", "El historial permanece visible en el ledger.", "success"),
        ],
      };
      persistState(next);
      return next;
    });

    return updated;
  },
  authorizeIssuer: async (issuerId) => {
    const state = get();
    const target = state.issuers.find((issuer) => issuer.id === issuerId);
    if (state.activeRole !== "academic_admin") {
      set((current) => ({
        toasts: [
          ...current.toasts,
          createToast("Autorizacion bloqueada", "Solo el administrador academico puede activar emisores.", "warning"),
        ],
      }));
      return undefined;
    }

    if (!target?.walletAddress) {
      set((current) => ({
        toasts: [
          ...current.toasts,
          createToast("Autorizacion fallida", "El emisor no tiene wallet asociada.", "error"),
        ],
      }));
      return undefined;
    }

    if (!state.chainConnected) {
      set((current) => ({
        toasts: [
          ...current.toasts,
          createToast(
            "Contrato no conectado",
            "Conecta MetaMask a una red con CertificadoAcademico desplegado para autorizar emisores.",
            "warning",
          ),
        ],
      }));
      return undefined;
    }

    let chainTx: { txHash: string; blockNumber: number };
    try {
      chainTx = await autorizarEmisorOnChain(
        target.walletAddress.toLowerCase(),
        target.name,
        target.role,
      );
    } catch (error) {
      set((current) => ({
        toasts: [
          ...current.toasts,
          createToast("Autorizacion on-chain fallida", extraerMensajeError(error), "error"),
        ],
      }));
      return undefined;
    }

    let updated: Issuer | undefined;
    set((state) => {
      const next = {
        ...state,
        issuers: state.issuers.map((issuer) => {
          if (issuer.id !== issuerId) {
            return issuer;
          }

          updated = { ...issuer, active: true, deactivatedAt: undefined };
          return updated;
        }),
      };

      if (!updated) {
        return state;
      }

      next.blockchainEvents = [
        buildChainEvent(
          state,
          "issuer_authorized",
          state.wallet.address,
          `${updated.name} autorizado on-chain como emisor academico.`,
          "academic_admin",
          chainTx.txHash,
          chainTx.blockNumber,
        ),
        ...state.blockchainEvents,
      ];
      next.toasts = [
        ...state.toasts,
        createToast("Emisor activado", `${updated.name} puede emitir y revocar nuevamente.`, "success"),
      ];
      persistState(next);
      return next;
    });
    return updated;
  },
  deactivateIssuer: async (issuerId) => {
    const state = get();
    const target = state.issuers.find((issuer) => issuer.id === issuerId);
    if (state.activeRole !== "academic_admin") {
      set((current) => ({
        toasts: [
          ...current.toasts,
          createToast("Desactivacion bloqueada", "Solo el administrador academico puede desactivar emisores.", "warning"),
        ],
      }));
      return undefined;
    }

    if (!target?.walletAddress) {
      set((current) => ({
        toasts: [
          ...current.toasts,
          createToast("Desactivacion fallida", "El emisor no tiene wallet asociada.", "error"),
        ],
      }));
      return undefined;
    }

    if (!state.chainConnected) {
      set((current) => ({
        toasts: [
          ...current.toasts,
          createToast(
            "Contrato no conectado",
            "Conecta MetaMask a una red con CertificadoAcademico desplegado para desactivar emisores.",
            "warning",
          ),
        ],
      }));
      return undefined;
    }

    let chainTx: { txHash: string; blockNumber: number };
    try {
      chainTx = await desactivarEmisorOnChain(target.walletAddress.toLowerCase());
    } catch (error) {
      set((current) => ({
        toasts: [
          ...current.toasts,
          createToast("Desactivacion on-chain fallida", extraerMensajeError(error), "error"),
        ],
      }));
      return undefined;
    }

    let updated: Issuer | undefined;
    set((state) => {
      const next = {
        ...state,
        issuers: state.issuers.map((issuer) => {
          if (issuer.id !== issuerId) {
            return issuer;
          }

          updated = { ...issuer, active: false, deactivatedAt: new Date().toISOString() };
          return updated;
        }),
      };

      if (!updated) {
        return state;
      }

      next.blockchainEvents = [
        buildChainEvent(
          state,
          "issuer_deactivated",
          state.wallet.address,
          `${updated.name} desactivado on-chain.`,
          "academic_admin",
          chainTx.txHash,
          chainTx.blockNumber,
        ),
        ...state.blockchainEvents,
      ];
      next.toasts = [
        ...state.toasts,
        createToast("Emisor desactivado", "Ese wallet ya no puede emitir ni revocar certificados.", "warning"),
      ];
      persistState(next);
      return next;
    });
    return updated;
  },
  addBlockchainEvent: (event) =>
    set((state) => {
      const next = { ...state, blockchainEvents: [event, ...state.blockchainEvents] };
      persistState(next);
      return next;
    }),
  signStudentReception: async (certificateId) => {
    const state = get();
    const certificate = state.certificates.find((item) => item.id === certificateId);
    const student = resolveActiveStudent(state.activePersona, state.students);

    if (!certificate) {
      return undefined;
    }

    if (!canSignStudentReception(state.activeRole, certificate, student, walletPermissionOptions(state))) {
      set((current) => ({
        toasts: [
          ...current.toasts,
          createToast(
            "Firma bloqueada",
            state.activeRole !== "student"
              ? "Solo el estudiante activo puede firmar la recepcion del certificado."
              : state.wallet.connected
                ? "La wallet conectada no corresponde al estudiante activo."
                : "El certificado no pertenece al estudiante activo o ya fue firmado.",
            "warning",
          ),
        ],
      }));
      return undefined;
    }

    if (certificate.receptionSignature) {
      set((current) => ({
        toasts: [
          ...current.toasts,
          createToast("Recepcion ya firmada", "El certificado ya tiene firma de recepcion registrada.", "info"),
        ],
      }));
      return certificate;
    }

    if (!state.chainConnected) {
      set((current) => ({
        toasts: [
          ...current.toasts,
          createToast(
            "Contrato no conectado",
            "Conecta MetaMask a una red con CertificadoAcademico desplegado para firmar recepcion.",
            "warning",
          ),
        ],
      }));
      return undefined;
    }

    let chainTx: { txHash: string; blockNumber: number };
    try {
      chainTx = await firmarRecepcionOnChain(certificate.code);
    } catch (error) {
      set((current) => ({
        toasts: [
          ...current.toasts,
          createToast(
            "Firma de recepcion rechazada",
            `El contrato rechazo la firma: ${extraerMensajeError(error)}`,
            "error",
          ),
        ],
      }));
      return undefined;
    }

    const updated: Certificate = {
      ...certificate,
      receptionSignature: `onchain-reception-${chainTx.txHash}`,
      status: certificate.status === "pending_reception" ? "valid" : certificate.status,
      updatedAt: new Date().toISOString(),
    };

    set((state) => {
      const next = {
        ...state,
        blockchainEvents: [
          buildChainEvent(
            state,
            "student_received",
            state.wallet.address,
            `Recepcion firmada on-chain para ${updated.code}.`,
            "student",
            chainTx.txHash,
            chainTx.blockNumber,
            updated.id,
          ),
          ...state.blockchainEvents,
        ],
        certificates: state.certificates.map((item) => (item.id === certificateId ? updated : item)),
        toasts: [
          ...state.toasts,
          createToast("Recepcion firmada", `${updated.code} quedo aceptado por el estudiante.`, "success"),
        ],
      };
      persistState(next);
      return next;
    });

    return updated;
  },
  resetDemoData: (routeId = "dashboard") =>
    set((state) => {
      const next = {
        ...state,
        ...createInitialState(),
        activeRoute: routeId,
        certificateHistorial: {},
        currentRouteId: routeId,
        historialSyncing: false,
        sidebarExpanded: false,
        sidebarPinned: false,
        toasts: [],
      };
      writeStorage(STORAGE_KEY, toExportedState(next));
      return next;
    }),
  exportState: () => JSON.stringify(toExportedState(get()), null, 2),
  importState: (serialized) => {
    try {
      const parsed = JSON.parse(serialized) as unknown;
      const result = importedAppStateSchema.safeParse(parsed);

      if (!result.success) {
        return false;
      }

      const imported = result.data as Partial<ExportedAppState>;
      set((state) => {
        const next = {
          ...state,
          ...imported,
          nftAcademicTokens: imported.nftAcademicTokens ?? state.nftAcademicTokens,
          settings: {
            ...state.settings,
            ...imported.settings,
          },
          currentRouteId: imported.activeRoute ?? state.currentRouteId,
          wallet: { ...state.wallet, network: imported.selectedNetwork ?? state.selectedNetwork },
        };
        persistState(next);
        return next;
      });
      return true;
    } catch {
      return false;
    }
  },
  addToast: (toast) =>
    set((state) => ({
      toasts: [
        ...state.toasts,
        {
          ...toast,
          id: `toast-${toastIndex += 1}`,
        },
      ],
    })),
  removeToast: (toastId) =>
    set((state) => ({
      toasts: state.toasts.filter((toast) => toast.id !== toastId),
    })),
}));

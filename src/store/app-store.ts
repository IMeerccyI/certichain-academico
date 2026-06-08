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
} from "@/data/mock-data";
import { calculateSha256, normalizeHash } from "@/lib/hash";
import { createMockTransaction } from "@/lib/mock-chain";
import { canIssueCertificate, canRevokeCertificate } from "@/lib/permissions";
import { readStorage, writeStorage } from "@/lib/storage";
import { importedAppStateSchema } from "@/lib/validators";
import type {
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
  currentRouteId: RouteId;
  sidebarExpanded: boolean;
  sidebarPinned: boolean;
  toasts: AppToast[];
  addBlockchainEvent: (event: BlockchainEvent) => void;
  addToast: (toast: Omit<AppToast, "id">) => void;
  authorizeIssuer: (issuerId: string) => Issuer | undefined;
  connectWallet: () => void;
  connectWalletMock: () => void;
  deactivateIssuer: (issuerId: string) => Issuer | undefined;
  disconnectWallet: () => void;
  exportState: () => string;
  importState: (serialized: string) => boolean;
  issueCertificate: (input: CertificateIssueInput) => Promise<Certificate | null>;
  mintAcademicNft: (certificateId: string) => NftAcademicToken | undefined;
  removeToast: (toastId: string) => void;
  resetDemoData: () => void;
  revokeCertificate: (certificateId: string, reason: string) => Certificate | undefined;
  setActiveRole: (role: Role) => void;
  setActiveRoute: (routeId: RouteId) => void;
  setRoute: (routeId: RouteId) => void;
  setSidebarExpanded: (expanded: boolean) => void;
  signStudentReception: (certificateId: string) => Certificate | undefined;
  switchNetwork: (network: NetworkType) => void;
  toggleSidebarPinned: () => void;
  updateSettings: (settings: Partial<AppSettings>) => void;
  verifyCertificateByCode: (code: string) => VerificationResult;
  verifyCertificateByHash: (hash: string) => VerificationResult;
  verifyCertificateByPdfMock: (content: string | Blob) => Promise<VerificationResult>;
};

const STORAGE_KEY = "certichain-academico-state-v1";

const defaultWallet: WalletState = {
  connected: false,
  address: "0x6a9E5E7f42aB0061E9dD73461bA7C2382D0A5294",
  network: "sepolia",
  balanceEth: 4.28,
};

let toastIndex = 0;

function cloneData<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function createInitialState(): DemoDataState {
  return {
    activeRoute: "dashboard",
    activeRole: "authorized_issuer",
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

function toExportedState(state: DemoDataState): ExportedAppState {
  return {
    activeRole: state.activeRole,
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

function buildEvent(
  state: DemoDataState,
  certificate: Certificate | undefined,
  type: BlockchainEvent["type"],
  detail: string,
  actorRole: Role,
): BlockchainEvent {
  const latestBlock = Math.max(...state.blockchainEvents.map((event) => event.blockNumber));
  const transactionHash = createMockTransaction("0xevent");

  return {
    id: `event-${state.blockchainEvents.length + 1}-${Date.now()}`,
    type,
    actor:
      type === "student_received"
        ? certificate?.studentId ?? state.wallet.address
        : certificate?.issuerId ?? state.wallet.address,
    actorRole,
    certificateId: certificate?.id,
    transactionHash,
    txHash: transactionHash,
    blockNumber: latestBlock + 1,
    createdAt: new Date().toISOString(),
    detail,
    nodeId: "node-lpz",
  };
}

function buildActorEvent(
  state: DemoDataState,
  type: BlockchainEvent["type"],
  actor: string,
  detail: string,
  actorRole: Role,
): BlockchainEvent {
  const latestBlock = Math.max(...state.blockchainEvents.map((event) => event.blockNumber));
  const transactionHash = createMockTransaction("0xactor");

  return {
    id: `event-${type}-${state.blockchainEvents.length + 1}-${Date.now()}`,
    type,
    actor,
    actorRole,
    transactionHash,
    txHash: transactionHash,
    blockNumber: latestBlock + 1,
    createdAt: new Date().toISOString(),
    detail,
    nodeId: "node-lpz",
  };
}

function buildNftMintEvent(
  state: DemoDataState,
  certificate: Certificate,
  token: NftAcademicToken,
  actorRole: Role,
): BlockchainEvent {
  const latestBlock = Math.max(...state.blockchainEvents.map((event) => event.blockNumber));

  return {
    id: `event-nft-minted-${token.tokenId}-${Date.now()}`,
    type: "nft_minted",
    actor: certificate.issuerId,
    actorRole,
    certificateId: certificate.id,
    transactionHash: token.transactionHash,
    txHash: token.transactionHash,
    blockNumber: latestBlock + 1,
    createdAt: token.mintedAt,
    detail: `NFT ${token.tokenId} minteado y asociado a ${certificate.code}.`,
    nodeId: "node-lpz",
  };
}

function nextNftTokenId(tokens: NftAcademicToken[]) {
  const highest = tokens.reduce((currentHighest, token) => {
    const match = token.tokenId.match(/(\d+)$/);
    const numericId = match ? Number(match[1]) : 0;

    return Math.max(currentHighest, numericId);
  }, 0);

  return `NFT-ACAD-${String(highest + 1).padStart(4, "0")}`;
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
        : "Certificado encontrado en el ledger simulado.",
    status: certificate.status,
  };
}

const persisted = readStorage<Partial<ExportedAppState> | null>(STORAGE_KEY, null);
const initial = createInitialState();
const persistedParse = persisted ? importedAppStateSchema.safeParse(persisted) : null;
const hydratedInitial: DemoDataState = persistedParse?.success
  ? {
      ...initial,
      ...(persistedParse.data as ExportedAppState),
      wallet: initial.wallet,
    }
  : initial;

export const useAppStore = create<AppStore>((set, get) => ({
  ...hydratedInitial,
  currentRouteId: hydratedInitial.activeRoute,
  sidebarExpanded: false,
  sidebarPinned: false,
  toasts: [],
  setActiveRoute: (routeId) =>
    set((state) => {
      const next = { ...state, activeRoute: routeId, currentRouteId: routeId };
      persistState(next);
      return next;
    }),
  setRoute: (routeId) => get().setActiveRoute(routeId),
  setActiveRole: (role) =>
    set((state) => {
      const next = {
        ...state,
        activeRole: role,
        toasts: [
          ...state.toasts,
          createToast(
            "Rol activo actualizado",
            "La simulacion ajusto permisos y lectura contextual.",
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
  connectWalletMock: () =>
    set((state) => {
      const next = {
        ...state,
        wallet: { ...state.wallet, connected: true, network: state.selectedNetwork },
        toasts: [
          ...state.toasts,
          createToast("Wallet conectada", "Sesion Web3 simulada para la defensa academica.", "success"),
        ],
      };
      persistState(next);
      return next;
    }),
  connectWallet: () => get().connectWalletMock(),
  disconnectWallet: () =>
    set((state) => {
      const next = {
        ...state,
        wallet: { ...state.wallet, connected: false },
        toasts: [
          ...state.toasts,
          createToast("Wallet desconectada", "La demo queda en modo solo lectura.", "info"),
        ],
      };
      persistState(next);
      return next;
    }),
  switchNetwork: (network) =>
    set((state) => {
      const next = {
        ...state,
        selectedNetwork: network,
        wallet: { ...state.wallet, network },
        toasts: [
          ...state.toasts,
          createToast("Red simulada actualizada", `La sesion usa ${network}.`, "info"),
        ],
      };
      persistState(next);
      return next;
    }),
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

    if (!canIssueCertificate(issuer, state.activeRole)) {
      set((current) => ({
        toasts: [
          ...current.toasts,
          createToast("Emision bloqueada", "El rol activo no puede emitir certificados.", "warning"),
        ],
      }));
      return null;
    }

    const student = state.students.find((item) => item.id === input.studentId);

    if (!student || !issuer) {
      return null;
    }

    const nextIndex = state.certificates.length + 1;
    const code = input.code?.trim() || `CERT-2026-${String(nextIndex).padStart(4, "0")}`;
    const parsedIssueDate = input.issueDate ? new Date(input.issueDate) : new Date();
    const createdAt = Number.isNaN(parsedIssueDate.getTime())
      ? new Date().toISOString()
      : parsedIssueDate.toISOString();
    const documentHash = normalizeHash(
      await calculateSha256(`${input.pdfName}-${student.identityDocument}-${createdAt}`),
    );
    const transactionHash = createMockTransaction("0xcertichain");
    const latestBlock = Math.max(...state.certificates.map((certificate) => certificate.blockNumber));
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
      blockNumber: latestBlock + 12,
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

    set((current) => {
      const next = {
        ...current,
        blockchainEvents: [
          buildEvent(current, certificate, "certificate_issued", `Certificado ${code} emitido.`, "authorized_issuer"),
          ...current.blockchainEvents,
        ],
        certificates: [certificate, ...current.certificates],
        selectedCertificateId: certificate.id,
        toasts: [
          ...current.toasts,
          createToast("Emision registrada", `${code} fue anclado en la cadena mock.`, "success"),
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
          createToast("NFT ya asociado", `${certificate.code} ya tiene token ERC-721 mock.`, "info"),
        ],
      }));
      return existingToken;
    }

    if (certificate.status !== "valid") {
      set((current) => ({
        toasts: [
          ...current.toasts,
          createToast("Mint bloqueado", "Solo certificados validos pueden tokenizarse.", "warning"),
        ],
      }));
      return undefined;
    }

    if (!["academic_admin", "authorized_issuer"].includes(state.activeRole)) {
      set((current) => ({
        toasts: [
          ...current.toasts,
          createToast("Mint bloqueado", "El rol activo no puede mintear credenciales academicas.", "warning"),
        ],
      }));
      return undefined;
    }

    const mintedAt = new Date().toISOString();
    const tokenId = nextNftTokenId(state.nftAcademicTokens);
    const transactionHash = createMockTransaction("0xnft");
    const token: NftAcademicToken = {
      id: `nft-academic-token-${String(state.nftAcademicTokens.length + 1).padStart(3, "0")}-${Date.now()}`,
      tokenId,
      certificateId,
      ownerStudentId: certificate.studentId,
      contractAddress: "0x7777777777777777777777777777777777777777",
      metadataUri: `ipfs://certichain-academico/${certificate.id}.json`,
      mintedAt,
      transactionHash,
    };
    const updatedCertificate: Certificate = {
      ...certificate,
      nftTokenId: tokenId,
      updatedAt: mintedAt,
    };

    set((current) => {
      const next = {
        ...current,
        blockchainEvents: [
          buildNftMintEvent(current, updatedCertificate, token, current.activeRole),
          ...current.blockchainEvents,
        ],
        certificates: current.certificates.map((item) =>
          item.id === certificateId ? updatedCertificate : item,
        ),
        nftAcademicTokens: [token, ...current.nftAcademicTokens],
        selectedCertificateId: certificateId,
        toasts: [
          ...current.toasts,
          createToast("NFT academico minteado", `${tokenId} quedo asociado a ${certificate.code}.`, "success"),
        ],
      };
      persistState(next);
      return next;
    });

    return token;
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
  verifyCertificateByPdfMock: async (content) => {
    const hashValue = normalizeHash(await calculateSha256(content));
    return get().verifyCertificateByHash(hashValue);
  },
  revokeCertificate: (certificateId, reason) => {
    const state = get();
    const certificate = state.certificates.find((item) => item.id === certificateId);
    const issuer = state.issuers.find((item) => item.id === certificate?.issuerId);

    if (!certificate || !canRevokeCertificate(issuer, certificate, state.activeRole)) {
      set((current) => ({
        toasts: [
          ...current.toasts,
          createToast("Revocacion bloqueada", "Solo un emisor autorizado puede revocar.", "warning"),
        ],
      }));
      return undefined;
    }

    const revokedAt = new Date().toISOString();
    const transactionHash = createMockTransaction("0xrevoke");
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
      blockNumber: certificate.blockNumber + 7,
    };

    set((current) => {
      const next = {
        ...current,
        blockchainEvents: [
          buildEvent(current, updated, "certificate_revoked", `Certificado ${updated.code} revocado.`, "authorized_issuer"),
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
  authorizeIssuer: (issuerId) => {
    let updated: Issuer | undefined;
    set((state) => {
      if (state.activeRole !== "academic_admin") {
        return {
          toasts: [
            ...state.toasts,
            createToast("Autorizacion bloqueada", "Solo el administrador academico puede activar emisores.", "warning"),
          ],
        };
      }

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
        buildActorEvent(
          state,
          "issuer_authorized",
          updated.id,
          `${updated.name} autorizado como emisor academico.`,
          "academic_admin",
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
  deactivateIssuer: (issuerId) => {
    let updated: Issuer | undefined;
    set((state) => {
      if (state.activeRole !== "academic_admin") {
        return {
          toasts: [
            ...state.toasts,
            createToast("Desactivacion bloqueada", "Solo el administrador academico puede desactivar emisores.", "warning"),
          ],
        };
      }

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
        buildActorEvent(
          state,
          "issuer_deactivated",
          updated.id,
          `${updated.name} desactivado por control administrativo.`,
          "academic_admin",
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
  signStudentReception: (certificateId) => {
    const certificate = get().certificates.find((item) => item.id === certificateId);

    if (!certificate) {
      return undefined;
    }

    if (certificate.receptionSignature) {
      set((state) => ({
        toasts: [
          ...state.toasts,
          createToast("Recepcion ya firmada", "El certificado ya tiene firma de recepcion registrada.", "info"),
        ],
      }));
      return certificate;
    }

    const updated: Certificate = {
      ...certificate,
      receptionSignature: `student-reception-${certificate.studentId}-${Date.now()}`,
      status: certificate.status === "pending_reception" ? "valid" : certificate.status,
      updatedAt: new Date().toISOString(),
    };

    set((state) => {
      const next = {
        ...state,
        blockchainEvents: [
          buildEvent(state, updated, "student_received", `Recepcion firmada para ${updated.code}.`, "student"),
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
  resetDemoData: () =>
    set((state) => {
      const next = {
        ...state,
        ...createInitialState(),
        currentRouteId: "dashboard" as RouteId,
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

      const imported = result.data as ExportedAppState;
      set((state) => {
        const next = {
          ...state,
          ...imported,
          currentRouteId: imported.activeRoute,
          wallet: { ...state.wallet, network: imported.selectedNetwork },
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

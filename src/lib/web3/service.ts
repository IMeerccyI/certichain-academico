import { BrowserProvider, Contract, JsonRpcProvider, formatEther } from "ethers";
import type { NetworkType } from "@/types/domain";
import {
  getDeploymentByChainId,
  getDeploymentByNetwork,
  isDeploymentReady,
  requireDeploymentByChainId,
  requireDeploymentByNetwork,
} from "./deployments";

export type ChainCertificado = {
  codigo: string;
  nombreEstudiante: string;
  carrera: string;
  tipoDocumento: string;
  hashDocumento: string;
  emisor: string;
  fechaEmision: bigint;
  estado: bigint; // 0 Inexistente, 1 Valido, 2 Revocado
  fechaRevocacion: bigint;
  motivoRevocacion: string;
  estudianteWallet: string;
  fechaRecepcion: bigint;
  tokenId: bigint;
};

export type ChainEventoHistorial = {
  tipoEvento: string;
  actor: string;
  fecha: bigint;
  detalle: string;
};

export type ChainEmisor = {
  address: string;
  nombre: string;
  cargo: string;
  activo: boolean;
};

export type ChainTxResult = {
  txHash: string;
  blockNumber: number;
};

export type WalletConnection = {
  address: string;
  chainId: number;
  contractAddress: string;
  isContractReady: boolean;
  isSupportedNetwork: boolean;
  network?: NetworkType;
  balanceEth: number;
};

const CHAIN_IDS: Record<NetworkType, number> = {
  hardhat: 31337,
  ganache: 1337,
  sepolia: 11155111,
};

const FALLBACK_READ_NETWORK: NetworkType = "hardhat";

export const CONTRACT_ADDRESS = getDeploymentByNetwork(FALLBACK_READ_NETWORK)?.address ?? "";
export const CONTRACT_CHAIN_ID = CHAIN_IDS[FALLBACK_READ_NETWORK];

export function networkFromChainId(chainId: number): NetworkType | undefined {
  return getDeploymentByChainId(chainId)?.network;
}

export function hasMetaMask(): boolean {
  return typeof window !== "undefined" && Boolean(resolveMetaMaskProvider());
}

let browserProvider: BrowserProvider | null = null;
let walletEventsCleanup: (() => void) | null = null;
let rpcRequestChain: Promise<unknown> = Promise.resolve();
let walletPopupChain: Promise<unknown> = Promise.resolve();
let suppressChainReconnect = false;
let walletSessionActive = false;

const WALLET_POPUP_METHODS = new Set([
  "eth_requestAccounts",
  "wallet_requestPermissions",
  "wallet_switchEthereumChain",
  "wallet_addEthereumChain",
]);

function sleep(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function enqueueRpcRequest<T>(task: () => Promise<T>): Promise<T> {
  const run = rpcRequestChain.then(task, task);
  rpcRequestChain = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}

function enqueueWalletPopupRequest<T>(task: () => Promise<T>): Promise<T> {
  const run = walletPopupChain.then(task, task);
  walletPopupChain = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}

function isWalletPopupBlockedError(error: unknown) {
  const err = error as { code?: number; message?: string };
  if (err?.code === -32002) {
    return true;
  }

  const message = typeof err?.message === "string" ? err.message.toLowerCase() : "";
  return /pending|already pending|resource unavailable|request already/i.test(message);
}

async function ethereumRequest<T>(method: string, params?: unknown[]): Promise<T> {
  const ethereum = resolveMetaMaskProvider();
  if (!ethereum) {
    throw new Error("MetaMask no esta instalado en este navegador.");
  }

  const request = () => ethereum.request({ method, params }) as Promise<T>;
  if (WALLET_POPUP_METHODS.has(method)) {
    return enqueueWalletPopupRequest(request);
  }
  return enqueueRpcRequest(request);
}

export function setWalletSessionActive(active: boolean) {
  walletSessionActive = active;
  if (!active) {
    resetBrowserProvider();
  }
}

export function isWalletSessionActive() {
  return walletSessionActive;
}

function resolveMetaMaskProvider() {
  if (typeof window === "undefined") {
    return undefined;
  }

  const ethereum = window.ethereum as
    | (typeof window.ethereum & { providers?: Array<typeof window.ethereum> })
    | undefined;

  if (!ethereum) {
    return undefined;
  }

  if (ethereum.isMetaMask) {
    return ethereum;
  }

  if (ethereum.providers?.length) {
    return ethereum.providers.find((provider) => provider?.isMetaMask) ?? undefined;
  }

  return undefined;
}

export function resetBrowserProvider() {
  browserProvider = null;
}

export function bindWalletEvents(handlers: {
  onAccountsChanged?: (accounts: string[]) => void;
  onChainChanged?: (chainId: number) => void;
}) {
  walletEventsCleanup?.();
  walletEventsCleanup = onWalletEvents(handlers);
}

export function unbindWalletEvents() {
  walletEventsCleanup?.();
  walletEventsCleanup = null;
}

function getBrowserProvider(): BrowserProvider {
  const provider = resolveMetaMaskProvider();
  if (!provider) {
    throw new Error("MetaMask no esta instalado en este navegador.");
  }
  if (!browserProvider) {
    browserProvider = new BrowserProvider(provider);
  }
  return browserProvider;
}

/** Lecturas siempre por RPC directo; MetaMask queda solo para firmar y permisos. */
function getReadProvider(network: NetworkType = FALLBACK_READ_NETWORK) {
  const deployment = requireDeploymentByNetwork(network);
  return new JsonRpcProvider(deployment.rpcUrl);
}

function getReadContractForNetwork(network: NetworkType = FALLBACK_READ_NETWORK) {
  const deployment = requireDeploymentByNetwork(network);
  return new Contract(deployment.address, deployment.abi, getReadProvider(network));
}

async function readAuthorizedAccounts(): Promise<string[]> {
  const accounts = await ethereumRequest<string[]>("eth_accounts");
  return Array.isArray(accounts) ? accounts : [];
}

async function requestAuthorizedAccounts(): Promise<string[]> {
  const existing = await readAuthorizedAccounts();
  if (existing.length) {
    return existing;
  }

  const retryDelays = [1200, 2400, 3600];

  for (let attempt = 0; attempt < retryDelays.length; attempt += 1) {
    try {
      const accounts = await ethereumRequest<string[]>("eth_requestAccounts");
      if (!accounts.length) {
        throw new Error("MetaMask no devolvio ninguna cuenta.");
      }
      return accounts;
    } catch (error) {
      if (isWalletPopupBlockedError(error)) {
        await sleep(retryDelays[attempt]);
        const recovered = await readAuthorizedAccounts();
        if (recovered.length) {
          return recovered;
        }
        if (attempt < retryDelays.length - 1) {
          continue;
        }
      }
      throw error;
    }
  }

  throw new Error("MetaMask no devolvio ninguna cuenta.");
}

async function readChainId(): Promise<number> {
  const chainIdHex = await ethereumRequest<string>("eth_chainId");
  return Number(chainIdHex);
}

async function readBalance(address: string): Promise<number> {
  const balanceHex = await ethereumRequest<string>("eth_getBalance", [address, "latest"]);
  return Number(Number(formatEther(BigInt(balanceHex))).toFixed(4));
}

async function readWalletConnection(existingAccounts?: string[]): Promise<WalletConnection> {
  const accounts = existingAccounts ?? (await readAuthorizedAccounts());
  if (!accounts.length) {
    throw new Error("MetaMask no devolvio ninguna cuenta.");
  }
  const address = accounts[0];
  const chainId = await readChainId();
  const deployment = getDeploymentByChainId(chainId);
  const balanceEth = await readBalance(address);

  return {
    address,
    chainId,
    contractAddress: deployment?.address ?? "",
    isContractReady: isDeploymentReady(deployment),
    isSupportedNetwork: Boolean(deployment),
    network: deployment?.network,
    balanceEth,
  };
}

export async function connectMetaMask(): Promise<WalletConnection> {
  resetBrowserProvider();
  const accounts = await requestAuthorizedAccounts();
  return readWalletConnection(accounts);
}

export async function refreshWalletConnection(): Promise<WalletConnection> {
  resetBrowserProvider();
  const accounts = await readAuthorizedAccounts();
  if (!accounts.length) {
    return connectMetaMask();
  }
  return readWalletConnection(accounts);
}

export async function switchToNetwork(target: NetworkType): Promise<void> {
  const chainId = CHAIN_IDS[target];
  const hexChainId = `0x${chainId.toString(16)}`;
  const deployment = getDeploymentByNetwork(target);

  suppressChainReconnect = true;

  try {
    try {
      await ethereumRequest("wallet_switchEthereumChain", [{ chainId: hexChainId }]);
    } catch (error) {
      const code = (error as { code?: number }).code;
      // 4902: la red no existe en MetaMask, hay que agregarla
      if (code === 4902 && target !== "sepolia") {
        await ethereumRequest("wallet_addEthereumChain", [
          {
            chainId: hexChainId,
            chainName: deployment?.chainName ?? (target === "hardhat" ? "Hardhat Local" : "Ganache Local"),
            nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
            rpcUrls: [deployment?.rpcUrl ?? "http://127.0.0.1:8545"],
          },
        ]);
      } else {
        throw error;
      }
    }
  } finally {
    window.setTimeout(() => {
      suppressChainReconnect = false;
    }, 1200);
  }

  resetBrowserProvider();
}

export function shouldSuppressChainReconnect() {
  return suppressChainReconnect;
}

export function onWalletEvents(handlers: {
  onAccountsChanged?: (accounts: string[]) => void;
  onChainChanged?: (chainId: number) => void;
}): () => void {
  const ethereum = resolveMetaMaskProvider();
  if (!ethereum?.on) {
    return () => undefined;
  }
  const accountsHandler = (...args: unknown[]) => {
    handlers.onAccountsChanged?.(args[0] as string[]);
  };
  const chainHandler = (...args: unknown[]) => {
    resetBrowserProvider();
    handlers.onChainChanged?.(Number(args[0] as string));
  };
  ethereum.on("accountsChanged", accountsHandler);
  ethereum.on("chainChanged", chainHandler);

  return () => {
    ethereum.removeListener?.("accountsChanged", accountsHandler);
    ethereum.removeListener?.("chainChanged", chainHandler);
  };
}

async function getWriteContract() {
  if (!walletSessionActive) {
    throw new Error("Conecta MetaMask antes de firmar transacciones.");
  }

  const accounts = await readAuthorizedAccounts();
  if (!accounts.length) {
    throw new Error("Conecta MetaMask antes de firmar transacciones.");
  }

  const provider = getBrowserProvider();
  const chainId = await readChainId();
  const deployment = requireDeploymentByChainId(chainId);
  const signer = await provider.getSigner(accounts[0]);
  return new Contract(deployment.address, deployment.abi, signer);
}

export async function signMessageWithWallet(message: string): Promise<string> {
  if (!walletSessionActive) {
    throw new Error("Conecta MetaMask para firmar.");
  }

  const accounts = await readAuthorizedAccounts();
  if (!accounts.length) {
    throw new Error("Conecta MetaMask para firmar.");
  }

  const provider = getBrowserProvider();
  const signer = await provider.getSigner(accounts[0]);
  return signer.signMessage(message);
}

/** Convierte un hash hex de 64 caracteres a bytes32 con prefijo 0x. */
export function toBytes32Hash(hash: string): string {
  const clean = hash.trim().toLowerCase().replace(/^0x/, "");
  if (!/^[0-9a-f]{64}$/.test(clean)) {
    throw new Error("El hash debe ser SHA-256 hexadecimal de 64 caracteres.");
  }
  return `0x${clean}`;
}

function mapCertificado(raw: Record<string, unknown> & ArrayLike<unknown>): ChainCertificado {
  return {
    codigo: String(raw[0]),
    nombreEstudiante: String(raw[1]),
    carrera: String(raw[2]),
    tipoDocumento: String(raw[3]),
    hashDocumento: String(raw[4]),
    emisor: String(raw[5]),
    fechaEmision: BigInt(raw[6] as bigint),
    estado: BigInt(raw[7] as bigint),
    fechaRevocacion: BigInt(raw[8] as bigint),
    motivoRevocacion: String(raw[9]),
    estudianteWallet: String(raw[10]),
    fechaRecepcion: BigInt(raw[11] as bigint),
    tokenId: BigInt(raw[12] as bigint),
  };
}

// ---------------------------------------------------------------------------
// RF1. Emision
// ---------------------------------------------------------------------------

export async function emitirCertificadoOnChain(input: {
  codigo: string;
  nombreEstudiante: string;
  carrera: string;
  tipoDocumento: string;
  hashDocumento: string;
  estudianteWallet?: string;
  metadataURI?: string;
}): Promise<ChainTxResult & { tokenId: number }> {
  const contrato = await getWriteContract();
  const tx = await contrato.emitirCertificado(
    input.codigo,
    input.nombreEstudiante,
    input.carrera,
    input.tipoDocumento,
    toBytes32Hash(input.hashDocumento),
    input.estudianteWallet || "0x0000000000000000000000000000000000000000",
    input.metadataURI ?? "",
  );
  const receipt = await tx.wait();

  let tokenId = 0;
  for (const log of receipt.logs) {
    try {
      const parsed = contrato.interface.parseLog(log);
      if (parsed?.name === "CertificadoEmitido") {
        tokenId = Number(parsed.args.tokenId);
      }
    } catch {
      // log de otra interfaz (ERC721 Transfer), ignorar
    }
  }

  return { txHash: receipt.hash, blockNumber: receipt.blockNumber, tokenId };
}

// ---------------------------------------------------------------------------
// RF2. Verificacion
// ---------------------------------------------------------------------------

export async function verificarCertificadoOnChain(
  hashDocumento: string,
  network: NetworkType = FALLBACK_READ_NETWORK,
): Promise<{
  valido: boolean;
  existe: boolean;
  codigo: string;
  datos: ChainCertificado | null;
}> {
  const contrato = getReadContractForNetwork(network);
  const [valido, existe, codigo, datos] = await contrato.verificarCertificado(
    toBytes32Hash(hashDocumento),
  );

  return {
    valido: Boolean(valido),
    existe: Boolean(existe),
    codigo: String(codigo),
    datos: existe ? mapCertificado(datos) : null,
  };
}

export async function consultarPorCodigoOnChain(
  codigo: string,
  network: NetworkType = FALLBACK_READ_NETWORK,
): Promise<ChainCertificado | null> {
  const contrato = getReadContractForNetwork(network);
  const [existe, datos] = await contrato.consultarPorCodigo(codigo);
  return existe ? mapCertificado(datos) : null;
}

// ---------------------------------------------------------------------------
// RF3. Revocacion
// ---------------------------------------------------------------------------

export async function revocarCertificadoOnChain(
  codigo: string,
  motivo: string,
): Promise<ChainTxResult> {
  const contrato = await getWriteContract();
  const tx = await contrato.revocarCertificado(codigo, motivo);
  const receipt = await tx.wait();
  return { txHash: receipt.hash, blockNumber: receipt.blockNumber };
}

// ---------------------------------------------------------------------------
// RF4. Historial
// ---------------------------------------------------------------------------

export async function consultarHistorialOnChain(
  codigo: string,
  network: NetworkType = FALLBACK_READ_NETWORK,
): Promise<ChainEventoHistorial[]> {
  const contrato = getReadContractForNetwork(network);
  const eventos = (await contrato.consultarHistorial(codigo)) as ArrayLike<unknown>[];
  return Array.from(eventos).map((evento) => {
    const raw = evento as ArrayLike<unknown>;
    return {
      tipoEvento: String(raw[0]),
      actor: String(raw[1]),
      fecha: BigInt(raw[2] as bigint),
      detalle: String(raw[3]),
    };
  });
}

export async function listarCertificadosOnChain(
  network: NetworkType = FALLBACK_READ_NETWORK,
  desde = 0,
  cantidad = 200,
): Promise<ChainCertificado[]> {
  const contrato = getReadContractForNetwork(network);
  const lote = (await contrato.listarCertificados(desde, cantidad)) as ArrayLike<unknown>[];
  return Array.from(lote).map((item) =>
    mapCertificado(item as Record<string, unknown> & ArrayLike<unknown>),
  );
}

// ---------------------------------------------------------------------------
// RF5. Emisores
// ---------------------------------------------------------------------------

export async function autorizarEmisorOnChain(
  emisor: string,
  nombre: string,
  cargo: string,
): Promise<ChainTxResult> {
  const contrato = await getWriteContract();
  const tx = await contrato.autorizarEmisor(emisor, nombre, cargo);
  const receipt = await tx.wait();
  return { txHash: receipt.hash, blockNumber: receipt.blockNumber };
}

export async function desactivarEmisorOnChain(emisor: string): Promise<ChainTxResult> {
  const contrato = await getWriteContract();
  const tx = await contrato.desactivarEmisor(emisor);
  const receipt = await tx.wait();
  return { txHash: receipt.hash, blockNumber: receipt.blockNumber };
}

export async function listarEmisoresOnChain(
  network: NetworkType = FALLBACK_READ_NETWORK,
): Promise<ChainEmisor[]> {
  const contrato = getReadContractForNetwork(network);
  const [direcciones, nombres, cargos, activos] = await contrato.listarEmisores();
  return Array.from(direcciones as string[]).map((address, index) => ({
    address,
    nombre: String((nombres as string[])[index]),
    cargo: String((cargos as string[])[index]),
    activo: Boolean((activos as boolean[])[index]),
  }));
}

export async function esEmisorAutorizadoOnChain(
  cuenta: string,
  network: NetworkType = FALLBACK_READ_NETWORK,
): Promise<boolean> {
  const contrato = getReadContractForNetwork(network);
  return Boolean(await contrato.esEmisorAutorizado(cuenta));
}

// ---------------------------------------------------------------------------
// Recepcion del estudiante
// ---------------------------------------------------------------------------

export async function firmarRecepcionOnChain(codigo: string): Promise<ChainTxResult> {
  const contrato = await getWriteContract();
  const tx = await contrato.firmarRecepcion(codigo);
  const receipt = await tx.wait();
  return { txHash: receipt.hash, blockNumber: receipt.blockNumber };
}

export async function verificarYRegistrarOnChain(hashDocumento: string): Promise<
  ChainTxResult & { valido: boolean }
> {
  const contrato = await getWriteContract();
  const tx = await contrato.verificarYRegistrar(toBytes32Hash(hashDocumento));
  const receipt = await tx.wait();

  let valido = false;
  for (const log of receipt.logs) {
    try {
      const parsed = contrato.interface.parseLog(log);
      if (parsed?.name === "CertificadoVerificado") {
        valido = Boolean(parsed.args.valido);
      }
    } catch {
      // log ajeno, ignorar
    }
  }
  return { txHash: receipt.hash, blockNumber: receipt.blockNumber, valido };
}

export function extraerMensajeError(error: unknown): string {
  const err = error as { reason?: string; shortMessage?: string; message?: string; code?: unknown };

  if (err?.code === 4001) {
    return "Solicitud rechazada en MetaMask.";
  }

  if (err?.code === -32002 || isWalletPopupBlockedError(error)) {
    return "MetaMask tiene una ventana bloqueada. Cierra otras pestanas de esta app, abre la extension y confirma la solicitud visible.";
  }

  if (err?.code === 4902) {
    return "La red seleccionada no existe en MetaMask. Agregala o cambia a Hardhat local.";
  }

  const rawMessage = [err?.reason, err?.shortMessage, err?.message]
    .filter((value): value is string => typeof value === "string")
    .join(" ");

  if (/coalesce/i.test(rawMessage)) {
    return "MetaMask bloqueo una solicitud RPC. Cierra popups pendientes en la extension e intenta de nuevo.";
  }

  if (err?.reason) return err.reason;
  if (err?.shortMessage) return err.shortMessage;
  if (typeof err?.message === "string") {
    return err.message.length > 160 ? `${err.message.slice(0, 160)}...` : err.message;
  }
  return "Error desconocido al interactuar con la blockchain.";
}

import type { NetworkType } from "@/types/domain";

export const academicContractAddress = "0xAcaD3E71b8F6cD0fA59244cA2D7f8E9c12B0C4";

export type MockNetworkConfig = {
  blockTime: string;
  chainId: number;
  contractDeployed: boolean;
  estimatedGas: string;
  explorerLabel: string;
  label: string;
  rpcUrl: string;
};

export const mockNetworkConfigs: Record<NetworkType, MockNetworkConfig> = {
  ganache: {
    blockTime: "1.1 s",
    chainId: 1337,
    contractDeployed: true,
    estimatedGas: "0.0018 ETH",
    explorerLabel: "Ganache CLI",
    label: "Ganache local",
    rpcUrl: "http://127.0.0.1:7545",
  },
  hardhat: {
    blockTime: "0.8 s",
    chainId: 31337,
    contractDeployed: true,
    estimatedGas: "0.0013 ETH",
    explorerLabel: "Hardhat node",
    label: "Hardhat local",
    rpcUrl: "http://127.0.0.1:8545",
  },
  sepolia: {
    blockTime: "12 s",
    chainId: 11155111,
    contractDeployed: true,
    estimatedGas: "0.0064 ETH",
    explorerLabel: "Sepolia explorer",
    label: "Sepolia Testnet",
    rpcUrl: "https://rpc.sepolia.org",
  },
};

export const mockContractMethods = [
  {
    gas: "82k",
    name: "emitirCertificado()",
    signature: "emitirCertificado(bytes32,address,string)",
  },
  {
    gas: "31k",
    name: "verificarCertificado()",
    signature: "verificarCertificado(bytes32)",
  },
  {
    gas: "54k",
    name: "revocarCertificado()",
    signature: "revocarCertificado(bytes32,string)",
  },
  {
    gas: "28k",
    name: "consultarHistorial()",
    signature: "consultarHistorial(bytes32)",
  },
  {
    gas: "46k",
    name: "autorizarEmisor()",
    signature: "autorizarEmisor(address,string)",
  },
  {
    gas: "44k",
    name: "desactivarEmisor()",
    signature: "desactivarEmisor(address)",
  },
];

export const mockAbiSummary = [
  {
    inputs: ["bytes32 documentHash", "address student", "string metadataUri"],
    name: "emitirCertificado",
    outputs: ["uint256 certificateId"],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: ["bytes32 documentHash"],
    name: "verificarCertificado",
    outputs: ["bool valid", "uint8 status"],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: ["bytes32 documentHash", "string reason"],
    name: "revocarCertificado",
    outputs: ["bool revoked"],
    stateMutability: "nonpayable",
    type: "function",
  },
];

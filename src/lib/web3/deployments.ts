import type { NetworkType } from "@/types/domain";
import contractInfo from "./contract-info.json";
import deploymentRegistry from "./deployments.json";

export type DeploymentInfo = {
  address: string;
  blockExplorerUrl: string;
  chainId: number;
  chainName: string;
  deployedAt: string;
  deployer: string;
  network: NetworkType;
  rpcUrl: string;
};

export type RuntimeDeployment = DeploymentInfo & {
  abi: typeof contractInfo.abi;
  contractName: typeof contractInfo.contractName;
};

const deployments = deploymentRegistry as Record<NetworkType, DeploymentInfo>;

export const SUPPORTED_CHAIN_IDS = Object.values(deployments).map((deployment) => deployment.chainId);

export function getDeploymentByNetwork(network: NetworkType): RuntimeDeployment | undefined {
  const deployment = deployments[network];
  if (!deployment) return undefined;

  return {
    ...deployment,
    abi: contractInfo.abi,
    contractName: contractInfo.contractName,
  };
}

export function getDeploymentByChainId(chainId: number): RuntimeDeployment | undefined {
  const deployment = Object.values(deployments).find((item) => item.chainId === chainId);
  if (!deployment) return undefined;
  return getDeploymentByNetwork(deployment.network);
}

export function isSupportedChainId(chainId: number): boolean {
  return Boolean(getDeploymentByChainId(chainId));
}

export function isDeploymentReady(deployment: RuntimeDeployment | undefined): deployment is RuntimeDeployment {
  return Boolean(deployment?.address && /^0x[a-fA-F0-9]{40}$/.test(deployment.address));
}

export function requireDeploymentByNetwork(network: NetworkType): RuntimeDeployment {
  const deployment = getDeploymentByNetwork(network);
  if (!isDeploymentReady(deployment)) {
    throw new Error(`El contrato no esta desplegado para la red ${network}.`);
  }
  return deployment;
}

export function requireDeploymentByChainId(chainId: number): RuntimeDeployment {
  const deployment = getDeploymentByChainId(chainId);
  if (!isDeploymentReady(deployment)) {
    throw new Error(`Red no soportada o contrato no desplegado para chainId ${chainId}.`);
  }
  return deployment;
}

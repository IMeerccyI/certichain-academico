import { certificates, chainNodes, ledgerEvents } from "@/data/mock-data";

export function getMockChainHealth() {
  const syncedNodes = chainNodes.filter((node) => node.status === "synced").length;
  const latestBlock = Math.max(...certificates.map((certificate) => certificate.blockNumber));

  return {
    latestBlock,
    syncedNodes,
    totalNodes: chainNodes.length,
    consensusLabel: `${syncedNodes}/${chainNodes.length}`,
    lastEvent: ledgerEvents[0],
  };
}

export function createMockTransaction(prefix = "0xcertichain") {
  const entropy = `${prefix}-${Date.now()}-${Math.random()}`;
  let hash = 0;

  for (let index = 0; index < entropy.length; index += 1) {
    hash = (hash << 5) - hash + entropy.charCodeAt(index);
    hash |= 0;
  }

  return `${prefix}${Math.abs(hash).toString(16).padStart(16, "0")}`;
}

import { describe, expect, it } from "vitest";
import {
  getDeploymentByChainId,
  getDeploymentByNetwork,
  isSupportedChainId,
} from "@/lib/web3/deployments";
import { networkFromChainId } from "@/lib/web3/service";

describe("web3 deployment registry", () => {
  it("resolves configured local and testnet deployments by network and chain id", () => {
    expect(getDeploymentByNetwork("hardhat")?.chainId).toBe(31337);
    expect(getDeploymentByNetwork("ganache")?.chainId).toBe(1337);
    expect(getDeploymentByNetwork("sepolia")?.chainId).toBe(11155111);

    expect(getDeploymentByChainId(31337)?.network).toBe("hardhat");
    expect(getDeploymentByChainId(1337)?.network).toBe("ganache");
    expect(getDeploymentByChainId(11155111)?.network).toBe("sepolia");
  });

  it("reports unsupported chain ids without falling back to hardhat", () => {
    expect(isSupportedChainId(1)).toBe(false);
    expect(getDeploymentByChainId(1)).toBeUndefined();
    expect(networkFromChainId(1)).toBeUndefined();
  });
});

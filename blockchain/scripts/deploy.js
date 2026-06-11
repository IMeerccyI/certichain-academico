const { ethers, network, artifacts } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log(`Red: ${network.name}`);
  console.log(`Deployer (admin academico): ${deployer.address}`);

  const Factory = await ethers.getContractFactory("CertificadoAcademico");
  const contrato = await Factory.deploy();
  await contrato.waitForDeployment();

  const address = await contrato.getAddress();
  console.log(`CertificadoAcademico desplegado en: ${address}`);

  // Exportar ABI + direccion al frontend
  const artifact = await artifacts.readArtifact("CertificadoAcademico");
  const outDir = path.join(__dirname, "..", "..", "src", "lib", "web3");
  fs.mkdirSync(outDir, { recursive: true });

  const chainId =
    network.config.chainId ?? (await ethers.provider.getNetwork()).chainId;
  const numericChainId = Number(chainId);
  const networkKey =
    numericChainId === 31337
      ? "hardhat"
      : numericChainId === 1337
        ? "ganache"
        : numericChainId === 11155111
          ? "sepolia"
          : network.name;

  const info = {
    contractName: "CertificadoAcademico",
    network: networkKey,
    chainId: numericChainId,
    address,
    deployer: deployer.address,
    deployedAt: new Date().toISOString(),
    abi: artifact.abi,
  };

  fs.writeFileSync(
    path.join(outDir, "contract-info.json"),
    JSON.stringify(info, null, 2)
  );

  const deploymentsPath = path.join(outDir, "deployments.json");
  const currentDeployments = fs.existsSync(deploymentsPath)
    ? JSON.parse(fs.readFileSync(deploymentsPath, "utf8"))
    : {};
  const defaults = {
    hardhat: {
      network: "hardhat",
      chainId: 31337,
      chainName: "Hardhat Local",
      rpcUrl: "http://127.0.0.1:8545",
      blockExplorerUrl: "",
      address: "",
      deployer: "",
      deployedAt: "",
    },
    ganache: {
      network: "ganache",
      chainId: 1337,
      chainName: "Ganache Local",
      rpcUrl: "http://127.0.0.1:7545",
      blockExplorerUrl: "",
      address: "",
      deployer: "",
      deployedAt: "",
    },
    sepolia: {
      network: "sepolia",
      chainId: 11155111,
      chainName: "Sepolia Testnet",
      rpcUrl: "",
      blockExplorerUrl: "https://sepolia.etherscan.io",
      address: "",
      deployer: "",
      deployedAt: "",
    },
  };
  const previousNetwork = currentDeployments[networkKey] ?? defaults[networkKey] ?? {};
  const nextDeployments = {
    ...defaults,
    ...currentDeployments,
    [networkKey]: {
      ...previousNetwork,
      network: networkKey,
      chainId: numericChainId,
      address,
      deployer: deployer.address,
      deployedAt: info.deployedAt,
    },
  };
  fs.writeFileSync(deploymentsPath, JSON.stringify(nextDeployments, null, 2));
  console.log(`ABI exportada a src/lib/web3/contract-info.json`);
  console.log(`Deployment ${networkKey} actualizado en src/lib/web3/deployments.json`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

require("@nomicfoundation/hardhat-toolbox");

/**
 * Redes soportadas:
 *  - hardhat:   red en memoria para tests
 *  - localhost: nodo local (npx hardhat node) en http://127.0.0.1:8545, chainId 31337
 *  - ganache:   nodo local Ganache en http://127.0.0.1:7545, chainId 1337
 *  - sepolia:   testnet publica de Ethereum (requiere SEPOLIA_RPC_URL y PRIVATE_KEY)
 */
const SEPOLIA_RPC_URL = process.env.SEPOLIA_RPC_URL || "";
const PRIVATE_KEY = process.env.PRIVATE_KEY || "";

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    version: "0.8.28",
    settings: {
      optimizer: { enabled: true, runs: 200 },
      evmVersion: "cancun",
      viaIR: true,
    },
  },
  networks: {
    localhost: {
      url: "http://127.0.0.1:8545",
      chainId: 31337,
    },
    ganache: {
      url: "http://127.0.0.1:7545",
      chainId: 1337,
    },
    ...(SEPOLIA_RPC_URL && PRIVATE_KEY
      ? {
          sepolia: {
            url: SEPOLIA_RPC_URL,
            accounts: [PRIVATE_KEY],
            chainId: 11155111,
          },
        }
      : {}),
  },
};

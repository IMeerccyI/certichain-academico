import type { AnalyticsSnapshot, DistributedNode } from "@/types/domain";

export const monthlyActivity: AnalyticsSnapshot[] = [
  { label: "Ene", issued: 120, verified: 310, revoked: 2, manipulated: 4, gasCostUsd: 181.2 },
  { label: "Feb", issued: 148, verified: 388, revoked: 3, manipulated: 5, gasCostUsd: 204.4 },
  { label: "Mar", issued: 165, verified: 451, revoked: 4, manipulated: 7, gasCostUsd: 239.8 },
  { label: "Abr", issued: 153, verified: 492, revoked: 6, manipulated: 8, gasCostUsd: 228.1 },
  { label: "May", issued: 211, verified: 640, revoked: 5, manipulated: 11, gasCostUsd: 301.7 },
  { label: "Jun", issued: 186, verified: 589, revoked: 3, manipulated: 9, gasCostUsd: 266.5 },
  { label: "Jul", issued: 224, verified: 711, revoked: 5, manipulated: 10, gasCostUsd: 332.9 },
  { label: "Ago", issued: 238, verified: 760, revoked: 4, manipulated: 8, gasCostUsd: 350.1 },
  { label: "Sep", issued: 254, verified: 805, revoked: 6, manipulated: 12, gasCostUsd: 376.4 },
  { label: "Oct", issued: 271, verified: 842, revoked: 4, manipulated: 7, gasCostUsd: 389.6 },
  { label: "Nov", issued: 293, verified: 910, revoked: 5, manipulated: 8, gasCostUsd: 421.9 },
  { label: "Dic", issued: 318, verified: 980, revoked: 7, manipulated: 13, gasCostUsd: 452.1 },
];

export const chainNodes: DistributedNode[] = [
  {
    id: "node-lpz",
    label: "Nodo La Paz",
    location: "UMSA",
    network: "sepolia",
    status: "synced",
    latencyMs: 42,
    latestBlock: 7433928,
  },
  {
    id: "node-cbb",
    label: "Nodo Cochabamba",
    location: "UMSS",
    network: "sepolia",
    status: "synced",
    latencyMs: 58,
    latestBlock: 7433926,
  },
  {
    id: "node-scz",
    label: "Nodo Santa Cruz",
    location: "UAGRM",
    network: "hardhat",
    status: "lagging",
    latencyMs: 128,
    latestBlock: 7433909,
  },
  {
    id: "node-oru",
    label: "Nodo Oruro",
    location: "UTO",
    network: "ganache",
    status: "synced",
    latencyMs: 51,
    latestBlock: 7433928,
  },
];

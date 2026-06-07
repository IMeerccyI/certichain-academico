import type { AnalyticsPoint, ChainNode } from "@/types/domain";

export const monthlyActivity: AnalyticsPoint[] = [
  { label: "Ene", issued: 120, verified: 310, revoked: 2 },
  { label: "Feb", issued: 148, verified: 388, revoked: 3 },
  { label: "Mar", issued: 165, verified: 451, revoked: 4 },
  { label: "Abr", issued: 153, verified: 492, revoked: 6 },
  { label: "May", issued: 211, verified: 640, revoked: 5 },
  { label: "Jun", issued: 86, verified: 289, revoked: 1 },
];

export const chainNodes: ChainNode[] = [
  {
    id: "node-lpz",
    label: "Nodo La Paz",
    location: "UMSA",
    status: "synced",
    latencyMs: 42,
  },
  {
    id: "node-cbb",
    label: "Nodo Cochabamba",
    location: "UMSS",
    status: "synced",
    latencyMs: 58,
  },
  {
    id: "node-scz",
    label: "Nodo Santa Cruz",
    location: "UAGRM",
    status: "lagging",
    latencyMs: 128,
  },
  {
    id: "node-oru",
    label: "Nodo Oruro",
    location: "UTO",
    status: "synced",
    latencyMs: 51,
  },
];

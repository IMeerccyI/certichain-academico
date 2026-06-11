import {
  BarChart3,
  BookOpenCheck,
  FileCheck2,
  FileSignature,
  GraduationCap,
  History,
  KeyRound,
  LayoutDashboard,
  PlugZap,
  RotateCcw,
  ScrollText,
  Settings,
  ShieldCheck,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

export type AppRoute = {
  id:
    | "dashboard"
    | "web3"
    | "issue"
    | "certificates"
    | "verification"
    | "revocation"
    | "issuers"
    | "students"
    | "ledger"
    | "audit"
    | "analytics"
    | "nft"
    | "settings";
  title: string;
  shortTitle: string;
  description: string;
  icon: LucideIcon;
};

export const routes = [
  {
    id: "dashboard",
    title: "Panel de control",
    shortTitle: "Dashboard",
    description: "Estado operativo de emision, verificacion y red Ethereum.",
    icon: LayoutDashboard,
  },
  {
    id: "web3",
    title: "Conexion Web3",
    shortTitle: "Web3",
    description: "Estado de wallet, contrato inteligente y red Ethereum.",
    icon: PlugZap,
  },
  {
    id: "issue",
    title: "Emitir Certificado",
    shortTitle: "Emitir",
    description: "Flujo de PDF, hash SHA-256, firma institucional y anclaje on-chain.",
    icon: FileSignature,
  },
  {
    id: "verification",
    title: "Verificacion Publica",
    shortTitle: "Verificar",
    description: "Consulta publica por hash y transaccion.",
    icon: ShieldCheck,
  },
  {
    id: "certificates",
    title: "Certificados",
    shortTitle: "Certificados",
    description: "Registro de PDF, hash SHA-256 y firma institucional.",
    icon: FileCheck2,
  },
  {
    id: "revocation",
    title: "Revocacion",
    shortTitle: "Revocar",
    description: "Correcciones administrativas con historial permanente.",
    icon: RotateCcw,
  },
  {
    id: "issuers",
    title: "Emisores",
    shortTitle: "Emisores",
    description: "Universidades autorizadas para firmar certificados.",
    icon: KeyRound,
  },
  {
    id: "students",
    title: "Estudiantes",
    shortTitle: "Estudiantes",
    description: "Identidad academica y recepcion firmada.",
    icon: GraduationCap,
  },
  {
    id: "ledger",
    title: "Ledger Blockchain",
    shortTitle: "Ledger",
    description: "Eventos distribuidos entre nodos academicos.",
    icon: ScrollText,
  },
  {
    id: "audit",
    title: "Auditoria Distribuida",
    shortTitle: "Auditoria",
    description: "Trazabilidad de acciones y evidencia criptografica.",
    icon: History,
  },
  {
    id: "analytics",
    title: "Analitica",
    shortTitle: "Analitica",
    description: "Metricas operativas de certificados y verificaciones.",
    icon: BarChart3,
  },
  {
    id: "nft",
    title: "NFT Academico",
    shortTitle: "NFT",
    description: "Extension ERC-721 para certificados academicos.",
    icon: BookOpenCheck,
  },
  {
    id: "settings",
    title: "Configuracion",
    shortTitle: "Ajustes",
    description: "Preferencias locales de red, MetaMask y accesibilidad.",
    icon: Settings,
  },
] as const satisfies readonly AppRoute[];

export type RouteId = (typeof routes)[number]["id"];

export function getRouteById(routeId: RouteId) {
  return routes.find((route) => route.id === routeId) ?? routes[0];
}

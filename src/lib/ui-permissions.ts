import type { RouteId } from "@/app/routes";
import type { Role } from "@/types/domain";
import { DEFAULT_ROUTE_BY_ROLE, isRouteAllowedForRole } from "@/lib/roles";

export function canNavigateToRoute(role: Role, routeId: RouteId): boolean {
  return isRouteAllowedForRole(routeId, role);
}

export function canShowIssueActions(role: Role): boolean {
  return role === "academic_admin" || role === "authorized_issuer";
}

export function canShowRevokeActions(role: Role): boolean {
  return role === "academic_admin" || role === "authorized_issuer";
}

export function canShowMintNft(role: Role): boolean {
  return role === "academic_admin" || role === "authorized_issuer";
}

export function canManageIssuers(role: Role): boolean {
  return role === "academic_admin";
}

export function canSignStudentReception(role: Role): boolean {
  return role === "student";
}

export function canControlNftTransfer(role: Role): boolean {
  return role === "academic_admin";
}

export function suggestedActionRoute(role: Role): RouteId {
  if (canShowIssueActions(role) && canNavigateToRoute(role, "issue")) {
    return "issue";
  }

  if (canNavigateToRoute(role, "verification")) {
    return "verification";
  }

  return DEFAULT_ROUTE_BY_ROLE[role];
}
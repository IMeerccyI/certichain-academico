import { useRef } from "react";
import type { ComponentType, CSSProperties } from "react";
import { useGSAP } from "@gsap/react";
import { gsap } from "gsap";
import { MobileNav } from "@/components/layout/mobile-nav";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import { RouteTransitionBoundary } from "@/components/motion";
import { AnalyticsPage } from "@/features/analytics/AnalyticsPage";
import { AuditPage } from "@/features/audit/AuditPage";
import { CertificatesPage } from "@/features/certificates/CertificatesPage";
import { DashboardPage } from "@/features/dashboard/DashboardPage";
import { IssuersPage } from "@/features/issuers/IssuersPage";
import { IssueCertificatePage } from "@/features/issue/IssueCertificatePage";
import { LedgerPage } from "@/features/ledger/LedgerPage";
import { NftPage } from "@/features/nft/NftPage";
import { RevocationPage } from "@/features/revocation/RevocationPage";
import { SettingsPage } from "@/features/settings/SettingsPage";
import { StudentsPage } from "@/features/students/StudentsPage";
import { VerificationPage } from "@/features/verification/VerificationPage";
import { Web3StatusPage } from "@/features/web3/Web3StatusPage";
import type { RouteId } from "@/app/routes";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { setMotionCompleteState, shouldSkipMotion } from "@/lib/motion";
import { useAppStore } from "@/store/app-store";

const routeComponents: Record<RouteId, ComponentType> = {
  dashboard: DashboardPage,
  web3: Web3StatusPage,
  issue: IssueCertificatePage,
  verification: VerificationPage,
  certificates: CertificatesPage,
  revocation: RevocationPage,
  issuers: IssuersPage,
  students: StudentsPage,
  ledger: LedgerPage,
  audit: AuditPage,
  analytics: AnalyticsPage,
  nft: NftPage,
  settings: SettingsPage,
};

export function AppShell() {
  const currentRouteId = useAppStore((state) => state.currentRouteId);
  const sidebarExpanded = useAppStore((state) => state.sidebarExpanded);
  const ActiveRoute = routeComponents[currentRouteId];
  const shellRef = useRef<HTMLDivElement>(null);
  const reducedMotion = useReducedMotion();
  const shellStyle = {
    "--sidebar-width": sidebarExpanded ? "13.75rem" : "4rem",
  } as CSSProperties;

  useGSAP(
    () => {
      const motionTargets = "[data-shell-sidebar], [data-shell-topbar], [data-layout-reveal]";

      if (!shellRef.current) {
        return;
      }

      if (shouldSkipMotion(reducedMotion)) {
        setMotionCompleteState(motionTargets);
        return;
      }

      const timeline = gsap.timeline({ defaults: { duration: 0.34, ease: "power2.out" } });

      timeline
        .from("[data-shell-sidebar]", {
          autoAlpha: 0,
          clearProps: "transform,visibility,opacity",
          immediateRender: false,
          x: -14,
        })
        .from(
          "[data-shell-topbar]",
          {
            autoAlpha: 0,
            clearProps: "transform,visibility,opacity",
            immediateRender: false,
            y: -10,
          },
          "<0.05",
        )
        .from(
          "[data-layout-reveal]",
          {
            autoAlpha: 0,
            clearProps: "transform,visibility,opacity",
            immediateRender: false,
            y: 12,
            stagger: 0.055,
          },
          "-=0.12",
        );

      return () => {
        setMotionCompleteState(motionTargets);
      };
    },
    { dependencies: [reducedMotion], scope: shellRef },
  );

  return (
    <div
      className="min-h-screen bg-background text-foreground lg:grid lg:grid-cols-[var(--sidebar-width)_minmax(0,1fr)] lg:transition-[grid-template-columns] lg:duration-300 lg:ease-out"
      ref={shellRef}
      style={shellStyle}
    >
      <Sidebar />
      <div className="min-w-0 bg-background pb-24 lg:pb-0">
        <div data-shell-topbar>
          <Topbar />
        </div>
        <div className="mx-auto w-full max-w-[112rem] px-3 py-3 md:px-4 lg:px-4 2xl:px-5">
          <RouteTransitionBoundary
            as="main"
            className="min-w-0"
            data-layout-reveal
            routeKey={currentRouteId}
          >
            <ActiveRoute />
          </RouteTransitionBoundary>
        </div>
      </div>
      <MobileNav />
    </div>
  );
}

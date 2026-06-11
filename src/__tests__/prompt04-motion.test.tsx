import { act, render, screen } from "@testing-library/react";
import { describe, expect, it, beforeEach } from "vitest";
import {
  AnimatedNumber,
  MotionCard,
  MotionPage,
  RouteTransitionBoundary,
} from "@/components/motion";
import { useCountUpMetric } from "@/hooks/useCountUpMetric";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { useStaggeredCards } from "@/hooks/useStaggeredCards";
import { motionPresets } from "@/lib/motion";
import { useAppStore } from "@/store/app-store";

function ReducedMotionProbe() {
  const reducedMotion = useReducedMotion();

  return <span data-testid="reduced-motion">{String(reducedMotion)}</span>;
}

function CountUpProbe() {
  const value = useCountUpMetric(128, { duration: 0.01 });

  return <span data-testid="count-up">{value}</span>;
}

function StaggerProbe() {
  const ref = useStaggeredCards<HTMLDivElement>();

  return (
    <div ref={ref}>
      <article data-motion-card>Uno</article>
      <article data-motion-card>Dos</article>
    </div>
  );
}

describe("GSAP motion system", () => {
  beforeEach(() => {
    window.localStorage.clear();
    useAppStore.getState().resetDemoData();
  });

  it("exposes the required animation preset names", () => {
    expect(Object.keys(motionPresets).sort()).toEqual(
      [
        "blockchainPulse",
        "cardReveal",
        "hashCalculation",
        "invalidShake",
        "listStagger",
        "metricCount",
        "modalIn",
        "modalOut",
        "pageEnter",
        "pageExit",
        "successSeal",
        "toastIn",
        "toastOut",
        "transactionConfirm",
      ].sort(),
    );
  });

  it("renders the reusable motion components with stable data hooks", () => {
    render(
      <RouteTransitionBoundary routeKey="dashboard">
        <MotionPage data-testid="motion-page">
          <MotionCard data-testid="motion-card">
            <AnimatedNumber value={452} suffix=" tx" />
          </MotionCard>
        </MotionPage>
      </RouteTransitionBoundary>,
    );

    expect(screen.getByTestId("motion-page")).toHaveAttribute("data-motion-page");
    expect(screen.getByTestId("motion-card")).toHaveAttribute("data-motion-card");
    expect(screen.getByText(/452 tx/i)).toBeInTheDocument();
  });

  it("lets AppSettings disable motion in addition to system reduced motion", () => {
    render(<ReducedMotionProbe />);

    expect(screen.getByTestId("reduced-motion")).toHaveTextContent("false");

    act(() => {
      useAppStore.getState().updateSettings({ reducedMotion: true });
    });

    expect(screen.getByTestId("reduced-motion")).toHaveTextContent("true");
  });

  it("provides hooks for staggered cards and animated metrics", () => {
    render(
      <>
        <CountUpProbe />
        <StaggerProbe />
      </>,
    );

    expect(screen.getByTestId("count-up")).toHaveTextContent("128");
    expect(screen.getByText("Uno")).toHaveAttribute("data-motion-card");
    expect(screen.getByText("Dos")).toHaveAttribute("data-motion-card");
  });
});

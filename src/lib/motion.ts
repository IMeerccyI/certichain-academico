import { useGSAP } from "@gsap/react";
import { gsap } from "gsap";

type TweenTarget = Parameters<typeof gsap.to>[0];

export const motionSelectors = {
  cards: "[data-motion-card]",
  page: "[data-motion-page]",
  sections: "[data-motion-section], [data-reveal]",
  timelineItems: "[data-motion-timeline-item]",
} as const;

export const motionPresets = {
  pageEnter: {
    from: { autoAlpha: 0, y: 12, scale: 0.992 },
    to: { autoAlpha: 1, y: 0, scale: 1, duration: 0.34, ease: "power2.out" },
  },
  pageExit: {
    to: { autoAlpha: 0, y: -8, scale: 0.996, duration: 0.18, ease: "power1.in" },
  },
  cardReveal: {
    from: { autoAlpha: 0, y: 16, scale: 0.985 },
    to: { autoAlpha: 1, y: 0, scale: 1, duration: 0.5, ease: "power2.out" },
  },
  listStagger: {
    from: { autoAlpha: 0, y: 14 },
    to: { autoAlpha: 1, y: 0, duration: 0.42, ease: "power2.out", stagger: 0.055 },
  },
  modalIn: {
    overlayFrom: { autoAlpha: 0 },
    overlayTo: { autoAlpha: 1, duration: 0.2, ease: "power1.out" },
    contentFrom: { autoAlpha: 0, y: 18, scale: 0.97 },
    contentTo: { autoAlpha: 1, y: 0, scale: 1, duration: 0.28, ease: "power2.out" },
  },
  modalOut: {
    overlayTo: { autoAlpha: 0, duration: 0.16, ease: "power1.in" },
    contentTo: { autoAlpha: 0, y: 10, scale: 0.985, duration: 0.16, ease: "power1.in" },
  },
  toastIn: {
    from: { autoAlpha: 0, x: 18, scale: 0.985 },
    to: { autoAlpha: 1, x: 0, scale: 1, duration: 0.28, ease: "power2.out" },
  },
  toastOut: {
    to: { autoAlpha: 0, x: 18, scale: 0.985, duration: 0.18, ease: "power1.in" },
  },
  metricCount: {
    duration: 0.72,
    ease: "power2.out",
  },
  blockchainPulse: {
    to: { autoAlpha: 0.72, scale: 1.06, duration: 1.2, ease: "sine.inOut", repeat: -1, yoyo: true },
  },
  hashCalculation: {
    to: { x: 5, duration: 0.08, ease: "power1.inOut", repeat: 3, yoyo: true },
  },
  transactionConfirm: {
    from: { autoAlpha: 0, y: 10, scale: 0.96 },
    to: { autoAlpha: 1, y: 0, scale: 1, duration: 0.34, ease: "back.out(1.5)" },
  },
  invalidShake: {
    to: { x: 7, duration: 0.065, ease: "power1.inOut", repeat: 5, yoyo: true },
  },
  successSeal: {
    from: { autoAlpha: 0, scale: 0.72, rotation: -8 },
    to: { autoAlpha: 1, scale: 1, rotation: 0, duration: 0.38, ease: "back.out(1.8)" },
  },
} as const;

export type MotionPresetName = keyof typeof motionPresets;

export function registerMotionSystem() {
  gsap.registerPlugin(useGSAP);
  gsap.defaults({
    duration: 0.45,
    ease: "power2.out",
    overwrite: "auto",
  });
}

export function setMotionCompleteState(targets: TweenTarget) {
  gsap.set(targets, {
    autoAlpha: 1,
    clearProps: "transform,visibility,opacity",
    rotation: 0,
    scale: 1,
    x: 0,
    y: 0,
  });
}

export function shouldSkipMotion(reducedMotion: boolean) {
  return reducedMotion || import.meta.env.MODE === "test";
}

registerMotionSystem();

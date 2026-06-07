import { describe, expect, it } from "vitest";
import { routes } from "@/app/routes";

describe("application routes", () => {
  it("starts with dashboard and exposes the academic blockchain modules", () => {
    expect(routes[0].id).toBe("dashboard");
    expect(routes.map((route) => route.id)).toEqual([
      "dashboard",
      "web3",
      "issue",
      "verification",
      "certificates",
      "revocation",
      "issuers",
      "students",
      "ledger",
      "audit",
      "analytics",
      "nft",
      "settings",
    ]);
  });
});

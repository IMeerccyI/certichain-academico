import { describe, expect, it } from "vitest";
import { issuers, students, verifierEntities } from "@/data/fixture-data";
import {
  defaultPersonaForRole,
  getRoutesForRole,
  isRouteAllowedForRole,
  walletsMatch,
} from "@/lib/roles";
import {
  canManageIssuers,
  canNavigateToRoute,
  canShowIssueActions,
  canShowRevokeActions,
} from "@/lib/ui-permissions";
import {
  canIssueCertificate,
  canRevokeCertificate,
  canSignStudentReception,
} from "@/lib/permissions";
import { certificates } from "@/data/certificate-fixtures";

describe("role navigation and permissions", () => {
  it("filters routes for student and issuer roles", () => {
    expect(getRoutesForRole("student")).toContain("students");
    expect(getRoutesForRole("student")).not.toContain("issue");
    expect(getRoutesForRole("authorized_issuer")).toContain("issue");
    expect(getRoutesForRole("authorized_issuer")).not.toContain("issuers");
    expect(getRoutesForRole("academic_admin")).not.toContain("audit");
    expect(getRoutesForRole("academic_admin")).not.toContain("analytics");
    expect(isRouteAllowedForRole("audit", "auditor")).toBe(false);
    expect(isRouteAllowedForRole("audit", "student")).toBe(false);
    expect(canShowIssueActions("authorized_issuer")).toBe(true);
    expect(canShowIssueActions("student")).toBe(false);
    expect(canShowRevokeActions("auditor")).toBe(false);
    expect(canManageIssuers("academic_admin")).toBe(true);
    expect(canNavigateToRoute("student", "ledger")).toBe(false);
  });

  it("assigns default personas per role", () => {
    expect(defaultPersonaForRole("authorized_issuer", issuers, students, verifierEntities).issuerId).toBe(
      "issuer-rector-umsa",
    );
    expect(defaultPersonaForRole("student", issuers, students, verifierEntities).studentId).toBe("student-juan");
    expect(defaultPersonaForRole("public_verifier", issuers, students, verifierEntities).verifierId).toBe(
      "verifier-private-company",
    );
  });

  it("requires matching wallet for issuer writes", () => {
    const issuer = issuers[0];
    const persona = { issuerId: issuer.id };

    expect(
      canIssueCertificate(issuer, "authorized_issuer", {
        persona,
        walletAddress: issuer.walletAddress,
        requireWallet: true,
      }),
    ).toBe(true);

    expect(
      canIssueCertificate(issuer, "authorized_issuer", {
        persona,
        walletAddress: "0x0000000000000000000000000000000000000001",
        requireWallet: true,
      }),
    ).toBe(false);
  });

  it("blocks student reception for other personas or wallets", () => {
    const certificate = certificates.find((item) => item.id === "certificate-002");
    const student = students.find((item) => item.id === "student-valeria");

    expect(certificate).toBeDefined();
    expect(student).toBeDefined();

    if (!certificate || !student) {
      return;
    }

    expect(
      canSignStudentReception("student", certificate, student, {
        persona: { studentId: student.id },
        walletAddress: student.walletAddress,
        requireWallet: true,
      }),
    ).toBe(true);

    expect(
      canSignStudentReception("authorized_issuer", certificate, student, {
        persona: { studentId: student.id },
        walletAddress: student.walletAddress,
        requireWallet: true,
      }),
    ).toBe(false);

    expect(walletsMatch(student.walletAddress, student.walletAddress)).toBe(true);
  });

  it("lets academic admin revoke without issuer identity match", () => {
    const certificate = certificates.find((item) => item.id === "certificate-001");
    const foreignIssuer = issuers.find((item) => item.id === "issuer-secretary-umss");

    expect(certificate).toBeDefined();
    expect(foreignIssuer).toBeDefined();

    if (!certificate || !foreignIssuer) {
      return;
    }

    expect(
      canRevokeCertificate(foreignIssuer, certificate, "academic_admin", {
        walletAddress: "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
        requireWallet: true,
      }),
    ).toBe(true);
  });
});
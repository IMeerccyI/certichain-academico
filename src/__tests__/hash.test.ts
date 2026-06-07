import { describe, expect, it } from "vitest";
import { calculateSha256, shortenHash } from "@/lib/hash";

describe("hash utilities", () => {
  it("calculates a deterministic SHA-256 digest for certificate content", async () => {
    await expect(calculateSha256("CertiChain Academico")).resolves.toBe(
      "536ff38aac60ca3ec2efc6f035f239db098a65534885d429b5adc3b06f72bc66",
    );
  });

  it("shortens hashes while preserving the leading and trailing fragments", () => {
    expect(shortenHash("0x1234567890abcdef", 6)).toBe("0x1234...abcdef");
  });
});

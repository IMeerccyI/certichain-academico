export async function calculateSha256(input: string | ArrayBuffer | Blob) {
  const buffer =
    typeof input === "string"
      ? new TextEncoder().encode(input)
      : input instanceof Blob
        ? await input.arrayBuffer()
        : input;

  const digest = await globalThis.crypto.subtle.digest("SHA-256", buffer);

  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

export function shortenHash(hash: string, size = 8) {
  if (hash.length <= size * 2 + 3) {
    return hash;
  }

  return `${hash.slice(0, size)}...${hash.slice(-size)}`;
}

export function normalizeHash(hash: string) {
  const trimmed = hash.trim();
  return trimmed.startsWith("0x") ? trimmed : `0x${trimmed}`;
}

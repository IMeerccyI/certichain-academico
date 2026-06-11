function isBlobLike(input: unknown): input is Blob {
  return (
    typeof input === "object" &&
    input !== null &&
    typeof (input as Blob).arrayBuffer === "function"
  );
}

function isTextFileLike(input: unknown): input is { text: () => Promise<string> } {
  return (
    typeof input === "object" &&
    input !== null &&
    typeof (input as { text?: unknown }).text === "function"
  );
}

export async function calculateSha256(input: string | ArrayBuffer | Blob) {
  const buffer =
    typeof input === "string"
      ? new TextEncoder().encode(input)
      : isBlobLike(input)
        ? new Uint8Array(await input.arrayBuffer())
        : isTextFileLike(input)
          ? new TextEncoder().encode(await input.text())
          : new Uint8Array(input);

  if (!globalThis.crypto?.subtle) {
    return calculateDemoHash(buffer);
  }

  const digest = await globalThis.crypto.subtle.digest("SHA-256", buffer);

  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

export function calculateDemoHash(input: string | ArrayBuffer | Uint8Array) {
  const bytes =
    typeof input === "string"
      ? new TextEncoder().encode(input)
      : input instanceof Uint8Array
        ? input
        : new Uint8Array(input);
  let hashA = 0x811c9dc5;
  let hashB = 0x45d9f3b;

  for (const byte of bytes) {
    hashA ^= byte;
    hashA = Math.imul(hashA, 0x01000193);
    hashB ^= hashA + byte;
    hashB = Math.imul(hashB, 0x85ebca6b);
  }

  const chunk = (value: number) => (value >>> 0).toString(16).padStart(8, "0");
  const base = `${chunk(hashA)}${chunk(hashB)}${chunk(hashA ^ hashB)}${chunk(hashA + hashB)}`;

  return `${base}${base}`.slice(0, 64);
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

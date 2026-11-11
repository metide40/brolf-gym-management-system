export type StoredCredential = { salt: string; hash: string; iterations: number };

export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_LENGTH = 64;

function toBase64(bytes: Uint8Array<ArrayBuffer>): string {
  let binary = "";
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  if (typeof globalThis.btoa === "function") return globalThis.btoa(binary);
  throw new Error("btoa is not available.");
}

function fromBase64(value: string): Uint8Array<ArrayBuffer> {
  if (typeof globalThis.atob !== "function") throw new Error("atob is not available.");
  const binary = globalThis.atob(value);
  const bytes = new Uint8Array(new ArrayBuffer(binary.length));
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

async function derivePasswordHash(password: string, salt: Uint8Array<ArrayBuffer>, iterations: number): Promise<Uint8Array<ArrayBuffer>> {
  const cryptoApi = globalThis.crypto;
  if (!cryptoApi || !cryptoApi.subtle) throw new Error("Web Crypto API is unavailable.");

  const rawPassword = new TextEncoder().encode(password);
  const passwordBytes = new Uint8Array(new ArrayBuffer(rawPassword.length));
  passwordBytes.set(rawPassword);

  const key = await cryptoApi.subtle.importKey("raw", passwordBytes, { name: "PBKDF2" }, false, ["deriveBits"]);
  const bits = await cryptoApi.subtle.deriveBits({ name: "PBKDF2", salt, iterations, hash: "SHA-256" }, key, 256);
  return new Uint8Array(bits);
}

export function validateNewPassword(password: string): string | null {
  if (password.length < PASSWORD_MIN_LENGTH) return "Password must be at least 8 characters.";
  if (password.length > PASSWORD_MAX_LENGTH) return "Password must be 64 characters or fewer.";

  const hasLetter = /[A-Za-z]/.test(password);
  const hasDigit = /\d/.test(password);
  if (!hasLetter || !hasDigit) return "Password must include at least one letter and one number.";

  return null;
}

export async function createCredential(password: string): Promise<StoredCredential> {
  const cryptoApi = globalThis.crypto;
  if (!cryptoApi || !cryptoApi.subtle) throw new Error("Web Crypto API is unavailable.");

  const salt = new Uint8Array(new ArrayBuffer(16));
  cryptoApi.getRandomValues(salt);
  const hash = await derivePasswordHash(password, salt, 100000);

  return { salt: toBase64(salt), hash: toBase64(hash), iterations: 100000 };
}

export async function verifyCredential(password: string, credential: StoredCredential): Promise<boolean> {
  if (typeof password !== "string") return false;
  if (!credential || typeof credential !== "object") return false;
  if (typeof credential.salt !== "string" || typeof credential.hash !== "string" || !Number.isInteger(credential.iterations) || credential.iterations <= 0) return false;

  try {
    const saltBytes = fromBase64(credential.salt);
    const expectedHash = fromBase64(credential.hash);
    const actualHash = await derivePasswordHash(password, saltBytes, credential.iterations);

    if (actualHash.length !== expectedHash.length) return false;

    let diff = 0;
    for (let i = 0; i < actualHash.length; i += 1) {
      diff |= actualHash[i] ^ expectedHash[i];
    }

    return diff === 0;
  } catch {
    return false;
  }
}

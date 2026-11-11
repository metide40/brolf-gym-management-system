import { webcrypto } from "node:crypto";
import { describe, expect, it, vi } from "vitest";
import { createCredential, validateNewPassword, verifyCredential } from "../lib/credentials";

if (!globalThis.crypto) {
  vi.stubGlobal("crypto", webcrypto);
}

describe("credential validation", () => {
  it("accepts a valid password", async () => {
    expect(validateNewPassword("Gym12345")).toBeNull();
  });

  it("rejects a password that is shorter than 8 characters", () => {
    expect(validateNewPassword("Gym1234")).toBe("Password must be at least 8 characters.");
  });

  it("rejects a password longer than 64 characters", () => {
    const tooLong = "A".repeat(65);
    expect(validateNewPassword(`${tooLong}1`)).toBe("Password must be 64 characters or fewer.");
  });

  it("rejects letters-only passwords", () => {
    expect(validateNewPassword("Gymnastics")).toBe("Password must include at least one letter and one number.");
  });

  it("rejects digits-only passwords", () => {
    expect(validateNewPassword("12345678")).toBe("Password must include at least one letter and one number.");
  });
});

describe("credential hashing", () => {
  it("creates unique salts and hashes for the same password", async () => {
    const plainPassword = "Gym12345";
    const first = await createCredential(plainPassword);
    const second = await createCredential(plainPassword);

    expect(first.salt).not.toBe(second.salt);
    expect(first.hash).not.toBe(second.hash);
    expect(first.iterations).toBe(100000);
    expect(second.iterations).toBe(100000);
    expect(JSON.stringify(first)).not.toContain(plainPassword);
    expect(JSON.stringify(second)).not.toContain(plainPassword);
  });

  it("verifies the correct password and rejects bad variants or malformed data", async () => {
    const plainPassword = "Gym12345";
    const credential = await createCredential(plainPassword);

    await expect(verifyCredential(plainPassword, credential)).resolves.toBe(true);
    await expect(verifyCredential("Gym12346", credential)).resolves.toBe(false);
    await expect(verifyCredential("gym12345", credential)).resolves.toBe(false);
    await expect(verifyCredential("Gym12345", { salt: "bad", hash: "bad", iterations: 100000 })).resolves.toBe(false);
    await expect(verifyCredential("Gym12345", { salt: "", hash: "", iterations: 0 } as never)).resolves.toBe(false);
  });
});

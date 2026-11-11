import { webcrypto } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { deleteMember, resetDemoData, saveMember } from "../api/mockApi";
import type { MemberInput } from "../types";

if (!globalThis.crypto) {
  vi.stubGlobal("crypto", webcrypto);
}

const makeMemberInput = (overrides: Partial<MemberInput> = {}): MemberInput => {
  const today = new Date().toISOString().slice(0, 10);
  return {
    name: "Taylor Brooks",
    email: "taylor.brooks@example.com",
    phone: "+1 (415) 555-0123",
    plan: "Monthly",
    startDate: today,
    endDate: new Date(Date.now() + 45 * 86400000).toISOString().slice(0, 10),
    trainerId: "TR-01",
    frozen: false,
    joinedAt: today,
    goal: "Strength",
    notes: "",
    ...overrides,
  };
};

const readDb = (): { members: Array<{ id: string; email: string }> } => {
  const raw = localStorage.getItem("fitcore.db.v1");
  return raw ? JSON.parse(raw) : { members: [] };
};

const readCredentials = (): Record<string, { salt: string; hash: string; iterations: number }> => {
  const raw = localStorage.getItem("fitcore.credentials.v1");
  return raw ? JSON.parse(raw) : {};
};

describe("member credential storage", () => {
  beforeEach(async () => {
    const store = new Map<string, string>();
    vi.stubGlobal("localStorage", {
      getItem: vi.fn((key: string) => (store.has(key) ? store.get(key)! : null)),
      setItem: vi.fn((key: string, value: string) => {
        store.set(key, String(value));
      }),
      removeItem: vi.fn((key: string) => {
        store.delete(key);
      }),
      clear: vi.fn(() => {
        store.clear();
      }),
    });
    await resetDemoData();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    if (!globalThis.crypto) {
      vi.stubGlobal("crypto", webcrypto);
    }
  });

  it("stores a credential under the member id and never exposes the plain password in persisted data", async () => {
    const input = makeMemberInput({ name: "Sam Rivera", email: "sam.rivera@example.com" });
    const db = await saveMember(input, "Gym12345");
    const member = db.members.find((m) => m.email === input.email);

    expect(member).toBeTruthy();
    const stored = readCredentials();
    expect(stored[member!.id]).toMatchObject({ salt: expect.any(String), hash: expect.any(String), iterations: 100000 });
    expect(JSON.stringify(stored)).not.toContain("Gym12345");
    expect(JSON.stringify(db)).not.toContain("Gym12345");
    expect(localStorage.getItem("fitcore.credentials.v1")).not.toContain("Gym12345");
  });

  it("rejects a weak password and does not change the member count", async () => {
    const before = readDb().members.length;
    await expect(saveMember(makeMemberInput({ email: "weak.member@example.com" }), "short1")).rejects.toThrow("Password must be at least 8 characters.");
    expect(readDb().members.length).toBe(before);
  });

  it("rejects a second member with the same email in different letter case", async () => {
    await saveMember(makeMemberInput({ email: "case.test@example.com" }), "Gym12345");
    await expect(saveMember(makeMemberInput({ name: "Case Test Two", email: "CASE.TEST@example.com" }), "Gym12345")).rejects.toThrow("Another member already uses this email address.");
  });

  it("allows an existing member to keep its own email while editing", async () => {
    const saved = await saveMember(makeMemberInput({ email: "self.keep@example.com" }), "Gym12345");
    const member = saved.members.find((m) => m.email === "self.keep@example.com");
    expect(member).toBeTruthy();

    const updated = { ...member!, notes: "Updated notes" };
    await expect(saveMember(updated)).resolves.toBeTruthy();
    const nextDb = readDb();
    expect(nextDb.members.find((m) => m.id === member!.id)?.email).toBe("self.keep@example.com");
  });

  it("rejects an email that matches a demo account exactly regardless of case", async () => {
    await expect(saveMember(makeMemberInput({ email: "admin@fitcore.io" }), "Gym12345")).rejects.toThrow("That email address is reserved for a demo account.");
  });

  it("keeps an existing credential unchanged when editing without a password", async () => {
    const input = makeMemberInput({ email: "credential.preserve@example.com" });
    const saved = await saveMember(input, "Gym12345");
    const member = saved.members.find((m) => m.email === input.email)!;
    const original = readCredentials()[member.id];

    const updated = { ...member, notes: "New notes" };
    await saveMember(updated);

    expect(readCredentials()[member.id]).toEqual(original);
  });

  it("removes a member credential on delete and clears all credentials on reset", async () => {
    const input = makeMemberInput({ email: "delete.me@example.com" });
    const saved = await saveMember(input, "Gym12345");
    const memberId = saved.members.find((m) => m.email === input.email)!.id;

    expect(readCredentials()[memberId]).toBeTruthy();
    await deleteMember(memberId);
    expect(readCredentials()[memberId]).toBeUndefined();

    await resetDemoData();
    expect(localStorage.getItem("fitcore.credentials.v1")).toBeNull();
  });
});

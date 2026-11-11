import { webcrypto } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { deleteMember, login, resetDemoData, saveMember, getSession } from "../api/mockApi";
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

const saveAndReturnMember = async (overrides: Partial<MemberInput> = {}, password = "Gym12345") => {
  const input = makeMemberInput(overrides);
  const db = await saveMember(input, password);
  const member = db.members.find((m) => m.email.trim().toLowerCase() === input.email.trim().toLowerCase());
  if (!member) throw new Error("Saved member was not found");
  return member;
};

const readStoredSession = (): { role?: string; email?: string; memberId?: string } | null => {
  const raw = localStorage.getItem("fitcore.session.v1");
  return raw ? JSON.parse(raw) : null;
};

describe("member login", () => {
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

  it("allows a saved member to sign in with their own email and password, including case-insensitive matching, and keeps the session alive", async () => {
    const member = await saveAndReturnMember({ email: "member.login@example.com", name: "Jamie Ruiz" }, "Gym12345");
    const session = await login(`  ${member.email.toUpperCase()}  `, "Gym12345");

    expect(session).toMatchObject({ role: "member", name: member.name, email: member.email, memberId: member.id });
    expect(getSession()).toMatchObject({ role: "member", email: member.email, memberId: member.id });
    expect(readStoredSession()).toMatchObject({ role: "member", email: member.email, memberId: member.id });
  });

  it("rejects wrong passwords, unknown emails and seeded members without a credential with the same invalid login message", async () => {
    const seeded = JSON.parse(localStorage.getItem("fitcore.db.v1") ?? "{\"members\":[]}").members[0];

    await expect(login("unknown.member@example.com", "Gym12345")).rejects.toThrow("Invalid email or password.");
    await expect(login("member.login@example.com", "WrongPass123")).rejects.toThrow("Invalid email or password.");
    await expect(login(seeded.email, "Gym12345")).rejects.toThrow("Invalid email or password.");
  });

  it("keeps demo account login behavior working exactly as before", async () => {
    const admin = await login("admin@fitcore.io", "fitcore123");
    expect(admin).toMatchObject({ role: "admin", email: "admin@fitcore.io" });

    const memberDemo = await login("member@fitcore.io", "fitcore123");
    expect(memberDemo).toMatchObject({ role: "member", email: "member@fitcore.io", memberId: "MEM-001" });

    await expect(login("admin@fitcore.io", "wrongpass")).rejects.toThrow("Invalid email or password.");
    await expect(login("member@fitcore.io", "wrongpass")).rejects.toThrow("Invalid email or password.");
  });

  it("keeps the member demo account pinned to memberId MEM-001 after a second member is added", async () => {
    await saveMember(makeMemberInput({ email: "second.member@example.com" }), "Gym12345");
    const session = await login("member@fitcore.io", "fitcore123");
    expect(session.memberId).toBe("MEM-001");
  });

  it("drops a member session when that member is deleted, after resetDemoData, or when a handwritten member session points to an unknown email", async () => {
    const member = await saveAndReturnMember({ email: "delete.session@example.com" }, "Gym12345");
    await login(member.email, "Gym12345");
    expect(getSession()).not.toBeNull();

    await deleteMember(member.id);
    expect(getSession()).toBeNull();

    await saveAndReturnMember({ email: "another.session@example.com" }, "Gym12345");
    await login("another.session@example.com", "Gym12345");
    await resetDemoData();
    expect(getSession()).toBeNull();

    localStorage.setItem("fitcore.session.v1", JSON.stringify({ role: "member", name: "Ghost User", email: "ghost@example.com", memberId: "MEM-999" }));
    expect(getSession()).toBeNull();
  });

  it("rejects the old password after a member password change and accepts the new one", async () => {
    const member = await saveAndReturnMember({ email: "new.password@example.com", name: "Avery Stone" }, "Gym12345");
    const updated = { ...member, notes: "Updated after password change" };
    await saveMember(updated, "NewPass123");

    await expect(login(member.email, "Gym12345")).rejects.toThrow("Invalid email or password.");
    const session = await login(member.email, "NewPass123");
    expect(session).toMatchObject({ role: "member", email: member.email, memberId: member.id });
  });
});

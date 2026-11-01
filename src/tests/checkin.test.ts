import { describe, expect, it } from "vitest";
import { seedDatabase } from "../mockData";
import { checkInIn } from "../api/mockApi";
import type { Database } from "../types";

const dayOffset = (days: number) => new Date(Date.now() + days * 86400000).toISOString().slice(0, 10);
const freshDb = (): Database => structuredClone(seedDatabase());

describe("checkInIn (QR check-in rules)", () => {
  it("grants access to a member with an active membership and logs it", () => {
    const db = freshDb();
    const member = db.members[0];
    member.endDate = dayOffset(90);
    member.frozen = false;
    const before = db.attendance.length;

    const result = checkInIn(db, member.code);

    expect(result.ok).toBe(true);
    expect(db.attendance.length).toBe(before + 1);
    expect(db.attendance[0]).toMatchObject({ memberId: member.id, result: "Granted" });
  });

  it("accepts the code in lower case and with surrounding spaces", () => {
    const db = freshDb();
    const member = db.members[0];
    member.endDate = dayOffset(90);
    member.frozen = false;
    expect(checkInIn(db, `  ${member.code.toLowerCase()} `).ok).toBe(true);
  });

  it("blocks a member whose membership has expired and records the reason", () => {
    const db = freshDb();
    const member = db.members[0];
    member.endDate = dayOffset(-10);
    member.frozen = false;

    const result = checkInIn(db, member.code);

    expect(result.ok).toBe(false);
    expect(db.attendance[0]).toMatchObject({ memberId: member.id, result: "Blocked", reason: "Membership expired" });
  });

  it("blocks a frozen membership", () => {
    const db = freshDb();
    const member = db.members[0];
    member.endDate = dayOffset(90);
    member.frozen = true;

    const result = checkInIn(db, member.code);

    expect(result.ok).toBe(false);
    expect(db.attendance[0].reason).toBe("Membership frozen");
  });

  it("allows an expiring membership but warns that renewal is due", () => {
    const db = freshDb();
    const member = db.members[0];
    member.endDate = dayOffset(5);
    member.frozen = false;

    const result = checkInIn(db, member.code);

    expect(result.ok).toBe(true);
    expect(result.message).toContain("Renewal due soon");
  });

  it("denies and logs an unknown code", () => {
    const db = freshDb();
    const result = checkInIn(db, "NOT-A-REAL-CODE");
    expect(result.ok).toBe(false);
    expect(db.attendance[0]).toMatchObject({ memberId: "unknown", result: "Blocked", reason: "Card not recognised" });
  });
});

import { describe, expect, it } from "vitest";
import { deriveStatus, seedDatabase } from "../mockData";
import { renewMemberIn } from "../api/mockApi";
import type { Database } from "../types";

const dayOffset = (days: number) => new Date(Date.now() + days * 86400000).toISOString().slice(0, 10);
const freshDb = (): Database => structuredClone(seedDatabase());

describe("deriveStatus (membership expiry)", () => {
  it("marks a membership that ended days ago as Expired", () => {
    expect(deriveStatus(dayOffset(-5))).toBe("Expired");
  });

  it("marks a membership ending within two weeks as Expiring Soon", () => {
    expect(deriveStatus(dayOffset(5))).toBe("Expiring Soon");
  });

  it("marks a membership with plenty of time left as Active", () => {
    expect(deriveStatus(dayOffset(60))).toBe("Active");
  });

  it("returns Frozen whenever the membership is frozen, even if it has expired", () => {
    expect(deriveStatus(dayOffset(-30), true)).toBe("Frozen");
    expect(deriveStatus(dayOffset(60), true)).toBe("Frozen");
  });
});

describe("renewMemberIn", () => {
  it("extends an active membership from its current end date", () => {
    const db = freshDb();
    const member = db.members[0];
    member.endDate = dayOffset(20);
    member.frozen = false;
    renewMemberIn(db, member.id, 30);
    expect(member.endDate).toBe(dayOffset(50));
  });

  it("restarts an expired membership from today", () => {
    const db = freshDb();
    const member = db.members[0];
    member.endDate = dayOffset(-40);
    renewMemberIn(db, member.id, 30);
    expect(member.endDate).toBe(dayOffset(30));
    expect(deriveStatus(member.endDate, member.frozen)).not.toBe("Expired");
  });

  it("unfreezes the membership when it is renewed", () => {
    const db = freshDb();
    const member = db.members[0];
    member.frozen = true;
    renewMemberIn(db, member.id, 30);
    expect(member.frozen).toBe(false);
  });

  it("rejects an unknown member", () => {
    expect(() => renewMemberIn(freshDb(), "NOPE", 30)).toThrow("Member not found");
  });

  it("rejects a renewal length of zero or less", () => {
    const db = freshDb();
    expect(() => renewMemberIn(db, db.members[0].id, 0)).toThrow();
    expect(() => renewMemberIn(db, db.members[0].id, -7)).toThrow();
  });
});

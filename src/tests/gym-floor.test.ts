import { describe, expect, it } from "vitest";
import { seedDatabase } from "../mockData";
import { checkInIn, checkOutIn, currentlyInGym, logMaintenanceIn, migrateDatabase } from "../api/mockApi";
import { toCsv } from "../lib/csv";
import type { AttendanceLog, Database, EquipmentItem } from "../types";

const minutesAgo = (minutes: number) => new Date(Date.now() - minutes * 60000).toISOString();
const dayOffset = (days: number) => new Date(Date.now() + days * 86400000).toISOString().slice(0, 10);

const granted = (memberId: string, minutes: number): AttendanceLog => ({ id: `A-${memberId}-${minutes}`, memberId, memberName: `Member ${memberId}`, at: minutesAgo(minutes), result: "Granted" });

// A database where nobody is checked in and three members have valid memberships.
const quietGym = (): Database => {
  const db: Database = structuredClone(seedDatabase());
  db.attendance = [];
  db.checkouts = [];
  db.members.slice(0, 3).forEach((m) => { m.endDate = dayOffset(90); m.frozen = false; });
  return db;
};

describe("currentlyInGym", () => {
  it("lists members who checked in recently and have not left", () => {
    const db = quietGym();
    db.attendance = [granted("A", 30), granted("B", 20)];
    const inside = currentlyInGym(db).map((v) => v.memberId);
    expect(inside).toEqual(["B", "A"]);
  });

  it("ignores blocked attempts", () => {
    const db = quietGym();
    db.attendance = [{ ...granted("A", 10), result: "Blocked" }];
    expect(currentlyInGym(db)).toHaveLength(0);
  });

  it("stops counting a member after the stay window if nobody checked them out", () => {
    const db = quietGym();
    db.attendance = [granted("A", 5 * 60)];
    expect(currentlyInGym(db)).toHaveLength(0);
  });

  it("does not count a member who has checked out since", () => {
    const db = quietGym();
    db.attendance = [granted("A", 60)];
    db.checkouts = [{ id: "C1", memberId: "A", memberName: "Member A", at: minutesAgo(20) }];
    expect(currentlyInGym(db)).toHaveLength(0);
  });

  it("counts a member again when they check in after leaving", () => {
    const db = quietGym();
    db.attendance = [granted("A", 120), granted("A", 10)];
    db.checkouts = [{ id: "C1", memberId: "A", memberName: "Member A", at: minutesAgo(60) }];
    expect(currentlyInGym(db).map((v) => v.memberId)).toEqual(["A"]);
  });
});

describe("check-out", () => {
  it("checks out a member who is inside", () => {
    const db = quietGym();
    const member = db.members[0];
    checkInIn(db, member.code);

    const result = checkOutIn(db, member.code);

    expect(result.ok).toBe(true);
    expect(db.checkouts).toHaveLength(1);
    expect(currentlyInGym(db)).toHaveLength(0);
  });

  it("refuses to check out a member who is not inside", () => {
    const db = quietGym();
    const result = checkOutIn(db, db.members[0].code);
    expect(result.ok).toBe(false);
    expect(result.message).toContain("not checked in");
  });

  it("refuses an unknown card", () => {
    expect(checkOutIn(quietGym(), "NOT-A-CARD")).toMatchObject({ ok: false });
  });
});

describe("gym capacity at the door", () => {
  it("blocks entry once the gym is full and logs the reason", () => {
    const db = quietGym();
    db.settings.maxCapacity = 2;
    const [a, b, c] = db.members;
    expect(checkInIn(db, a.code).ok).toBe(true);
    expect(checkInIn(db, b.code).ok).toBe(true);

    const result = checkInIn(db, c.code);

    expect(result.ok).toBe(false);
    expect(db.attendance[0]).toMatchObject({ memberId: c.id, result: "Blocked", reason: "Gym at capacity" });
  });

  it("lets someone already inside scan again when the gym is full", () => {
    const db = quietGym();
    db.settings.maxCapacity = 2;
    const [a, b] = db.members;
    checkInIn(db, a.code);
    checkInIn(db, b.code);
    expect(checkInIn(db, a.code).ok).toBe(true);
  });

  it("makes room again after a check-out", () => {
    const db = quietGym();
    db.settings.maxCapacity = 1;
    const [a, b] = db.members;
    checkInIn(db, a.code);
    expect(checkInIn(db, b.code).ok).toBe(false);
    checkOutIn(db, a.code);
    expect(checkInIn(db, b.code).ok).toBe(true);
  });
});

describe("equipment maintenance log", () => {
  const freshDb = (): Database => structuredClone(seedDatabase());

  it("records the entry and updates the unit's status and note", () => {
    const db = freshDb();
    const item = db.equipment.find((e) => e.status === "Operational")!;
    const before = item.log.length;

    const entry = logMaintenanceIn(db, item.id, { date: dayOffset(0), note: "  Chain loose on left side  ", status: "Needs Service" });

    expect(item.log).toHaveLength(before + 1);
    expect(item.log[0]).toEqual(entry);
    expect(entry.note).toBe("Chain loose on left side");
    expect(item.status).toBe("Needs Service");
    expect(item.note).toBe("Chain loose on left side");
  });

  it("sets the last service date when the unit is back to Operational", () => {
    const db = freshDb();
    const item = db.equipment.find((e) => e.status === "Needs Service")!;
    const date = dayOffset(-1);

    logMaintenanceIn(db, item.id, { date, note: "Tension adjusted and tested", status: "Operational" });

    expect(item.status).toBe("Operational");
    expect(item.lastService).toBe(date);
  });

  it("does not change the last service date when the unit is still faulty", () => {
    const db = freshDb();
    const item = db.equipment[0];
    const before = item.lastService;
    logMaintenanceIn(db, item.id, { date: dayOffset(0), note: "Waiting for a part", status: "Out of Order" });
    expect(item.lastService).toBe(before);
  });

  it("rejects a note that is too short", () => {
    const db = freshDb();
    expect(() => logMaintenanceIn(db, db.equipment[0].id, { date: dayOffset(0), note: "ok", status: "Operational" })).toThrow("Describe the work");
  });

  it("rejects a date in the future", () => {
    const db = freshDb();
    expect(() => logMaintenanceIn(db, db.equipment[0].id, { date: dayOffset(3), note: "Planned servicing", status: "Operational" })).toThrow("future");
  });

  it("rejects unknown equipment", () => {
    expect(() => logMaintenanceIn(freshDb(), "EQ-99", { date: dayOffset(0), note: "Checked it over", status: "Operational" })).toThrow("Equipment not found");
  });
});

describe("migrateDatabase (check-outs and maintenance logs)", () => {
  it("adds check-outs and turns old equipment notes into the first log entry", () => {
    const old: Partial<Database> = structuredClone(seedDatabase());
    delete old.checkouts;
    old.equipment!.forEach((e) => { delete (e as Partial<EquipmentItem>).log; });

    const migrated = migrateDatabase(old);

    expect(migrated.checkouts).toEqual([]);
    migrated.equipment.forEach((e) => {
      expect(Array.isArray(e.log)).toBe(true);
      expect(e.log).toHaveLength(e.note ? 1 : 0);
    });
  });
});

describe("toCsv", () => {
  it("quotes text cells and leaves numbers alone", () => {
    expect(toCsv([["name", "plan"], ["Selam", 69]])).toBe('"name","plan"\n"Selam",69');
  });

  it("keeps commas, line breaks and quotes inside a single cell", () => {
    expect(toCsv([["a, b", 'say "hi"', "two\nlines"]])).toBe('"a, b","say ""hi""","two\nlines"');
  });

  it("neutralises cells that spreadsheets would run as formulas", () => {
    expect(toCsv([["=SUM(A1:A9)", "+1", "-1", "@cmd"]])).toBe(`"'=SUM(A1:A9)","'+1","'-1","'@cmd"`);
  });

  it("leaves international phone numbers alone", () => {
    expect(toCsv([["+251911234567", "+251 91 123 4567"]])).toBe('"+251911234567","+251 91 123 4567"');
  });

  it("still neutralises a plus sign that is not a phone number", () => {
    expect(toCsv([["+1+1", "+cmd|calc"]])).toBe(`"'+1+1","'+cmd|calc"`);
  });

  it("keeps negative numbers as numbers", () => {
    expect(toCsv([[-5, 0]])).toBe("-5,0");
  });

  it("writes empty cells for missing values", () => {
    expect(toCsv([["x", null, undefined]])).toBe('"x","",""');
  });
});

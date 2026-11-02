import { describe, expect, it } from "vitest";
import { seedDatabase } from "../mockData";
import { cancelClassIn, deleteTrainerIn, migrateDatabase, saveClassIn, saveTrainerIn, validateClassIn, validateSettingsIn } from "../api/mockApi";
import type { ClassInput, Database, GymSettings } from "../types";

const freshDb = (): Database => {
  const db: Database = structuredClone(seedDatabase());
  db.bookings = [];
  db.waitlist = [];
  return db;
};

const newTrainer = (db: Database, name = "Test Coach") => saveTrainerIn(db, { name, specialty: "Mobility", availability: "Mon-Fri" });

const classInput = (overrides: Partial<ClassInput> = {}): ClassInput => ({
  name: "Late Mobility",
  category: "Mobility",
  trainerId: "TR-01",
  day: "Sun",
  time: "03:00",
  duration: 45,
  capacity: 10,
  room: "Brand New Room",
  ...overrides,
});

describe("migrateDatabase (older saved data)", () => {
  it("adds trainers and a gym capacity when they are missing", () => {
    const old: Partial<Database> = structuredClone(seedDatabase());
    delete old.trainers;
    delete (old.settings as Partial<GymSettings>).maxCapacity;

    const migrated = migrateDatabase(old);

    expect(migrated.trainers.length).toBeGreaterThan(0);
    expect(migrated.settings.maxCapacity).toBe(120);
  });

  it("keeps trainers and capacity that already exist", () => {
    const db = freshDb();
    db.trainers = [{ id: "TR-09", name: "Only Coach", specialty: "Yoga", availability: "" }];
    db.settings.maxCapacity = 60;

    const migrated = migrateDatabase(db);

    expect(migrated.trainers).toHaveLength(1);
    expect(migrated.settings.maxCapacity).toBe(60);
  });
});

describe("trainer management", () => {
  it("adds a trainer with the next id and trimmed text", () => {
    const db = freshDb();
    const created = saveTrainerIn(db, { name: "  Sara Tesfaye ", specialty: " Pilates ", availability: "" });
    expect(created.id).toBe("TR-07");
    expect(created.name).toBe("Sara Tesfaye");
    expect(created.specialty).toBe("Pilates");
    expect(db.trainers).toHaveLength(7);
  });

  it("rejects a name that is too short", () => {
    expect(() => saveTrainerIn(freshDb(), { name: "A", specialty: "Yoga", availability: "" })).toThrow("Enter the trainer's full name.");
  });

  it("rejects a duplicate name, ignoring letter case", () => {
    const db = freshDb();
    expect(() => saveTrainerIn(db, { name: "marcus vale", specialty: "Yoga", availability: "" })).toThrow("already exists");
  });

  it("edits an existing trainer and allows keeping their own name", () => {
    const db = freshDb();
    const updated = saveTrainerIn(db, { id: "TR-01", name: "Marcus Vale", specialty: "Powerlifting", availability: "Weekends" });
    expect(updated.specialty).toBe("Powerlifting");
    expect(db.trainers).toHaveLength(6);
  });

  it("rejects editing a trainer that does not exist", () => {
    expect(() => saveTrainerIn(freshDb(), { id: "TR-99", name: "Ghost Coach", specialty: "Yoga", availability: "" })).toThrow("Trainer not found.");
  });

  it("blocks deleting a trainer who still has members or classes", () => {
    const db = freshDb();
    expect(() => deleteTrainerIn(db, "TR-01")).toThrow("still assigned");
    expect(db.trainers).toHaveLength(6);
  });

  it("allows deleting a trainer once everything is reassigned", () => {
    const db = freshDb();
    const replacement = newTrainer(db);
    db.members.filter((m) => m.trainerId === "TR-01").forEach((m) => { m.trainerId = replacement.id; });
    db.classes.filter((c) => c.trainerId === "TR-01").forEach((c) => { c.trainerId = replacement.id; });
    db.workoutPlans.filter((p) => p.trainerId === "TR-01").forEach((p) => { p.trainerId = replacement.id; });

    deleteTrainerIn(db, "TR-01");

    expect(db.trainers.some((t) => t.id === "TR-01")).toBe(false);
    expect(db.trainers).toHaveLength(6);
  });

  it("always keeps at least one trainer", () => {
    const db = freshDb();
    db.trainers = [db.trainers[0]];
    expect(() => deleteTrainerIn(db, db.trainers[0].id)).toThrow("at least one trainer");
  });

  it("reports an unknown trainer", () => {
    expect(() => deleteTrainerIn(freshDb(), "TR-99")).toThrow("Trainer not found.");
  });
});

describe("class creation and editing", () => {
  it("creates a valid class", () => {
    const db = freshDb();
    const coach = newTrainer(db);
    const before = db.classes.length;

    const created = saveClassIn(db, classInput({ trainerId: coach.id }));

    expect(db.classes).toHaveLength(before + 1);
    expect(created.id.startsWith("CLS-")).toBe(true);
  });

  it("rejects a class bigger than the gym capacity", () => {
    const db = freshDb();
    db.settings.maxCapacity = 15;
    const coach = newTrainer(db);
    expect(validateClassIn(db, classInput({ trainerId: coach.id, capacity: 20 }))).toContain("gym limit of 15");
  });

  it("rejects an invalid start time", () => {
    const db = freshDb();
    const coach = newTrainer(db);
    expect(validateClassIn(db, classInput({ trainerId: coach.id, time: "25:99" }))).toContain("start time");
  });

  it("rejects a trainer who is already teaching at that time", () => {
    const db = freshDb();
    const existing = db.classes[0];
    const problem = validateClassIn(db, classInput({ trainerId: existing.trainerId, day: existing.day, time: existing.time }));
    expect(problem).toContain("already teaches");
  });

  it("rejects a room that is already in use at that time", () => {
    const db = freshDb();
    const coach = newTrainer(db);
    const existing = db.classes[0];
    const problem = validateClassIn(db, classInput({ trainerId: coach.id, day: existing.day, time: existing.time, room: existing.room }));
    expect(problem).toContain("already used");
  });

  it("rejects a trainer who does not exist", () => {
    expect(validateClassIn(freshDb(), classInput({ trainerId: "TR-99" }))).toBe("Choose a trainer from the list.");
  });

  it("does not let capacity drop below the number of booked members", () => {
    const db = freshDb();
    const cls = db.classes[0];
    ["a", "b", "c"].forEach((x) => db.bookings.push({ id: `B-${x}`, classId: cls.id, memberId: `M-${x}`, createdAt: "2026-01-01T10:00:00.000Z" }));
    const problem = validateClassIn(db, { ...cls, capacity: 2 });
    expect(problem).toContain("already booked");
  });

  it("locks the time of a class once members have booked it", () => {
    const db = freshDb();
    const cls = db.classes[0];
    db.classes = [cls];
    db.bookings.push({ id: "B-1", classId: cls.id, memberId: "M-1", createdAt: "2026-01-01T10:00:00.000Z" });

    expect(validateClassIn(db, { ...cls, time: "21:00" })).toContain("time cannot change");
    expect(validateClassIn(db, { ...cls, capacity: cls.capacity + 2 })).toBeNull();
  });

  it("lets a class be edited without clashing with itself", () => {
    const db = freshDb();
    const cls = db.classes[0];
    const saved = saveClassIn(db, { ...cls, name: "Renamed Class" });
    expect(saved.name).toBe("Renamed Class");
    expect(db.classes.filter((c) => c.id === cls.id)).toHaveLength(1);
  });
});

describe("cancelling a class", () => {
  it("removes the class with its bookings and waitlist, and posts a notification", () => {
    const db = freshDb();
    const cls = db.classes[0];
    db.bookings.push({ id: "B-1", classId: cls.id, memberId: "M-1", createdAt: "2026-01-01T10:00:00.000Z" });
    db.bookings.push({ id: "B-2", classId: cls.id, memberId: "M-2", createdAt: "2026-01-01T10:05:00.000Z" });
    db.waitlist.push({ id: "W-1", classId: cls.id, memberId: "M-3", createdAt: "2026-01-01T10:10:00.000Z" });
    const notificationsBefore = db.notifications.length;

    const result = cancelClassIn(db, cls.id);

    expect(result).toMatchObject({ ok: true, removedBookings: 2 });
    expect(db.classes.some((c) => c.id === cls.id)).toBe(false);
    expect(db.bookings.some((b) => b.classId === cls.id)).toBe(false);
    expect(db.waitlist.some((w) => w.classId === cls.id)).toBe(false);
    expect(db.notifications).toHaveLength(notificationsBefore + 1);
    expect(db.notifications[0].title).toBe("Class cancelled");
  });

  it("reports an unknown class without changing anything", () => {
    const db = freshDb();
    const before = db.classes.length;
    expect(cancelClassIn(db, "CLS-NOPE")).toMatchObject({ ok: false });
    expect(db.classes).toHaveLength(before);
  });
});

describe("gym capacity setting", () => {
  it("accepts a sensible capacity", () => {
    const db = freshDb();
    expect(validateSettingsIn(db, { ...db.settings, maxCapacity: 150 })).toBeNull();
  });

  it("rejects zero, negative and fractional capacity", () => {
    const db = freshDb();
    expect(validateSettingsIn(db, { ...db.settings, maxCapacity: 0 })).not.toBeNull();
    expect(validateSettingsIn(db, { ...db.settings, maxCapacity: -5 })).not.toBeNull();
    expect(validateSettingsIn(db, { ...db.settings, maxCapacity: 10.5 })).not.toBeNull();
  });

  it("rejects a capacity lower than the biggest class", () => {
    const db = freshDb();
    const biggest = Math.max(...db.classes.map((c) => c.capacity));
    expect(validateSettingsIn(db, { ...db.settings, maxCapacity: biggest - 1 })).toContain("biggest class");
  });
});

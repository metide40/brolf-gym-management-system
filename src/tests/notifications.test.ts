import { describe, expect, it } from "vitest";
import { DEMO_ACCOUNTS, seedDatabase } from "../mockData";
import { addBookingIn, cancelBookingIn, cancelClassIn, migrateDatabase } from "../api/mockApi";
import { isReadBy, isVisibleTo, markAllReadFor, normalizeNotification, unreadCount, visibleNotifications, type StoredNotification } from "../lib/notifications";
import type { AppNotification, Database, Session } from "../types";

const freshDb = (): Database => {
  const db: Database = structuredClone(seedDatabase());
  db.bookings = [];
  db.waitlist = [];
  db.notifications = [];
  return db;
};

const memberSession = (memberId: string, email = "member@fitcore.io"): Session => ({ role: "member", name: "Member", email, memberId });
const admin: Session = { role: "admin", name: "Admin", email: "admin@fitcore.io" };
const reception: Session = { role: "reception", name: "Reception", email: "reception@fitcore.io" };
const trainer = (trainerId: string, email = "trainer@fitcore.io"): Session => ({ role: "trainer", name: "Trainer", email, trainerId });

const note = (overrides: Partial<AppNotification>): AppNotification => ({ id: "NT-X", title: "t", body: "b", at: "2026-01-01T00:00:00.000Z", audience: "all", readBy: [], ...overrides });

describe("who can see a notification", () => {
  it("shows an \"all\" notification to every role", () => {
    const n = note({ audience: "all" });
    [admin, reception, trainer("TR-01"), memberSession("M-1")].forEach((s) => expect(isVisibleTo(n, s)).toBe(true));
  });

  it("shows a role notification only to that role", () => {
    const n = note({ audience: "admin" });
    expect(isVisibleTo(n, admin)).toBe(true);
    expect(isVisibleTo(n, reception)).toBe(false);
    expect(isVisibleTo(n, memberSession("M-1"))).toBe(false);
  });

  it("supports several roles at once", () => {
    const n = note({ audience: ["admin", "reception"] });
    expect(isVisibleTo(n, admin)).toBe(true);
    expect(isVisibleTo(n, reception)).toBe(true);
    expect(isVisibleTo(n, trainer("TR-01"))).toBe(false);
    expect(isVisibleTo(n, memberSession("M-1"))).toBe(false);
  });

  it("shows a member notification only to that member", () => {
    const n = note({ audience: "member", memberId: "M-1" });
    expect(isVisibleTo(n, memberSession("M-1"))).toBe(true);
    expect(isVisibleTo(n, memberSession("M-2"))).toBe(false);
    expect(isVisibleTo(n, admin)).toBe(false);
    expect(isVisibleTo(n, trainer("TR-01"))).toBe(false);
  });

  it("shows a trainer notification only to that trainer", () => {
    const n = note({ audience: "trainer", trainerId: "TR-01" });
    expect(isVisibleTo(n, trainer("TR-01"))).toBe(true);
    expect(isVisibleTo(n, trainer("TR-02"))).toBe(false);
    expect(isVisibleTo(n, memberSession("TR-01"))).toBe(false);
  });
});

describe("reading is per person", () => {
  it("marks only the signed-in person's copy as read", () => {
    const all = [note({ id: "A", audience: "admin" }), note({ id: "B", audience: ["admin", "reception"] })];
    const other: Session = { ...admin, email: "second.admin@fitcore.io" };
    const after = markAllReadFor(all, admin);
    expect(unreadCount(after, admin)).toBe(0);
    expect(unreadCount(after, other)).toBe(1 + 1);
    expect(unreadCount(after, reception)).toBe(1);
    expect(isReadBy(after[0], admin)).toBe(true);
    expect(isReadBy(after[0], other)).toBe(false);
  });

  it("does not mark notifications the person cannot see", () => {
    const all = [note({ id: "A", audience: "member", memberId: "M-2" })];
    const after = markAllReadFor(all, memberSession("M-1"));
    expect(after[0].readBy).toEqual([]);
  });

  it("is not affected by upper or lower case in the email", () => {
    const after = markAllReadFor([note({ audience: "admin" })], { ...admin, email: "ADMIN@fitcore.io" });
    expect(isReadBy(after[0], admin)).toBe(true);
  });
});

describe("notifications created by actions", () => {
  const setupFullClass = (db: Database) => {
    const cls = db.classes[0];
    cls.capacity = 1;
    expect(addBookingIn(db, cls.id, "M-1").ok).toBe(true);
    expect(addBookingIn(db, cls.id, "M-2").ok).toBe(true); // waitlisted
    return cls;
  };

  it("tells the promoted member personally and staff separately, and nobody else", () => {
    const db = freshDb();
    const cls = setupFullClass(db);
    const booking = db.bookings.find((b) => b.classId === cls.id)!;

    cancelBookingIn(db, booking.id);

    const promoted = db.notifications.find((n) => n.memberId === "M-2");
    expect(promoted?.title).toBe("You got a seat");
    expect(db.notifications.some((n) => n.memberId === "M-1")).toBe(false);
    expect(isVisibleTo(promoted!, memberSession("M-2"))).toBe(true);
    expect(isVisibleTo(promoted!, memberSession("M-3"))).toBe(false);

    const staff = db.notifications.find((n) => n.title === "Waitlist auto-promoted")!;
    expect(isVisibleTo(staff, admin)).toBe(true);
    expect(isVisibleTo(staff, reception)).toBe(true);
    expect(isVisibleTo(staff, memberSession("M-2"))).toBe(false);
    expect(isVisibleTo(staff, memberSession("M-3"))).toBe(false);
    expect(isVisibleTo(staff, trainer("TR-01"))).toBe(false);
  });

  it("sends no notification when a cancelled seat has nobody waiting", () => {
    const db = freshDb();
    const cls = db.classes[0];
    addBookingIn(db, cls.id, "M-1");
    cancelBookingIn(db, db.bookings[0].id);
    expect(db.notifications).toHaveLength(0);
  });

  it("tells each affected member, the class trainer and staff when a class is cancelled", () => {
    const db = freshDb();
    const cls = setupFullClass(db);

    cancelClassIn(db, cls.id);

    const forMember = (id: string) => visibleNotifications(db.notifications, memberSession(id));
    expect(forMember("M-1")).toHaveLength(1);
    expect(forMember("M-2")).toHaveLength(1); // was on the waitlist
    expect(forMember("M-3")).toHaveLength(0); // unaffected member
    expect(visibleNotifications(db.notifications, trainer(cls.trainerId))).toHaveLength(1);
    expect(visibleNotifications(db.notifications, trainer("TR-99"))).toHaveLength(0);
    expect(visibleNotifications(db.notifications, admin)).toHaveLength(1);
    expect(visibleNotifications(db.notifications, reception)).toHaveLength(1);
  });

  it("sends one notification to a member who held a booking only once", () => {
    const db = freshDb();
    const cls = db.classes[0];
    addBookingIn(db, cls.id, "M-1");
    cancelClassIn(db, cls.id);
    expect(db.notifications.filter((n) => n.memberId === "M-1")).toHaveLength(1);
  });
});

describe("seed data and older saved data", () => {
  it("makes the demo member's plan notification personal, and unread for everyone", () => {
    const db = seedDatabase();
    const plan = db.notifications.find((n) => n.id === "NT-4")!;
    expect(plan.memberId).toBe(db.members[0].id);
    expect(plan.readBy).toEqual([]);
    expect(visibleNotifications(db.notifications, memberSession(db.members[1].id))).not.toContain(plan);
  });

  it("keeps staff-only seed notifications away from members", () => {
    const db = seedDatabase();
    const memberView = visibleNotifications(db.notifications, memberSession(db.members[0].id));
    expect(memberView.map((n) => n.id)).toEqual(["NT-4"]);
  });

  it("upgrades a notification saved with the old shared read flag", () => {
    const readOne: StoredNotification = { id: "NT-5", title: "t", body: "b", at: "x", audience: "reception", read: true };
    const unreadOne: StoredNotification = { id: "NT-2", title: "t", body: "b", at: "x", audience: "admin", read: false };
    const upgradedRead = normalizeNotification(readOne, DEMO_ACCOUNTS);
    const upgradedUnread = normalizeNotification(unreadOne, DEMO_ACCOUNTS);
    expect(upgradedRead.readBy).toEqual(["reception@fitcore.io"]);
    expect(upgradedUnread.readBy).toEqual([]);
    expect("read" in upgradedRead).toBe(false);
  });

  it("upgrades a whole saved database and leaves already-upgraded data alone", () => {
    const old: Partial<Database> = structuredClone(seedDatabase());
    old.notifications = [
      { id: "NT-1", title: "t", body: "b", at: "x", audience: "all", read: true } as unknown as AppNotification,
      { id: "NT-2", title: "t", body: "b", at: "x", audience: "admin", readBy: ["admin@fitcore.io"] },
    ];
    const upgraded = migrateDatabase(old);
    expect(upgraded.notifications[0].readBy.sort()).toEqual(DEMO_ACCOUNTS.map((a) => a.email).sort());
    expect(upgraded.notifications[1].readBy).toEqual(["admin@fitcore.io"]);
    expect(migrateDatabase(structuredClone(upgraded)).notifications).toEqual(upgraded.notifications);
  });

  it("copes with saved data that has no notifications list", () => {
    const old: Partial<Database> = structuredClone(seedDatabase());
    delete (old as { notifications?: unknown }).notifications;
    expect(migrateDatabase(old).notifications).toEqual([]);
  });
});

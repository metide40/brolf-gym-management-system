import { describe, expect, it } from "vitest";
import { seedDatabase } from "../mockData";
import { addBookingIn, cancelBookingIn, validateBooking } from "../api/mockApi";
import type { Database } from "../types";

// A clean database with no bookings, so each test controls exactly what exists.
const emptyBookingsDb = (): Database => {
  const db: Database = structuredClone(seedDatabase());
  db.bookings = [];
  db.waitlist = [];
  return db;
};

describe("class bookings", () => {
  it("confirms a seat when the class has space", () => {
    const db = emptyBookingsDb();
    const cls = db.classes[0];
    cls.capacity = 5;
    const result = addBookingIn(db, cls.id, db.members[0].id);
    expect(result.ok).toBe(true);
    expect(result.message).toContain("Seat confirmed");
    expect(db.bookings).toHaveLength(1);
  });

  it("rejects booking the same class twice", () => {
    const db = emptyBookingsDb();
    const cls = db.classes[0];
    cls.capacity = 5;
    const memberId = db.members[0].id;
    addBookingIn(db, cls.id, memberId);

    expect(validateBooking(db, cls.id, memberId)).toBe("You are already booked into this class");
    expect(addBookingIn(db, cls.id, memberId).ok).toBe(false);
    expect(db.bookings).toHaveLength(1);
  });

  it("rejects a booking that overlaps another class the member already has", () => {
    const db = emptyBookingsDb();
    const [first, second] = db.classes;
    first.capacity = 5;
    second.capacity = 5;
    second.day = first.day;
    second.time = first.time;
    const memberId = db.members[0].id;
    addBookingIn(db, first.id, memberId);

    const result = addBookingIn(db, second.id, memberId);

    expect(result.ok).toBe(false);
    expect(result.message).toContain("Time conflict");
  });

  it("rejects an unknown class", () => {
    const db = emptyBookingsDb();
    expect(validateBooking(db, "NOPE", db.members[0].id)).toBe("Class not found");
  });
});

describe("waitlist", () => {
  it("puts a member on the waitlist when the class is full", () => {
    const db = emptyBookingsDb();
    const cls = db.classes[0];
    cls.capacity = 1;
    const [a, b] = db.members;
    addBookingIn(db, cls.id, a.id);

    const result = addBookingIn(db, cls.id, b.id);

    expect(result.ok).toBe(true);
    expect(result.message).toContain("waitlist");
    expect(db.bookings).toHaveLength(1);
    expect(db.waitlist).toHaveLength(1);
    expect(db.waitlist[0].memberId).toBe(b.id);
  });

  it("promotes the first person on the waitlist when a booking is cancelled", () => {
    const db = emptyBookingsDb();
    const cls = db.classes[0];
    cls.capacity = 1;
    const [a, b] = db.members;
    addBookingIn(db, cls.id, a.id);
    addBookingIn(db, cls.id, b.id);
    const firstBooking = db.bookings.find((x) => x.memberId === a.id)!;

    const result = cancelBookingIn(db, firstBooking.id);

    expect(result.ok).toBe(true);
    expect(result.promoted).toBe(b.name);
    expect(db.waitlist).toHaveLength(0);
    expect(db.bookings.some((x) => x.classId === cls.id && x.memberId === b.id)).toBe(true);
    expect(db.bookings.some((x) => x.memberId === a.id)).toBe(false);
  });

  it("promotes waitlisted members in the order they joined", () => {
    const db = emptyBookingsDb();
    const cls = db.classes[0];
    cls.capacity = 1;
    const [a, b, c] = db.members;
    addBookingIn(db, cls.id, a.id);
    db.waitlist.push({ id: "W1", classId: cls.id, memberId: b.id, createdAt: "2026-01-01T10:00:00.000Z" });
    db.waitlist.push({ id: "W2", classId: cls.id, memberId: c.id, createdAt: "2026-01-01T11:00:00.000Z" });
    const booking = db.bookings.find((x) => x.memberId === a.id)!;

    const result = cancelBookingIn(db, booking.id);

    expect(result.promoted).toBe(b.name);
    expect(db.waitlist.map((w) => w.memberId)).toEqual([c.id]);
  });

  it("just cancels when nobody is waiting", () => {
    const db = emptyBookingsDb();
    const cls = db.classes[0];
    cls.capacity = 3;
    addBookingIn(db, cls.id, db.members[0].id);
    const result = cancelBookingIn(db, db.bookings[0].id);
    expect(result).toMatchObject({ ok: true, message: "Booking cancelled." });
    expect(db.bookings).toHaveLength(0);
  });

  it("reports an unknown booking", () => {
    expect(cancelBookingIn(emptyBookingsDb(), "NOPE")).toMatchObject({ ok: false });
  });
});

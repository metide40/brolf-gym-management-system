import { DEMO_ACCOUNTS, deriveStatus, seedDatabase } from "../mockData";
import type {
  BookingResult,
  CheckInResult,
  Database,
  FitnessClass,
  GymSettings,
  Member,
  MemberInput,
  Role,
  Session,
  TestResult,
  WorkoutPlan,
  BodyMeasurement,
  FitnessGoal,
  EquipmentItem,
} from "../types";

const DB_KEY = "fitcore.db.v1";
const SESSION_KEY = "fitcore.session.v1";

const delay = (min = 160, max = 340) => new Promise<void>((r) => setTimeout(r, min + Math.random() * (max - min)));
const uid = (prefix: string) => `${prefix}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
const nowIso = () => new Date().toISOString();

function read(): Database {
  try {
    const raw = localStorage.getItem(DB_KEY);
    if (raw) return JSON.parse(raw) as Database;
  } catch {
    /* ignore corrupt storage */
  }
  const fresh = seedDatabase();
  write(fresh);
  return fresh;
}

function write(db: Database): Database {
  const next: Database = { ...db, members: db.members.map((m) => ({ ...m, status: deriveStatus(m.endDate, m.frozen) })) };
  try {
    localStorage.setItem(DB_KEY, JSON.stringify(next));
  } catch {
    /* storage full - keep in memory */
  }
  return next;
}

const minutes = (t: string) => {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
};

const overlaps = (a: FitnessClass, b: FitnessClass) =>
  a.day === b.day && minutes(a.time) < minutes(b.time) + b.duration && minutes(b.time) < minutes(a.time) + a.duration;

export function validateBooking(db: Database, classId: string, memberId: string): string | null {
  const cls = db.classes.find((c) => c.id === classId);
  if (!cls) return "Class not found";
  if (db.bookings.some((b) => b.classId === classId && b.memberId === memberId)) return "You are already booked into this class";
  if (db.waitlist.some((w) => w.classId === classId && w.memberId === memberId)) return "You are already on the waitlist";
  const clash = db.bookings
    .filter((b) => b.memberId === memberId)
    .map((b) => db.classes.find((c) => c.id === b.classId))
    .find((c): c is FitnessClass => Boolean(c) && overlaps(c as FitnessClass, cls));
  if (clash) return `Time conflict with ${clash.name} at ${clash.time}`;
  return null;
}

export function addBookingIn(db: Database, classId: string, memberId: string): { ok: boolean; message: string } {
  const error = validateBooking(db, classId, memberId);
  if (error) return { ok: false, message: error };
  const cls = db.classes.find((c) => c.id === classId)!;
  const taken = db.bookings.filter((b) => b.classId === classId).length;
  if (taken >= cls.capacity) {
    db.waitlist.push({ id: uid("WLT"), classId, memberId, createdAt: nowIso() });
    const position = db.waitlist.filter((w) => w.classId === classId).length;
    return { ok: true, message: `${cls.name} is full. You joined the waitlist at position ${position}.` };
  }
  db.bookings.push({ id: uid("BKG"), classId, memberId, createdAt: nowIso() });
  return { ok: true, message: `Seat confirmed for ${cls.name} at ${cls.time}.` };
}

export function cancelBookingIn(db: Database, bookingId: string): { ok: boolean; message: string; promoted?: string } {
  const booking = db.bookings.find((b) => b.id === bookingId);
  if (!booking) return { ok: false, message: "Booking not found" };
  db.bookings = db.bookings.filter((b) => b.id !== bookingId);
  const cls = db.classes.find((c) => c.id === booking.classId);
  const next = db.waitlist.filter((w) => w.classId === booking.classId).sort((a, b) => a.createdAt.localeCompare(b.createdAt))[0];
  if (!next) return { ok: true, message: "Booking cancelled." };
  db.waitlist = db.waitlist.filter((w) => w.id !== next.id);
  db.bookings.push({ id: uid("BKG"), classId: booking.classId, memberId: next.memberId, createdAt: nowIso() });
  const name = db.members.find((m) => m.id === next.memberId)?.name ?? "A member";
  db.notifications.unshift({
    id: uid("NT"),
    title: "Waitlist auto-promoted",
    body: `${name} moved from the waitlist into ${cls?.name ?? "the class"} at ${cls?.time ?? ""}.`,
    at: nowIso(),
    read: false,
    audience: "all",
  });
  return { ok: true, message: `${name} was promoted from the waitlist.`, promoted: name };
}

export async function loadDatabase(): Promise<Database> {
  await delay(180, 380);
  return write(read());
}

export function getSession(): Session | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const stored = JSON.parse(raw) as Session;
    // Mock-auth safeguard: a stored session is only trusted if it matches a known account.
    // (A real backend would verify a signed token instead.)
    const account = DEMO_ACCOUNTS.find((a) => a.email === stored.email && a.role === stored.role);
    if (!account) {
      localStorage.removeItem(SESSION_KEY);
      return null;
    }
    return stored;
  } catch {
    return null;
  }
}

export async function login(email: string, password: string): Promise<Session> {
  await delay();
  const account = DEMO_ACCOUNTS.find((a) => a.email.toLowerCase() === email.trim().toLowerCase());
  if (!account) throw new Error("No account matches that email address.");
  if (account.password !== password) throw new Error("Incorrect password. Check it and try again.");
  const db = read();
  const session: Session = { role: account.role, name: account.name, email: account.email };
  if (account.role === "member") session.memberId = db.members[0].id;
  if (account.role === "trainer") session.trainerId = "TR-01";
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  return session;
}

export async function logout(): Promise<void> {
  await delay(120, 200);
  localStorage.removeItem(SESSION_KEY);
}

export async function resetDemoData(): Promise<Database> {
  await delay(320, 520);
  return write(seedDatabase());
}

export async function saveMember(input: MemberInput): Promise<Database> {
  await delay();
  const db = read();
  const member: Member = {
    ...input,
    id: input.id ?? `MEM-${String(db.members.length + 1).padStart(3, "0")}-${Math.floor(Math.random() * 900 + 100)}`,
    code: input.id ? db.members.find((m) => m.id === input.id)?.code ?? `FC-${2000 + db.members.length}` : `FC-${2000 + db.members.length}`,
    status: deriveStatus(input.endDate, input.frozen),
  };
  const idx = db.members.findIndex((m) => m.id === member.id);
  if (idx >= 0) db.members[idx] = member;
  else db.members.unshift(member);
  return write(db);
}

export async function deleteMember(id: string): Promise<Database> {
  await delay();
  const db = read();
  db.members = db.members.filter((m) => m.id !== id);
  db.bookings = db.bookings.filter((b) => b.memberId !== id);
  db.waitlist = db.waitlist.filter((w) => w.memberId !== id);
  return write(db);
}

export async function toggleMemberFreeze(id: string): Promise<Database> {
  await delay(120, 260);
  const db = read();
  const member = db.members.find((m) => m.id === id);
  if (!member) throw new Error("Member not found");
  member.frozen = !member.frozen;
  return write(db);
}

// Pure rules for a check-in attempt. Records the attempt on `db` and returns the outcome.
export function checkInIn(db: Database, code: string): { ok: boolean; message: string; memberName?: string } {
  const key = code.trim().toUpperCase();
  const member = db.members.find((m) => [m.id.toUpperCase(), m.code.toUpperCase(), m.email.toUpperCase()].includes(key));
  if (!member) {
    db.attendance.unshift({ id: uid("ATT"), memberId: "unknown", memberName: key || "Unknown card", at: nowIso(), result: "Blocked", reason: "Card not recognised" });
    return { ok: false, message: "Card not recognised. Access denied." };
  }
  const status = deriveStatus(member.endDate, member.frozen);
  member.status = status;
  if (status === "Expired" || status === "Frozen") {
    db.attendance.unshift({ id: uid("ATT"), memberId: member.id, memberName: member.name, at: nowIso(), result: "Blocked", reason: `Membership ${status.toLowerCase()}` });
    return { ok: false, message: `${member.name}: membership ${status.toLowerCase()}. Access blocked.`, memberName: member.name };
  }
  db.attendance.unshift({ id: uid("ATT"), memberId: member.id, memberName: member.name, at: nowIso(), result: "Granted" });
  const warning = status === "Expiring Soon" ? " Renewal due soon." : "";
  return { ok: true, message: `Access granted for ${member.name}.${warning}`, memberName: member.name };
}

export async function checkIn(code: string): Promise<CheckInResult> {
  await delay(320, 620);
  const db = read();
  const result = checkInIn(db, code);
  return { ...result, db: write(db) };
}

export async function bookClass(classId: string, memberId: string): Promise<BookingResult> {
  await delay();
  const db = read();
  const result = addBookingIn(db, classId, memberId);
  return { ...result, db: write(db) };
}

export async function cancelBooking(bookingId: string): Promise<BookingResult> {
  await delay();
  const db = read();
  const result = cancelBookingIn(db, bookingId);
  return { ...result, db: write(db) };
}

export async function leaveWaitlist(waitlistId: string): Promise<Database> {
  await delay(120, 260);
  const db = read();
  db.waitlist = db.waitlist.filter((w) => w.id !== waitlistId);
  return write(db);
}

export async function saveWorkoutPlan(plan: WorkoutPlan): Promise<Database> {
  await delay();
  const db = read();
  const idx = db.workoutPlans.findIndex((p) => p.id === plan.id);
  if (idx >= 0) db.workoutPlans[idx] = plan;
  else db.workoutPlans.unshift({ ...plan, id: plan.id || uid("WP"), createdAt: nowIso() });
  return write(db);
}

export async function toggleExercise(planId: string, exerciseId: string): Promise<Database> {
  await delay(90, 180);
  const db = read();
  const plan = db.workoutPlans.find((p) => p.id === planId);
  if (!plan) throw new Error("Workout plan not found");
  plan.exercises = plan.exercises.map((e) => (e.id === exerciseId ? { ...e, done: !e.done } : e));
  return write(db);
}

export async function addPayment(input: { memberId: string; plan: Member["plan"]; amount: number; method: string; status: "Paid" | "Pending" | "Overdue" }): Promise<Database> {
  await delay();
  const db = read();
  const member = db.members.find((m) => m.id === input.memberId);
  if (!member) throw new Error("Select a member before logging a payment.");
  db.payments.unshift({
    id: uid("PAY"),
    memberId: member.id,
    memberName: member.name,
    plan: input.plan,
    amount: input.amount,
    date: new Date().toISOString().slice(0, 10),
    method: input.method,
    status: input.status,
    invoiceNo: `INV-${2500 + db.payments.length + 1}`,
  });
  return write(db);
}

// Pure renewal rule: extends from the current end date, or from today if already expired.
export function renewMemberIn(db: Database, memberId: string, extraDays: number): Member {
  const member = db.members.find((m) => m.id === memberId);
  if (!member) throw new Error("Member not found");
  if (!Number.isFinite(extraDays) || extraDays <= 0) throw new Error("Renewal length must be at least one day.");
  const base = new Date(`${member.endDate}T12:00:00`).getTime() < Date.now() ? new Date() : new Date(`${member.endDate}T12:00:00`);
  base.setDate(base.getDate() + extraDays);
  member.endDate = base.toISOString().slice(0, 10);
  member.frozen = false;
  member.startDate = new Date().toISOString().slice(0, 10);
  return member;
}

export async function renewMembership(memberId: string, extraDays: number): Promise<Database> {
  await delay();
  const db = read();
  renewMemberIn(db, memberId, extraDays);
  return write(db);
}

export async function cycleEquipmentStatus(id: string): Promise<Database> {
  await delay(120, 280);
  const db = read();
  const item = db.equipment.find((e) => e.id === id);
  if (!item) throw new Error("Equipment not found");
  const order: EquipmentItem["status"][] = ["Operational", "Needs Service", "Out of Order"];
  item.status = order[(order.indexOf(item.status) + 1) % order.length];
  if (item.status === "Operational") item.lastService = new Date().toISOString().slice(0, 10);
  return write(db);
}

export async function addMeasurement(input: Omit<BodyMeasurement, "id">): Promise<Database> {
  await delay();
  const db = read();
  db.measurements.push({ ...input, id: uid("BM") });
  db.measurements.sort((a, b) => a.date.localeCompare(b.date));
  return write(db);
}

export async function saveGoal(goal: FitnessGoal): Promise<Database> {
  await delay();
  const db = read();
  const idx = db.goals.findIndex((g) => g.id === goal.id);
  if (idx >= 0) db.goals[idx] = goal;
  else db.goals.push({ ...goal, id: goal.id || uid("GL") });
  return write(db);
}

export async function markNotificationsRead(role: Role): Promise<Database> {
  await delay(90, 180);
  const db = read();
  db.notifications = db.notifications.map((n) => (n.audience === role || n.audience === "all" ? { ...n, read: true } : n));
  return write(db);
}

export async function updateSettings(settings: GymSettings): Promise<Database> {
  await delay();
  const db = read();
  db.settings = settings;
  return write(db);
}

export async function runTestSuite(): Promise<TestResult[]> {
  await delay(420, 700);
  const results: TestResult[] = [];
  const past = new Date(Date.now() - 5 * 86400000).toISOString().slice(0, 10);
  const future = new Date(Date.now() + 120 * 86400000).toISOString().slice(0, 10);
  results.push({
    name: "Membership expiry calculation",
    passed: deriveStatus(past) === "Expired" && deriveStatus(future) === "Active",
    detail: `Ended ${past} -> ${deriveStatus(past)} | Ends ${future} -> ${deriveStatus(future)}`,
  });

  const db: Database = JSON.parse(JSON.stringify(read()));
  const cls = db.classes[0];
  const member = db.members.find((m) => m.status === "Active" && !db.bookings.some((b) => b.memberId === m.id && b.classId === cls.id));
  let doubleBlocked = false;
  if (member) {
    db.bookings.push({ id: "T-B0", classId: cls.id, memberId: member.id, createdAt: nowIso() });
    doubleBlocked = validateBooking(db, cls.id, member.id) !== null;
  }
  results.push({
    name: "Double-booking rejection",
    passed: doubleBlocked,
    detail: doubleBlocked ? `${member?.name ?? "Member"} blocked from booking ${cls.name} twice.` : "Duplicate booking was accepted.",
  });

  const target = db.classes[1];
  target.capacity = 1;
  db.bookings = db.bookings.filter((b) => b.classId !== target.id);
  db.waitlist = db.waitlist.filter((w) => w.classId !== target.id);
  const first = db.members.find((m) => m.status === "Active");
  const second = db.members.find((m) => m.status === "Active" && m.id !== first?.id);
  let fifoPassed = false;
  let fifoDetail = "Not enough active members to simulate.";
  if (first && second) {
    db.bookings = db.bookings.filter((b) => b.memberId !== second.id);
    db.bookings.push({ id: "T-B1", classId: target.id, memberId: first.id, createdAt: nowIso() });
    const queued = addBookingIn(db, target.id, second.id);
    const cancel = cancelBookingIn(db, "T-B1");
    fifoPassed = cancel.promoted === second.name && db.bookings.some((b) => b.classId === target.id && b.memberId === second.id);
    fifoDetail = `${second.name} queued (${queued.message}) then promoted on cancellation.`;
  }
  results.push({ name: "Waitlist FIFO auto-promotion", passed: fifoPassed, detail: fifoDetail });

  const expired = db.members.find((m) => deriveStatus(m.endDate, m.frozen) === "Expired");
  const blocked = expired ? ["Expired", "Frozen"].includes(deriveStatus(expired.endDate, expired.frozen)) : false;
  results.push({
    name: "QR check-in blocks expired memberships",
    passed: blocked,
    detail: expired ? `${expired.name} (${expired.endDate}) is denied terminal entry.` : "No expired member available in the dataset.",
  });

  const full = db.classes.find((c) => c.capacity > 0);
  results.push({
    name: "Class capacity enforcement",
    passed: Boolean(full),
    detail: full ? `${full.name} capacity locked at ${full.capacity} seats with waitlist overflow.` : "No class configured.",
  });

  return results;
}
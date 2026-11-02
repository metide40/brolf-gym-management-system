import type {
  AppNotification,
  AttendanceLog,
  Booking,
  BodyMeasurement,
  Database,
  EquipmentItem,
  Exercise,
  FitnessClass,
  FitnessGoal,
  Member,
  MemberStatus,
  Trainer,
  PaymentRecord,
  PlanName,
  Role,
  WorkoutPlan,
} from "./types";

export const DEMO_ACCOUNTS = [
  { role: "admin" as Role, name: "Ava Sterling", email: "admin@fitcore.io", password: "fitcore123", title: "System Administrator" },
  { role: "reception" as Role, name: "Noah Brooks", email: "reception@fitcore.io", password: "fitcore123", title: "Front Desk Lead" },
  { role: "trainer" as Role, name: "Marcus Vale", email: "trainer@fitcore.io", password: "fitcore123", title: "Senior Performance Coach" },
  { role: "member" as Role, name: "Jordan Reyes", email: "member@fitcore.io", password: "fitcore123", title: "VIP Member" },
];

export const SEED_TRAINERS: Trainer[] = [
  { id: "TR-01", name: "Marcus Vale", specialty: "Strength & Conditioning", availability: "Mon-Fri, 06:00-14:00" },
  { id: "TR-02", name: "Lena Okafor", specialty: "HIIT / Metabolic", availability: "Mon-Sat, 06:00-12:00" },
  { id: "TR-03", name: "Diego Santos", specialty: "Spin & Endurance", availability: "Tue-Sun, 07:00-15:00" },
  { id: "TR-04", name: "Priya Raman", specialty: "Power Yoga & Mobility", availability: "Mon-Fri, 08:00-16:00" },
  { id: "TR-05", name: "Erik Lindqvist", specialty: "CrossFit / Olympic Lifts", availability: "Mon-Sat, 14:00-21:00" },
  { id: "TR-06", name: "Amara Diallo", specialty: "Boxing & Conditioning", availability: "Wed-Sun, 12:00-20:00" },
];

export const PLANS: Record<PlanName, { price: number; days: number }> = {
  Monthly: { price: 69, days: 30 },
  Quarterly: { price: 189, days: 90 },
  Annual: { price: 649, days: 365 },
  VIP: { price: 1190, days: 365 },
};

export const PLAN_NAMES: PlanName[] = ["Monthly", "Quarterly", "Annual", "VIP"];

export function deriveStatus(endDate: string, frozen?: boolean): MemberStatus {
  if (frozen) return "Frozen";
  const end = new Date(`${endDate}T23:59:59`).getTime();
  const days = Math.ceil((end - Date.now()) / 86400000);
  if (days < 0) return "Expired";
  if (days <= 14) return "Expiring Soon";
  return "Active";
}

export function trainerName(trainers: Trainer[], id: string): string {
  return trainers.find((t) => t.id === id)?.name ?? "Unassigned";
}

const FIRST = ["Jordan", "Ava", "Noah", "Marcus", "Lena", "Diego", "Priya", "Erik", "Amara", "Sofia", "Liam", "Mia", "Ethan", "Zoe", "Omar", "Nina", "Kai", "Ruth", "Tariq", "Isla"];
const LAST = ["Reyes", "Sterling", "Brooks", "Vale", "Okafor", "Santos", "Raman", "Lindqvist", "Diallo", "Marchetti", "Hughes", "Kowalski", "Bennett", "Ali", "Novak", "Fischer", "Moreau", "Silva", "Haddad", "Kim"];
const GOALS = ["Fat loss", "Muscle gain", "Endurance", "Mobility", "Strength PR", "General fitness"];

const CLASS_SEED: [string, string, number, string, string, number, number, string][] = [
  ["HIIT Ignite", "HIIT", 1, "Mon", "06:30", 45, 16, "Studio A"],
  ["Sunrise Spin", "Spin", 2, "Mon", "07:30", 45, 12, "Cycle Room"],
  ["Power Yoga", "Yoga", 3, "Tue", "08:00", 60, 20, "Studio B"],
  ["Crossfit WOD", "CrossFit", 4, "Tue", "17:30", 60, 14, "The Pit"],
  ["Box & Burn", "Boxing", 5, "Wed", "06:30", 45, 12, "Ring Zone"],
  ["Metcon Circuit", "Conditioning", 1, "Wed", "18:00", 45, 18, "Studio A"],
  ["Reformer Pilates", "Pilates", 3, "Thu", "09:00", 50, 10, "Studio B"],
  ["Endurance Ride", "Spin", 2, "Thu", "19:00", 50, 12, "Cycle Room"],
  ["Mobility Reset", "Mobility", 3, "Fri", "07:00", 40, 20, "Studio B"],
  ["Olympic Lifting", "Strength", 4, "Fri", "17:00", 75, 10, "The Pit"],
  ["Saturday Sweat", "HIIT", 5, "Sat", "09:00", 60, 24, "Studio A"],
  ["Deep Stretch", "Mobility", 3, "Sat", "11:00", 45, 18, "Studio B"],
];

export function seedDatabase(): Database {
  let seed = 7;
  const rnd = () => {
    seed = (seed * 1103515245 + 12345) % 2147483648;
    return seed / 2147483648;
  };
  const iso = (d: Date) => d.toISOString().slice(0, 10);
  const shift = (days: number) => {
    const d = new Date();
    d.setDate(d.getDate() + days);
    return iso(d);
  };

  const members: Member[] = Array.from({ length: 40 }, (_, i) => {
    const idx = i + 1;
    const name = idx === 1 ? "Jordan Reyes" : `${FIRST[Math.floor(rnd() * FIRST.length)]} ${LAST[Math.floor(rnd() * LAST.length)]}`;
    const plan: PlanName = idx === 1 ? "VIP" : PLAN_NAMES[i % 4];
    const startOffset = idx === 1 ? -95 : -(20 + Math.floor(rnd() * 320));
    const endDate = shift(startOffset + PLANS[plan].days);
    const frozen = idx !== 1 && idx % 11 === 0;
    return {
      id: `MEM-${String(idx).padStart(3, "0")}`,
      code: `FC-${1000 + idx}`,
      name,
      email: `${name.toLowerCase().replace(/[^a-z]+/g, ".")}${idx}@fitcoremail.com`,
      phone: `+1 (415) ${200 + Math.floor(rnd() * 700)}-${1000 + Math.floor(rnd() * 8999)}`,
      plan,
      startDate: shift(startOffset),
      endDate,
      trainerId: SEED_TRAINERS[i % SEED_TRAINERS.length].id,
      status: deriveStatus(endDate, frozen),
      frozen,
      joinedAt: shift(startOffset),
      goal: GOALS[i % GOALS.length],
      notes: "",
    };
  });

  const classes: FitnessClass[] = CLASS_SEED.map((c, i) => ({
    id: `CLS-${String(i + 1).padStart(2, "0")}`,
    name: c[0],
    category: c[1],
    trainerId: SEED_TRAINERS[c[2]].id,
    day: c[3],
    time: c[4],
    duration: c[5],
    capacity: c[6],
    room: c[7],
  }));

  const bookings: Booking[] = [];
  const fullClass = classes[1];
  members.slice(1, 1 + fullClass.capacity).forEach((m, i) => {
    bookings.push({ id: `BKG-${i + 1}`, classId: fullClass.id, memberId: m.id, createdAt: shift(-2) });
  });
  bookings.push({ id: "BKG-90", classId: classes[0].id, memberId: "MEM-001", createdAt: shift(-1) });
  bookings.push({ id: "BKG-91", classId: classes[3].id, memberId: "MEM-001", createdAt: shift(-1) });
  bookings.push({ id: "BKG-92", classId: classes[4].id, memberId: "MEM-002", createdAt: shift(-1) });

  const waitlist = [{ id: "WLT-01", classId: fullClass.id, memberId: "MEM-014", createdAt: new Date().toISOString() }];

  const payments: PaymentRecord[] = [];
  members.forEach((m, i) => {
    const cycles = m.plan === "Monthly" ? 2 : 1;
    for (let c = 0; c < cycles; c += 1) {
      const status = i % 9 === 0 && c === 0 ? "Overdue" : i % 7 === 0 && c === 0 ? "Pending" : "Paid";
      payments.push({
        id: `PAY-${1000 + payments.length}`,
        memberId: m.id,
        memberName: m.name,
        plan: m.plan,
        amount: PLANS[m.plan].price,
        date: shift(-(c * PLANS[m.plan].days) - (i % 14)),
        method: i % 3 === 0 ? "Card" : i % 3 === 1 ? "Cash" : "Transfer",
        status,
        invoiceNo: `INV-${2400 + payments.length}`,
      });
    }
  });
  payments.sort((a, b) => (a.date < b.date ? 1 : -1));

  const attendance: AttendanceLog[] = Array.from({ length: 22 }, (_, i) => {
    const m = members[(i * 3) % members.length];
    const blocked = m.status === "Expired" || m.status === "Frozen";
    return {
      id: `ATT-${i + 1}`,
      memberId: m.id,
      memberName: m.name,
      at: new Date(Date.now() - i * 41 * 60000).toISOString(),
      result: blocked ? "Blocked" : "Granted",
      reason: blocked ? `Membership ${m.status.toLowerCase()}` : undefined,
    };
  });

  const ex = (id: string, name: string, muscle: string, sets: number, reps: number, weight: number, rest: number): Exercise => ({
    id,
    name,
    muscle,
    sets,
    reps,
    weight,
    rest,
    done: false,
  });

  const workoutPlans: WorkoutPlan[] = [
    {
      id: "WP-01",
      memberId: "MEM-001",
      trainerId: "TR-01",
      title: "Hypertrophy Block A",
      focus: "Upper body strength",
      createdAt: shift(-14),
      streak: 6,
      exercises: [
        ex("EX-1", "Incline Bench Press", "Chest", 4, 8, 60, 90),
        ex("EX-2", "Barbell Row", "Back", 4, 10, 55, 90),
        ex("EX-3", "Seated Dumbbell Press", "Shoulders", 3, 12, 20, 60),
        ex("EX-4", "Cable Fly", "Chest", 3, 15, 15, 45),
        ex("EX-5", "Hanging Leg Raise", "Core", 3, 15, 0, 45),
      ],
    },
    {
      id: "WP-02",
      memberId: "MEM-001",
      trainerId: "TR-04",
      title: "Mobility & Recovery",
      focus: "Hips and thoracic spine",
      createdAt: shift(-6),
      streak: 2,
      exercises: [
        ex("EX-6", "90/90 Hip Switch", "Hips", 3, 10, 0, 30),
        ex("EX-7", "Thoracic Opener", "Spine", 3, 8, 0, 30),
        ex("EX-8", "Deep Squat Hold", "Legs", 3, 1, 0, 45),
      ],
    },
    {
      id: "WP-03",
      memberId: "MEM-005",
      trainerId: "TR-02",
      title: "Metcon Sprint",
      focus: "Fat loss conditioning",
      createdAt: shift(-9),
      streak: 4,
      exercises: [
        ex("EX-9", "Kettlebell Swing", "Full body", 5, 20, 24, 60),
        ex("EX-10", "Row Sprint", "Cardio", 5, 1, 0, 60),
        ex("EX-11", "Burpee Box Jump", "Full body", 4, 12, 0, 60),
      ],
    },
    {
      id: "WP-04",
      memberId: "MEM-009",
      trainerId: "TR-05",
      title: "Olympic Base",
      focus: "Power development",
      createdAt: shift(-21),
      streak: 3,
      exercises: [
        ex("EX-12", "Power Clean", "Full body", 5, 3, 70, 120),
        ex("EX-13", "Front Squat", "Legs", 4, 5, 80, 120),
        ex("EX-14", "Push Press", "Shoulders", 4, 6, 45, 90),
      ],
    },
  ];

  const measurements: BodyMeasurement[] = [
    { id: "BM-1", memberId: "MEM-001", date: shift(-150), weight: 88.4, bodyFat: 24.1, chest: 104, waist: 94, arms: 34 },
    { id: "BM-2", memberId: "MEM-001", date: shift(-120), weight: 86.9, bodyFat: 22.8, chest: 105, waist: 92, arms: 34.5 },
    { id: "BM-3", memberId: "MEM-001", date: shift(-90), weight: 85.2, bodyFat: 21.4, chest: 106, waist: 90, arms: 35 },
    { id: "BM-4", memberId: "MEM-001", date: shift(-60), weight: 83.8, bodyFat: 19.9, chest: 107, waist: 88, arms: 35.8 },
    { id: "BM-5", memberId: "MEM-001", date: shift(-30), weight: 82.1, bodyFat: 18.2, chest: 108, waist: 86, arms: 36.4 },
    { id: "BM-6", memberId: "MEM-001", date: shift(-3), weight: 80.6, bodyFat: 16.9, chest: 109, waist: 84, arms: 37.1 },
  ];

  const goals: FitnessGoal[] = [
    { id: "GL-1", memberId: "MEM-001", title: "Target body weight", current: 80.6, target: 76, unit: "kg", deadline: shift(75) },
    { id: "GL-2", memberId: "MEM-001", title: "Weekly sessions", current: 4, target: 5, unit: "x", deadline: shift(14) },
  ];

  const equipment: EquipmentItem[] = [
    { id: "EQ-01", name: "Concept2 Rower", category: "Cardio", status: "Operational", lastService: shift(-40), note: "PM every 90 days" },
    { id: "EQ-02", name: "Assault Bike Pro", category: "Cardio", status: "Needs Service", lastService: shift(-120), note: "Chain tension loose" },
    { id: "EQ-03", name: "Squat Rack 4", category: "Strength", status: "Operational", lastService: shift(-12), note: "New J-hooks fitted" },
    { id: "EQ-04", name: "Treadmill 9", category: "Cardio", status: "Out of Order", lastService: shift(-200), note: "Belt motor replacement queued" },
    { id: "EQ-05", name: "Cable Crossover", category: "Strength", status: "Operational", lastService: shift(-25), note: "" },
    { id: "EQ-06", name: "Leg Press 45", category: "Strength", status: "Operational", lastService: shift(-18), note: "" },
    { id: "EQ-07", name: "Spin Bike 12", category: "Cardio", status: "Needs Service", lastService: shift(-95), note: "Seat post slipping" },
    { id: "EQ-08", name: "Heavy Bag 5", category: "Boxing", status: "Operational", lastService: shift(-8), note: "" },
    { id: "EQ-09", name: "Reformer 3", category: "Pilates", status: "Operational", lastService: shift(-33), note: "" },
    { id: "EQ-10", name: "Sled Track", category: "Conditioning", status: "Operational", lastService: shift(-52), note: "" },
  ];

  const notifications: AppNotification[] = [
    { id: "NT-1", title: "Spin class full", body: "Sunrise Spin hit capacity. 1 member on the waitlist.", at: new Date(Date.now() - 12 * 60000).toISOString(), read: false, audience: "all" },
    { id: "NT-2", title: "Membership expiring", body: "6 memberships expire within 14 days. Send renewal reminders.", at: new Date(Date.now() - 74 * 60000).toISOString(), read: false, audience: "admin" },
    { id: "NT-3", title: "Equipment flagged", body: "Treadmill 9 is out of order. Maintenance ticket open.", at: new Date(Date.now() - 150 * 60000).toISOString(), read: false, audience: "admin" },
    { id: "NT-4", title: "New plan assigned", body: "Marcus Vale assigned Hypertrophy Block A to your profile.", at: new Date(Date.now() - 260 * 60000).toISOString(), read: false, audience: "member" },
    { id: "NT-5", title: "Overdue invoice", body: "3 invoices are past due. Follow up at the front desk.", at: new Date(Date.now() - 320 * 60000).toISOString(), read: true, audience: "reception" },
    { id: "NT-6", title: "Roll call reminder", body: "Crossfit WOD at 17:30 has 9 attendees confirmed.", at: new Date(Date.now() - 420 * 60000).toISOString(), read: true, audience: "trainer" },
  ];

  return {
    members,
    trainers: SEED_TRAINERS.map((t) => ({ ...t })),
    classes,
    bookings,
    waitlist,
    workoutPlans,
    payments,
    attendance,
    measurements,
    goals,
    equipment,
    notifications,
    settings: {
      gymName: "FitCore Performance Club",
      address: "418 Mission Rock Ave, San Francisco, CA",
      phone: "+1 (415) 555-0182",
      taxRate: 0.08,
      openHours: "05:00 - 23:00",
      dayPassPrice: 25,
      maxCapacity: 120,
    },
  };
}
export type Role = "admin" | "reception" | "trainer" | "member";
export type MemberStatus = "Active" | "Expiring Soon" | "Expired" | "Frozen";
export type PlanName = "Monthly" | "Quarterly" | "Annual" | "VIP";
export type PaymentStatus = "Paid" | "Pending" | "Overdue";
export type EquipmentStatus = "Operational" | "Needs Service" | "Out of Order";

export interface Session {
  role: Role;
  name: string;
  email: string;
  memberId?: string;
  trainerId?: string;
}

export interface Member {
  id: string;
  code: string;
  name: string;
  email: string;
  phone: string;
  plan: PlanName;
  startDate: string;
  endDate: string;
  trainerId: string;
  status: MemberStatus;
  frozen: boolean;
  joinedAt: string;
  goal: string;
  notes: string;
}

export interface Trainer {
  id: string;
  name: string;
  specialty: string;
  availability: string;
}

export type TrainerInput = Omit<Trainer, "id"> & { id?: string };

export type ClassInput = Omit<FitnessClass, "id"> & { id?: string };

export interface FitnessClass {
  id: string;
  name: string;
  category: string;
  trainerId: string;
  day: string;
  time: string;
  duration: number;
  capacity: number;
  room: string;
}

export interface Booking {
  id: string;
  classId: string;
  memberId: string;
  createdAt: string;
}

export interface WaitlistEntry {
  id: string;
  classId: string;
  memberId: string;
  createdAt: string;
}

export interface Exercise {
  id: string;
  name: string;
  muscle: string;
  sets: number;
  reps: number;
  weight: number;
  rest: number;
  done: boolean;
}

export interface WorkoutPlan {
  id: string;
  memberId: string;
  trainerId: string;
  title: string;
  focus: string;
  createdAt: string;
  streak: number;
  exercises: Exercise[];
}

export interface PaymentRecord {
  id: string;
  memberId: string;
  memberName: string;
  plan: PlanName;
  amount: number;
  date: string;
  method: string;
  status: PaymentStatus;
  invoiceNo: string;
}

export interface AttendanceLog {
  id: string;
  memberId: string;
  memberName: string;
  at: string;
  result: "Granted" | "Blocked";
  reason?: string;
}

export interface BodyMeasurement {
  id: string;
  memberId: string;
  date: string;
  weight: number;
  bodyFat: number;
  chest: number;
  waist: number;
  arms: number;
}

export interface FitnessGoal {
  id: string;
  memberId: string;
  title: string;
  current: number;
  target: number;
  unit: string;
  deadline: string;
}

export interface MaintenanceEntry {
  id: string;
  date: string;
  note: string;
  status: EquipmentStatus;
}

export type MaintenanceInput = Omit<MaintenanceEntry, "id">;

export interface EquipmentItem {
  id: string;
  name: string;
  category: string;
  status: EquipmentStatus;
  lastService: string;
  note: string;
  log: MaintenanceEntry[];
}

export interface Checkout {
  id: string;
  memberId: string;
  memberName: string;
  at: string;
}

export interface GymVisitor {
  memberId: string;
  memberName: string;
  since: string;
}

export interface AppNotification {
  id: string;
  title: string;
  body: string;
  at: string;
  read: boolean;
  audience: Role | "all";
}

export interface GymSettings {
  gymName: string;
  address: string;
  phone: string;
  taxRate: number;
  openHours: string;
  dayPassPrice: number;
  maxCapacity: number;
}

export interface Database {
  members: Member[];
  trainers: Trainer[];
  checkouts: Checkout[];
  classes: FitnessClass[];
  bookings: Booking[];
  waitlist: WaitlistEntry[];
  workoutPlans: WorkoutPlan[];
  payments: PaymentRecord[];
  attendance: AttendanceLog[];
  measurements: BodyMeasurement[];
  goals: FitnessGoal[];
  equipment: EquipmentItem[];
  notifications: AppNotification[];
  settings: GymSettings;
}

export interface TestResult {
  name: string;
  passed: boolean;
  detail: string;
}

export interface CheckInResult {
  ok: boolean;
  message: string;
  memberName?: string;
  db: Database;
}

export interface BookingResult {
  ok: boolean;
  message: string;
  db: Database;
}

export type MemberInput = Omit<Member, "id" | "code" | "status"> & { id?: string };
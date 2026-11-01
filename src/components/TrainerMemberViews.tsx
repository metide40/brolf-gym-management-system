import { useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { firstError, measurementSchema } from "../lib/schemas";
import { motion } from "framer-motion";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Activity, Calendar, Check, ClipboardList, Clock, Dumbbell, Plus, Target, Trash2, TrendingUp, Users } from "lucide-react";
import { PLANS, TRAINERS, trainerName } from "../mockData";
import type { BodyMeasurement, Database, Exercise, FitnessGoal, Member, WorkoutPlan } from "../types";
import { EmptyState, Modal, Pill, SectionTitle, Stat, btn, btnGhost, btnPrimary, input, panel } from "./Navbar";

const initials = (name: string) => name.split(" ").map((p) => p[0]).join("").slice(0, 2);
const fmt = (iso: string) => new Date(`${iso}T12:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric" });
const daysLeft = (iso: string) => Math.ceil((new Date(`${iso}T23:59:59`).getTime() - Date.now()) / 86400000);

const blankExercise = (): Exercise => ({ id: `new-${Math.random().toString(36).slice(2, 7)}`, name: "", muscle: "Chest", sets: 3, reps: 10, weight: 0, rest: 60, done: false });

export function TrainerView({ db, trainerId, onSavePlan, onCheckIn }: { db: Database; trainerId: string; onSavePlan: (plan: WorkoutPlan) => Promise<void>; onCheckIn: (code: string) => Promise<{ ok: boolean; message: string }> }) {
  const roster = db.members.filter((m) => m.trainerId === trainerId);
  const classes = db.classes.filter((c) => c.trainerId === trainerId);
  const myPlans = db.workoutPlans.filter((p) => p.trainerId === trainerId);
  const trainer = TRAINERS.find((t) => t.id === trainerId) ?? TRAINERS[0];

  const [target, setTarget] = useState<Member | null>(null);
  const [title, setTitle] = useState("");
  const [focus, setFocus] = useState("");
  const [exercises, setExercises] = useState<Exercise[]>([blankExercise()]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const openBuilder = (member: Member) => {
    setTarget(member);
    setTitle(`${member.goal} block`);
    setFocus(member.goal);
    setExercises([blankExercise(), blankExercise()]);
    setError("");
  };

  const save = async () => {
    if (!target) return;
    const clean = exercises.filter((e) => e.name.trim().length > 0);
    if (!title.trim()) return setError("Give the plan a title.");
    if (clean.length === 0) return setError("Add at least one exercise.");
    setSaving(true);
    try {
      await onSavePlan({ id: "", memberId: target.id, trainerId, title: title.trim(), focus: focus.trim() || target.goal, createdAt: new Date().toISOString().slice(0, 10), streak: 0, exercises: clean });
      setTarget(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to save plan.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Assigned members" value={roster.length} hint={trainer.specialty} icon={Users} tone="neutral" />
        <Stat label="Classes coached" value={classes.length} hint={`${classes.filter((c) => c.day === "Mon").length} on Mondays`} icon={Calendar} tone="sky" />
        <Stat label="Active programs" value={myPlans.length} hint="Plans you authored" icon={ClipboardList} tone="amber" />
        <Stat label="Avg adherence" value={`${myPlans.length ? Math.round((myPlans.reduce((s, p) => s + p.exercises.filter((e) => e.done).length / Math.max(p.exercises.length, 1), 0) / myPlans.length) * 100) : 0}%`} hint="Completed exercises" icon={TrendingUp} tone="rose" />
      </div>

      <div className={`${panel} p-4`}>
        <SectionTitle title="Your roster" sub="Assign a program or verify attendance" />
        {roster.length === 0 ? <EmptyState title="No members assigned yet" sub="Ask reception to link members to your coaching block." icon={Users} /> : null}
        <div className="space-y-1.5">
          {roster.map((m) => (
            <div key={m.id} className="flex flex-wrap items-center gap-2 rounded-xl border border-border/50 px-3 py-2">
              <span className="grid h-8 w-8 place-items-center rounded-full bg-primary/12 text-[11px] font-bold text-primary">{initials(m.name)}</span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">{m.name}</p>
                <p className="text-[11px] text-muted-foreground">{m.goal} - expires {fmt(m.endDate)} ({daysLeft(m.endDate)}d)</p>
              </div>
              <Pill tone={m.status}>{m.status}</Pill>
              <button onClick={() => openBuilder(m)} className={`${btnGhost} !px-2.5 !py-1 text-xs`}><Dumbbell size={13} /> Build plan</button>
              <button onClick={() => onCheckIn(m.code)} className={`${btnGhost} !px-2.5 !py-1 text-xs`}><Check size={13} /> Check in</button>
            </div>
          ))}
        </div>
      </div>

      <div className={`${panel} p-4`}>
        <SectionTitle title="Your schedule" sub="Roll call for booked members" />
        <div className="grid gap-3 md:grid-cols-2">
          {classes.map((c) => {
            const booked = db.bookings.filter((b) => b.classId === c.id);
            const waiting = db.waitlist.filter((w) => w.classId === c.id);
            return (
              <div key={c.id} className="rounded-xl border border-border/60 p-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-display text-sm font-bold">{c.name}</p>
                    <p className="text-[11px] text-muted-foreground">{c.day} {c.time} - {c.duration} min - {c.room}</p>
                  </div>
                  <span className="rounded-full bg-secondary px-2 py-0.5 text-[11px] font-semibold text-muted-foreground">{booked.length}/{c.capacity}</span>
                </div>
                <div className="mt-2 space-y-1">
                  {booked.slice(0, 4).map((b) => {
                    const m = db.members.find((x) => x.id === b.memberId);
                    return (
                      <div key={b.id} className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                        <Check size={11} className="text-emerald-500" /> {m?.name ?? b.memberId}
                      </div>
                    );
                  })}
                  {booked.length === 0 ? <p className="text-[11px] text-muted-foreground">No bookings yet.</p> : null}
                  {waiting.length > 0 ? <p className="text-[11px] font-semibold text-amber-500">+{waiting.length} on waitlist</p> : null}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <Modal open={Boolean(target)} onClose={() => setTarget(null)} title={`Program for ${target?.name ?? ""}`} wide>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="text-xs font-semibold text-muted-foreground">Plan title<input className={`${input} mt-1`} value={title} onChange={(e) => setTitle(e.target.value)} /></label>
          <label className="text-xs font-semibold text-muted-foreground">Focus<input className={`${input} mt-1`} value={focus} onChange={(e) => setFocus(e.target.value)} /></label>
        </div>
        <div className="mt-3 space-y-2">
          {exercises.map((ex, i) => (
            <div key={ex.id} className="grid grid-cols-2 gap-1.5 rounded-xl border border-border/60 p-2 sm:grid-cols-6">
              <input className={`${input} col-span-2 !py-1.5 text-xs`} placeholder="Exercise name" value={ex.name} onChange={(e) => setExercises(exercises.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))} />
              <select className={`${input} !py-1.5 text-xs`} value={ex.muscle} onChange={(e) => setExercises(exercises.map((x, j) => (j === i ? { ...x, muscle: e.target.value } : x)))}>
                {["Chest", "Back", "Legs", "Shoulders", "Core", "Cardio", "Full body"].map((m) => <option key={m} value={m}>{m}</option>)}
              </select>
              <input type="number" className={`${input} !py-1.5 text-xs`} placeholder="Sets" value={ex.sets} onChange={(e) => setExercises(exercises.map((x, j) => (j === i ? { ...x, sets: Number(e.target.value) } : x)))} />
              <input type="number" className={`${input} !py-1.5 text-xs`} placeholder="Reps" value={ex.reps} onChange={(e) => setExercises(exercises.map((x, j) => (j === i ? { ...x, reps: Number(e.target.value) } : x)))} />
              <div className="flex gap-1">
                <input type="number" className={`${input} !py-1.5 text-xs`} placeholder="kg" value={ex.weight} onChange={(e) => setExercises(exercises.map((x, j) => (j === i ? { ...x, weight: Number(e.target.value) } : x)))} />
                <button onClick={() => setExercises(exercises.filter((_, j) => j !== i))} className="rounded-lg p-1.5 text-muted-foreground transition hover:bg-rose-500/12 hover:text-rose-500" aria-label="Remove exercise"><Trash2 size={13} /></button>
              </div>
            </div>
          ))}
        </div>
        <button onClick={() => setExercises([...exercises, blankExercise()])} className={`${btnGhost} mt-2 !py-1.5 text-xs`}><Plus size={13} /> Add exercise</button>
        {error ? <p className="mt-3 rounded-lg bg-rose-500/12 px-3 py-2 text-xs font-medium text-rose-500">{error}</p> : null}
        <div className="mt-4 flex justify-end gap-2">
          <button onClick={() => setTarget(null)} className={btnGhost}>Cancel</button>
          <button onClick={save} disabled={saving} className={btnPrimary}>{saving ? "Saving..." : "Save program"}</button>
        </div>
      </Modal>
    </div>
  );
}

export function MemberPass({ db, memberId, onRenew }: { db: Database; memberId: string; onRenew: (id: string, days: number) => Promise<void> }) {
  const member = db.members.find((m) => m.id === memberId);
  if (!member) return <EmptyState title="Membership record missing" sub="Ask reception to re-link your profile." icon={Users} />;
  const plan = PLANS[member.plan];
  const myBookings = db.bookings.filter((b) => b.memberId === memberId);
  const streak = db.workoutPlans.filter((p) => p.memberId === memberId).reduce((s, p) => s + p.streak, 0);
  const left = daysLeft(member.endDate);

  return (
    <div className="space-y-4">
      <SectionTitle title={`Welcome back, ${member.name.split(" ")[0]}`} sub="Your digital membership pass and current standing" />
      <div className="grid gap-4 lg:grid-cols-[1.15fr_1fr]">
        <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} className="relative overflow-hidden rounded-2xl border border-primary/40 bg-card p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold text-primary">FitCore member pass</p>
              <p className="mt-1 font-display text-3xl font-semibold">{member.name}</p>
              <p className="text-xs text-muted-foreground">{member.id} - {member.code}</p>
            </div>
            <Pill tone={member.status}>{member.status}</Pill>
          </div>
          <div className="mt-4 flex items-end justify-between gap-4">
            <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-xs">
              <span className="text-muted-foreground">Plan<p className="font-display text-base font-bold text-foreground">{member.plan}</p></span>
              <span className="text-muted-foreground">Expires<p className="font-display text-base font-bold text-foreground">{fmt(member.endDate)}</p></span>
              <span className="text-muted-foreground">Coach<p className="font-semibold text-foreground">{trainerName(member.trainerId)}</p></span>
              <span className="text-muted-foreground">Days left<p className={`font-semibold ${left <= 14 ? "text-amber-500" : "text-foreground"}`}>{left > 0 ? `${left} days` : "Expired"}</p></span>
            </div>
            <div className="shrink-0 rounded-lg bg-white p-3">
              <QRCodeSVG value={member.code} size={92} level="M" bgColor="#ffffff" fgColor="#111111" title={`Check-in code ${member.code}`} />
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <button onClick={() => onRenew(member.id, plan.days)} className={`${btn} bg-primary text-primary-foreground hover:brightness-110`}>Renew {member.plan}</button>
            <span className="rounded-xl border border-border/70 px-3 py-2 text-xs font-semibold text-muted-foreground">${plan.price} / {plan.days} days</span>
          </div>
        </motion.div>

        <div className="grid gap-3 sm:grid-cols-2">
          <Stat label="Classes booked" value={myBookings.length} hint="Upcoming reservations" icon={Calendar} tone="neutral" />
          <Stat label="Session streak" value={`${streak}`} hint="Consecutive check-ins" icon={TrendingUp} tone="neutral" />
          <Stat label="Goal" value={member.goal} hint="Set by your coach" icon={Target} tone="neutral" />
          <Stat label="Joined" value={fmt(member.joinedAt)} hint={`${member.plan} member`} icon={Activity} tone="neutral" />
        </div>
      </div>

      <div className={`${panel} p-4`}>
        <SectionTitle title="Recent activity at the door" sub="Your last terminal entries" />
        <div className="space-y-1.5">
          {db.attendance.filter((a) => a.memberId === memberId).slice(0, 5).map((a) => (
            <div key={a.id} className="flex items-center gap-2 rounded-xl border border-border/50 px-2.5 py-2 text-xs">
              <Clock size={13} className="text-muted-foreground" />
              <span className="text-muted-foreground">{new Date(a.at).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</span>
              <span className="ml-auto"><Pill tone={a.result}>{a.result}</Pill></span>
            </div>
          ))}
          {db.attendance.filter((a) => a.memberId === memberId).length === 0 ? <EmptyState title="No visits logged yet" sub="Scan your pass at the front desk." icon={Calendar} /> : null}
        </div>
      </div>
    </div>
  );
}

export function MemberClasses({
  db,
  memberId,
  onBook,
  onCancel,
  onLeaveWaitlist,
}: {
  db: Database;
  memberId: string;
  onBook: (classId: string, memberId: string) => Promise<{ ok: boolean; message: string }>;
  onCancel: (bookingId: string) => Promise<{ ok: boolean; message: string }>;
  onLeaveWaitlist: (waitlistId: string) => Promise<void>;
}) {
  return (
    <div className="space-y-4">
      <SectionTitle title="Class schedule" sub="Book a seat, join a waitlist, or release your spot" />
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {db.classes.map((c) => {
          const booked = db.bookings.filter((b) => b.classId === c.id);
          const waiting = db.waitlist.filter((w) => w.classId === c.id);
          const mine = booked.find((b) => b.memberId === memberId);
          const myWait = waiting.find((w) => w.memberId === memberId);
          const full = booked.length >= c.capacity;
          const pct = Math.min(100, Math.round((booked.length / c.capacity) * 100));
          return (
            <motion.div key={c.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className={`${panel} flex flex-col p-4`}>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-display text-sm font-bold">{c.name}</p>
                  <p className="text-[11px] text-muted-foreground">{c.day} {c.time} - {c.room}</p>
                </div>
                <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">{c.category}</span>
              </div>
              <p className="mt-1.5 text-[11px] text-muted-foreground">Coach {trainerName(c.trainerId)} - {c.duration} min</p>
              <div className="mt-3">
                <div className="h-1.5 overflow-hidden rounded-full bg-secondary">
                  <div className={`h-full rounded-full ${pct >= 100 ? "bg-rose-500" : pct > 70 ? "bg-amber-500" : "bg-emerald-500"}`} style={{ width: `${pct}%` }} />
                </div>
                <p className="mt-1 text-[11px] text-muted-foreground">{booked.length}/{c.capacity} seats{waiting.length ? ` - ${waiting.length} waiting` : ""}</p>
              </div>
              <div className="mt-3">
                {mine ? (
                  <button onClick={() => onCancel(mine.id)} className={`${btnGhost} w-full text-xs`}>Cancel booking</button>
                ) : myWait ? (
                  <button onClick={() => onLeaveWaitlist(myWait.id)} className={`${btnGhost} w-full text-xs`}>Leave waitlist</button>
                ) : full ? (
                  <button onClick={() => onBook(c.id, memberId)} className={`${btn} w-full bg-amber-500/15 text-xs text-amber-600 dark:text-amber-400`}>Join waitlist</button>
                ) : (
                  <button onClick={() => onBook(c.id, memberId)} className={`${btnPrimary} w-full text-xs`}>Book seat</button>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

export function MemberWorkouts({ db, memberId, onToggleExercise }: { db: Database; memberId: string; onToggleExercise: (planId: string, exerciseId: string) => Promise<void> }) {
  const plans = db.workoutPlans.filter((p) => p.memberId === memberId);
  return (
    <div className="space-y-4">
      <SectionTitle title="Your programs" sub="Tap an exercise to mark it complete" />
      {plans.length === 0 ? <EmptyState title="No program assigned yet" sub="Your coach will publish a block soon." icon={ClipboardList} /> : null}
      <div className="grid gap-3 lg:grid-cols-2">
        {plans.map((p) => {
          const done = p.exercises.filter((e) => e.done).length;
          const pct = Math.round((done / Math.max(p.exercises.length, 1)) * 100);
          return (
            <div key={p.id} className={`${panel} p-4`}>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-display text-base font-bold">{p.title}</p>
                  <p className="text-[11px] text-muted-foreground">{p.focus} - {trainerName(p.trainerId)}</p>
                </div>
                <span className="rounded-full bg-primary/12 px-2 py-0.5 text-[11px] font-bold text-primary">{done}/{p.exercises.length}</span>
              </div>
              <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-secondary">
                <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${pct}%` }} />
              </div>
              <div className="mt-3 space-y-1.5">
                {p.exercises.map((e) => (
                  <button key={e.id} onClick={() => onToggleExercise(p.id, e.id)} className={`flex w-full items-center gap-2 rounded-xl border px-2.5 py-2 text-left transition ${e.done ? "border-primary/30 bg-primary/8" : "border-border/60 hover:bg-secondary/50"}`}>
                    <span className={`grid h-5 w-5 shrink-0 place-items-center rounded-md border ${e.done ? "border-primary bg-primary text-primary-foreground" : "border-border"}`}>{e.done ? <Check size={12} /> : null}</span>
                    <span className="min-w-0 flex-1">
                      <span className={`block truncate text-xs font-semibold ${e.done ? "line-through text-muted-foreground" : ""}`}>{e.name}</span>
                      <span className="block text-[11px] text-muted-foreground">{e.muscle} - {e.sets}x{e.reps}{e.weight ? ` @ ${e.weight}kg` : ""} - {e.rest}s rest</span>
                    </span>
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function MemberProgress({
  db,
  memberId,
  onAddMeasurement,
  onSaveGoal,
}: {
  db: Database;
  memberId: string;
  onAddMeasurement: (m: Omit<BodyMeasurement, "id">) => Promise<void>;
  onSaveGoal: (g: FitnessGoal) => Promise<void>;
}) {
  const rows = db.measurements.filter((m) => m.memberId === memberId).sort((a, b) => a.date.localeCompare(b.date));
  const goals = db.goals.filter((g) => g.memberId === memberId);
  const [open, setOpen] = useState(false);
  const latest = rows[rows.length - 1];
  const first = rows[0];
  const [form, setForm] = useState({ weight: latest?.weight ?? 80, bodyFat: latest?.bodyFat ?? 18, chest: latest?.chest ?? 100, waist: latest?.waist ?? 85, arms: latest?.arms ?? 35 });
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const data = rows.map((r) => ({ label: fmt(r.date), weight: r.weight, fat: r.bodyFat }));

  const submit = async () => {
    const problem = firstError(measurementSchema.safeParse({ weight: Number(form.weight), bodyFat: Number(form.bodyFat), chest: Number(form.chest), waist: Number(form.waist), arms: Number(form.arms) }));
    if (problem) return setFormError(problem);
    setFormError("");
    setSaving(true);
    try {
      await onAddMeasurement({ memberId, date: new Date().toISOString().slice(0, 10), weight: Number(form.weight), bodyFat: Number(form.bodyFat), chest: Number(form.chest), waist: Number(form.waist), arms: Number(form.arms) });
      setOpen(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <SectionTitle title="Progress tracking" sub="Body composition and goal momentum" right={<button onClick={() => setOpen(true)} className={btnPrimary}><Plus size={15} /> Log measurement</button>} />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Weight" value={`${latest?.weight ?? "-"} kg`} hint={first && latest ? `${(latest.weight - first.weight).toFixed(1)} kg since ${fmt(first.date)}` : "No history"} icon={Activity} tone="emerald" />
        <Stat label="Body fat" value={`${latest?.bodyFat ?? "-"}%`} hint={first && latest ? `${(latest.bodyFat - first.bodyFat).toFixed(1)} pts change` : "No history"} icon={TrendingUp} tone="amber" />
        <Stat label="Waist" value={`${latest?.waist ?? "-"} cm`} hint={first && latest ? `${(latest.waist - first.waist).toFixed(1)} cm change` : "No history"} icon={Target} tone="sky" />
        <Stat label="Arms" value={`${latest?.arms ?? "-"} cm`} hint={first && latest ? `${(latest.arms - first.arms).toFixed(1)} cm change` : "No history"} icon={Dumbbell} tone="rose" />
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <div className={`${panel} p-4`}>
          <SectionTitle title="Weight and body fat" sub="Logged check-ins over time" />
          <div className="h-60">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data} margin={{ top: 4, right: 8, bottom: 0, left: -22 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="text-border" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 10 }} stroke="currentColor" className="text-muted-foreground" tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 11 }} stroke="currentColor" className="text-muted-foreground" tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid var(--border)", background: "var(--popover)", color: "var(--popover-foreground)", fontSize: 12 }} />
                <Line type="monotone" dataKey="weight" stroke="#d7263d" strokeWidth={2.5} dot={{ r: 3, fill: "#d7263d", strokeWidth: 0 }} />
                <Line type="monotone" dataKey="fat" stroke="#f59e0b" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className={`${panel} p-4`}>
          <SectionTitle title="Goals" sub="Update your current standing" />
          <div className="space-y-3">
            {goals.length === 0 ? <EmptyState title="No goals set" sub="Ask your coach to define targets." icon={Target} /> : null}
            {goals.map((g) => {
              const pct = Math.min(100, Math.round((g.current / Math.max(g.target, 1)) * 100));
              return (
                <div key={g.id} className="rounded-xl border border-border/60 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-semibold">{g.title}</p>
                    <span className="text-[11px] text-muted-foreground">{g.current} / {g.target} {g.unit}</span>
                  </div>
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-secondary">
                    <div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
                  </div>
                  <div className="mt-2 flex items-center gap-2">
                    <input type="number" step="0.1" value={g.current} onChange={(e) => onSaveGoal({ ...g, current: Number(e.target.value) })} className={`${input} !py-1 text-xs`} />
                    <span className="shrink-0 text-[11px] text-muted-foreground">due {fmt(g.deadline)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <Modal open={open} onClose={() => setOpen(false)} title="Log body measurement">
        <div className="grid gap-3 sm:grid-cols-2">
          {(["weight", "bodyFat", "chest", "waist", "arms"] as const).map((field) => (
            <label key={field} className="text-xs font-semibold capitalize text-muted-foreground">{field.replace("bodyFat", "body fat")}
              <input type="number" step="0.1" className={`${input} mt-1`} value={form[field]} onChange={(e) => setForm({ ...form, [field]: Number(e.target.value) })} />
            </label>
          ))}
        </div>
        {formError ? <p role="alert" className="mt-3 rounded-lg bg-amber-500/12 px-3 py-2 text-xs font-medium text-amber-600 dark:text-amber-400">{formError}</p> : null}
        <div className="mt-4 flex justify-end gap-2">
          <button onClick={() => setOpen(false)} className={btnGhost}>Cancel</button>
          <button onClick={submit} disabled={saving} className={btnPrimary}>{saving ? "Saving..." : "Save entry"}</button>
        </div>
      </Modal>
    </div>
  );
}

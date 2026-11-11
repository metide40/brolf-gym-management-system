import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Bar, BarChart, CartesianGrid, Cell, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Activity, AlertTriangle, BadgeCheck, Calendar, Check, CreditCard, Download, Dumbbell, LogOut, Pencil, Plus, QrCode, RefreshCw, Search, Settings, Trash2, TrendingUp, Users, Wallet, X } from "lucide-react";
import { PLANS, PLAN_NAMES, trainerName } from "../mockData";
import { firstError, memberFormSchema } from "../lib/schemas";
import { downloadCsv } from "../lib/csv";
import { STAY_WINDOW_MS, currentlyInGym } from "../api/mockApi";
import type { Database, Member, MemberInput, PlanName } from "../types";
import { EmptyState, Modal, Pill, SectionTitle, Stat, btn, btnGhost, btnPrimary, input, panel } from "./Navbar";
import { validateNewPassword } from "../lib/credentials";

const BRAND = "#d7263d";
// Plan colours: red marks the top tier (VIP); the other plans use clearly separated greys.
const PLAN_COLOR: Record<string, string> = { Monthly: "#d4d4d8", Quarterly: "#9a9aa3", Annual: "#5f6168", VIP: BRAND };
const planColor = (name: string) => PLAN_COLOR[name] ?? "#71717a";
const AXIS = { fontSize: 12, fill: "var(--muted-foreground)" };
const TOOLTIP_ITEM = { color: "var(--popover-foreground)" };
const TOOLTIP_STYLE = { borderRadius: 10, border: "1px solid var(--border)", background: "var(--popover)", color: "var(--popover-foreground)", fontSize: 12 };
const hourLabel = (h: number) => `${h % 12 === 0 ? 12 : h % 12}${h < 12 ? "am" : "pm"}`;
const fmtDate = (iso: string) => new Date(`${iso}T12:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
const daysLeft = (iso: string) => Math.ceil((new Date(`${iso}T23:59:59`).getTime() - Date.now()) / 86400000);
const initials = (name: string) => name.split(" ").map((p) => p[0]).join("").slice(0, 2);

export function AdminOverview({ db }: { db: Database }) {
  const active = db.members.filter((m) => m.status === "Active").length;
  const expiring = db.members.filter((m) => m.status === "Expiring Soon");
  const revenue = db.payments.filter((p) => p.status === "Paid").reduce((s, p) => s + p.amount, 0);
  const overdue = db.payments.filter((p) => p.status === "Overdue").reduce((s, p) => s + p.amount, 0);
  const todayVisits = db.attendance.filter((a) => a.result === "Granted").length;

  const growth = useMemo(() => {
    return Array.from({ length: 6 }, (_, i) => {
      const d = new Date();
      d.setDate(1);
      d.setMonth(d.getMonth() - (5 - i));
      const end = new Date(d.getFullYear(), d.getMonth() + 1, 0).getTime();
      return { month: d.toLocaleString("en-US", { month: "short" }), members: db.members.filter((m) => new Date(m.joinedAt).getTime() <= end).length };
    });
  }, [db.members]);

  const hourly = useMemo(
    () =>
      Array.from({ length: 13 }, (_, i) => {
        const h = 6 + i;
        return { hour: hourLabel(h), visits: db.attendance.filter((a) => new Date(a.at).getHours() === h && a.result === "Granted").length };
      }),
    [db.attendance],
  );

  const peak = useMemo(() => hourly.reduce((best, h) => (h.visits > best.visits ? h : best), hourly[0]), [hourly]);
  const growthRange = useMemo(() => {
    const values = growth.map((g) => g.members);
    return [Math.max(0, Math.min(...values) - 5), Math.max(...values) + 5] as [number, number];
  }, [growth]);

  const planMix = useMemo(() => PLAN_NAMES.map((p) => ({ name: p, value: db.members.filter((m) => m.plan === p).length })), [db.members]);

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Total members" value={db.members.length} hint={`${active} active right now`} icon={Users} tone="neutral" />
        <Stat label="Monthly revenue" value={`$${revenue.toLocaleString()}`} hint={`$${overdue.toLocaleString()} overdue`} icon={Wallet} tone="neutral" />
        <Stat label="Check-ins today" value={todayVisits} hint={`${currentlyInGym(db).length} in gym now, ${db.attendance.filter((a) => a.result === "Blocked").length} blocked`} icon={Activity} tone="neutral" />
        <Stat label="Expiring in 14 days" value={expiring.length} hint="Renewal reminders queued" icon={AlertTriangle} tone="amber" />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className={`${panel} p-4 lg:col-span-2`}>
          <SectionTitle title="Member growth" sub={`${growth[0].members} to ${growth[growth.length - 1].members} members over six months`} />
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={growth} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
                <CartesianGrid stroke="var(--border)" vertical={false} />
                <XAxis dataKey="month" tick={AXIS} tickLine={false} axisLine={false} />
                <YAxis tick={AXIS} tickLine={false} axisLine={false} domain={growthRange} allowDecimals={false} width={36} />
                <Tooltip contentStyle={TOOLTIP_STYLE} itemStyle={TOOLTIP_ITEM} labelStyle={TOOLTIP_ITEM} formatter={(value) => [value, "Members"]} />
                <Line type="monotone" dataKey="members" stroke={BRAND} strokeWidth={2.5} dot={{ r: 3, fill: BRAND, strokeWidth: 0 }} activeDot={{ r: 5 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className={`${panel} p-4`}>
          <SectionTitle title="Plan mix" sub="Members per tier" />
          <div className="relative h-56">
            <div className="pointer-events-none absolute inset-0 grid place-items-center">
              <div className="text-center">
                <p className="font-display text-4xl font-semibold tabular-nums leading-none">{db.members.length}</p>
                <p className="mt-1 text-xs text-muted-foreground">members</p>
              </div>
            </div>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={planMix} dataKey="value" nameKey="name" innerRadius={48} outerRadius={76} paddingAngle={3} stroke="none">
                  {planMix.map((entry) => (
                    <Cell key={entry.name} fill={planColor(entry.name)} />
                  ))}
                </Pie>
                <Tooltip contentStyle={TOOLTIP_STYLE} itemStyle={TOOLTIP_ITEM} labelStyle={TOOLTIP_ITEM} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-2 grid grid-cols-2 gap-1.5">
            {planMix.map((p) => (
              <div key={p.name} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: planColor(p.name) }} />
                {p.name}
                <span className="ml-auto font-semibold tabular-nums text-foreground">
                  {p.value} <span className="font-normal text-muted-foreground">({db.members.length ? Math.round((p.value / db.members.length) * 100) : 0}%)</span>
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className={`${panel} p-4 lg:col-span-2`}>
          <SectionTitle title="Attendance by hour" sub={peak && peak.visits > 0 ? `Busiest hour: ${peak.hour}, ${peak.visits} check-ins` : "No check-ins recorded yet"} />
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={hourly} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
                <CartesianGrid stroke="var(--border)" vertical={false} />
                <XAxis dataKey="hour" tick={{ ...AXIS, fontSize: 11 }} tickLine={false} axisLine={false} interval={0} />
                <YAxis tick={AXIS} tickLine={false} axisLine={false} allowDecimals={false} width={30} />
                <Tooltip contentStyle={TOOLTIP_STYLE} itemStyle={TOOLTIP_ITEM} labelStyle={TOOLTIP_ITEM} cursor={{ fill: "var(--secondary)" }} formatter={(value) => [value, "Check-ins granted"]} />
                <Bar dataKey="visits" radius={[4, 4, 0, 0]} maxBarSize={28}>
                  {hourly.map((h) => (
                    <Cell key={h.hour} fill={peak && h.hour === peak.hour && h.visits > 0 ? BRAND : "#71717a"} fillOpacity={peak && h.hour === peak.hour && h.visits > 0 ? 1 : 0.55} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className={`${panel} p-4`}>
          <SectionTitle title="Renewals due" sub="Next 14 days" right={<TrendingUp size={16} className="text-amber-500" />} />
          <div className="space-y-2">
            {expiring.length === 0 ? <EmptyState title="No renewals due" sub="Every membership has runway left." icon={BadgeCheck} /> : null}
            {expiring.slice(0, 5).map((m) => (
              <div key={m.id} className="flex items-center gap-2 rounded-xl border border-border/60 px-2.5 py-2">
                <span className="grid h-7 w-7 place-items-center rounded-lg bg-amber-500/12 text-[10px] font-bold text-amber-500">{initials(m.name)}</span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-semibold">{m.name}</p>
                  <p className="text-[11px] text-muted-foreground">{m.plan} - {daysLeft(m.endDate)} days left</p>
                </div>
                <Pill tone={m.status}>Due</Pill>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

type FormState = { name: string; email: string; phone: string; plan: PlanName; startDate: string; trainerId: string; goal: string; frozen: boolean; password: string };
const emptyForm = (trainerId: string): FormState => ({ name: "", email: "", phone: "", plan: "Monthly", startDate: new Date().toISOString().slice(0, 10), trainerId, goal: "General fitness", frozen: false, password: "" });

export function MemberDirectory({
  db,
  onSave,
  onDelete,
  onFreeze,
  onRenew,
  onOpenInvoice,
}: {
  db: Database;
  onSave: (input: MemberInput, password?: string) => Promise<boolean>;
  onDelete: (id: string) => Promise<void>;
  onFreeze: (id: string) => Promise<void>;
  onRenew: (id: string, days: number) => Promise<void>;
  onOpenInvoice?: (invoiceNo: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<string>("All");
  const [editing, setEditing] = useState<Member | null>(null);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm(db.trainers[0]?.id ?? ""));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const statuses = ["All", ...Array.from(new Set(db.members.map((m) => m.status)))];
  const filtered = db.members.filter((m) => {
    const q = query.trim().toLowerCase();
    const matchQ = !q || [m.name, m.email, m.phone, m.id, m.code].some((v) => v.toLowerCase().includes(q));
    return matchQ && (status === "All" || m.status === status);
  });

  const openCreate = () => { setEditing(null); setForm(emptyForm(db.trainers[0]?.id ?? "")); setError(""); setShowPassword(false); setOpen(true); };
  const openEdit = (m: Member) => {
    setEditing(m);
    setForm({ name: m.name, email: m.email, phone: m.phone, plan: m.plan, startDate: m.startDate, trainerId: m.trainerId, goal: m.goal, frozen: m.frozen, password: "" });
    setError("");
    setShowPassword(false);
    setOpen(true);
  };

  const submit = async () => {
    const problem = firstError(memberFormSchema.safeParse(form));
    if (problem) return setError(problem);
    if (form.password) {
      const passwordProblem = validateNewPassword(form.password);
      if (passwordProblem) return setError(passwordProblem);
    }
    setSaving(true);
    setError("");
    const end = new Date(`${form.startDate}T12:00:00`);
    end.setDate(end.getDate() + PLANS[form.plan].days);
    try {
      const ok = await onSave({
        id: editing?.id,
        name: form.name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        plan: form.plan,
        startDate: form.startDate,
        endDate: end.toISOString().slice(0, 10),
        trainerId: form.trainerId,
        frozen: form.frozen,
        joinedAt: editing?.joinedAt ?? form.startDate,
        goal: form.goal,
        notes: editing?.notes ?? "",
      }, form.password || undefined);
      if (ok) {
        setForm((f) => ({ ...f, password: "" }));
        setOpen(false);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to save member.");
    } finally {
      setSaving(false);
    }
  };

  const exportCsv = () => {
    downloadCsv("fitcore-members.csv", [
      ["ID", "Card", "Name", "Email", "Phone", "Plan", "Status", "Start", "End", "Trainer", "Goal"],
      ...filtered.map((m) => [m.id, m.code, m.name, m.email, m.phone, m.plan, m.status, m.startDate, m.endDate, trainerName(db.trainers, m.trainerId), m.goal]),
    ]);
  };

  return (
    <div className="space-y-4">
      <SectionTitle
        title="Member directory"
        sub={`${filtered.length} of ${db.members.length} records`}
        right={
          <div className="flex flex-wrap gap-2">
            <button onClick={exportCsv} className={btnGhost}><Download size={15} /> CSV</button>
            <button onClick={openCreate} className={btnPrimary}><Plus size={15} /> Add member</button>
          </div>
        }
      />

      <div className={`${panel} flex flex-wrap items-center gap-2 p-3`}>
        <div className="relative min-w-[200px] flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search name, email, phone or card" className={`${input} pl-9`} />
        </div>
        <div className="flex flex-wrap gap-1.5">
          {statuses.map((s) => (
            <button key={s} onClick={() => setStatus(s)} className={`rounded-full border px-3 py-1 text-[11px] font-semibold transition ${status === s ? "border-primary bg-primary/15 text-primary" : "border-border text-muted-foreground hover:bg-secondary"}`}>{s}</button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState title="No members match this filter" sub="Clear the search or pick another status." icon={Users} />
      ) : (
        <div className={`${panel} overflow-hidden`}>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead>
                <tr className="border-b border-border/70 text-[11px] text-muted-foreground">
                  <th className="px-4 py-2.5 font-semibold">Member</th>
                  <th className="px-3 py-2.5 font-semibold">Plan</th>
                  <th className="px-3 py-2.5 font-semibold">Status</th>
                  <th className="px-3 py-2.5 font-semibold">Expires</th>
                  <th className="px-3 py-2.5 font-semibold">Trainer</th>
                  <th className="px-3 py-2.5 text-right font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((m) => (
                  <tr key={m.id} className="border-b border-border/40 transition hover:bg-secondary/40">
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-2.5">
                        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-primary/12 text-[11px] font-bold text-primary">{initials(m.name)}</span>
                        <div className="min-w-0">
                          <p className="truncate font-semibold">{m.name}</p>
                          <p className="truncate text-[11px] text-muted-foreground">{m.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-2.5 text-xs font-medium">{m.plan}</td>
                    <td className="px-3 py-2.5"><Pill tone={m.status}>{m.status}</Pill></td>
                    <td className="px-3 py-2.5 text-xs text-muted-foreground">{fmtDate(m.endDate)}</td>
                    <td className="px-3 py-2.5 text-xs text-muted-foreground">{trainerName(db.trainers, m.trainerId)}</td>
                    <td className="px-3 py-2.5">
                      <div className="flex justify-end gap-1">
                        <button onClick={() => onRenew(m.id, 30)} title="Renew 30 days" className="rounded-lg p-1.5 text-muted-foreground transition hover:bg-primary/12 hover:text-primary"><RefreshCw size={14} /></button>
                        <button onClick={() => onFreeze(m.id)} title={m.frozen ? "Unfreeze" : "Freeze"} className="rounded-lg p-1.5 text-muted-foreground transition hover:bg-sky-500/12 hover:text-sky-500">{m.frozen ? <Check size={14} /> : <X size={14} />}</button>
                        <button onClick={() => openEdit(m)} title="Edit" className="rounded-lg p-1.5 text-muted-foreground transition hover:bg-secondary hover:text-foreground"><Pencil size={14} /></button>
                        <button onClick={() => onDelete(m.id)} title="Delete" className="rounded-lg p-1.5 text-muted-foreground transition hover:bg-rose-500/12 hover:text-rose-500"><Trash2 size={14} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      {onOpenInvoice ? <p className="text-[11px] text-muted-foreground">Tip: open the Payments view to print a receipt for any member invoice.</p> : null}

      <Modal open={open} onClose={() => setOpen(false)} title={editing ? `Edit ${editing.name}` : "Add new member"}>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="text-xs font-semibold text-muted-foreground">Full name<input className={`${input} mt-1`} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Jordan Reyes" /></label>
          <label className="text-xs font-semibold text-muted-foreground">Email<input className={`${input} mt-1`} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="name@mail.com" /></label>
          <label className="text-xs font-semibold text-muted-foreground">Phone<input className={`${input} mt-1`} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+251 91 123 4567" /></label>
          <label className="text-xs font-semibold text-muted-foreground">Plan
            <select className={`${input} mt-1`} value={form.plan} onChange={(e) => setForm({ ...form, plan: e.target.value as PlanName })}>
              {PLAN_NAMES.map((p) => <option key={p} value={p}>{p} - ${PLANS[p].price}</option>)}
            </select>
          </label>
          <label className="text-xs font-semibold text-muted-foreground">Start date<input type="date" className={`${input} mt-1`} value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} /></label>
          <label className="text-xs font-semibold text-muted-foreground">Assigned trainer
            <select className={`${input} mt-1`} value={form.trainerId} onChange={(e) => setForm({ ...form, trainerId: e.target.value })}>
              {db.trainers.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </label>
          <label className="text-xs font-semibold text-muted-foreground sm:col-span-2">Primary goal<input className={`${input} mt-1`} value={form.goal} onChange={(e) => setForm({ ...form, goal: e.target.value })} /></label>
          <label className="text-xs font-semibold text-muted-foreground sm:col-span-2">
            {editing ? "Reset password (optional)" : "Temporary password (optional)"}
            <div className="relative mt-1">
              <input type={showPassword ? "text" : "password"} autoComplete="new-password" className={`${input} pr-16`} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder={editing ? "Leave blank to keep the current password" : "Lets the member sign in with their email"} />
              <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute inset-y-0 right-2 px-2 text-[11px] font-semibold text-muted-foreground hover:text-foreground">{showPassword ? "Hide" : "Show"}</button>
            </div>
            <span className="mt-1 block text-[11px] font-normal">At least 8 characters, with a letter and a number. Share it with the member privately.</span>
          </label>
          <label className="flex items-center gap-2 text-xs font-semibold text-muted-foreground sm:col-span-2">
            <input type="checkbox" checked={form.frozen} onChange={(e) => setForm({ ...form, frozen: e.target.checked })} className="h-4 w-4 accent-[#d7263d]" /> Membership frozen
          </label>
        </div>
        {error ? <p className="mt-3 rounded-lg bg-rose-500/12 px-3 py-2 text-xs font-medium text-rose-500">{error}</p> : null}
        <div className="mt-4 flex justify-end gap-2">
          <button onClick={() => setOpen(false)} className={btnGhost}>Cancel</button>
          <button onClick={submit} disabled={saving} className={btnPrimary}>{saving ? "Saving..." : editing ? "Save changes" : "Create member"}</button>
        </div>
      </Modal>
    </div>
  );
}

export function ReceptionTerminal({
  db,
  onCheckIn,
  onCheckOut,
}: {
  db: Database;
  onCheckIn: (code: string) => Promise<{ ok: boolean; message: string }>;
  onCheckOut: (code: string) => Promise<{ ok: boolean; message: string }>;
}) {
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);
  const valid = db.members.find((m) => m.status === "Active" || m.status === "Expiring Soon");
  const blocked = db.members.find((m) => m.status === "Expired" || m.status === "Frozen");
  const today = db.attendance.slice(0, 10);
  const inside = currentlyInGym(db);

  const scan = async (value: string) => {
    if (!value.trim()) { setResult({ ok: false, message: "Enter a card code or member ID first." }); return; }
    setBusy(true);
    try {
      setResult(await onCheckIn(value));
    } catch (e) {
      setResult({ ok: false, message: e instanceof Error ? e.message : "Scanner error." });
    } finally {
      setBusy(false);
      setCode("");
    }
  };

  const leave = async (value: string) => {
    if (!value.trim()) { setResult({ ok: false, message: "Enter a card code or member ID first." }); return; }
    setBusy(true);
    try {
      setResult(await onCheckOut(value));
    } catch (e) {
      setResult({ ok: false, message: e instanceof Error ? e.message : "Check-out failed." });
    } finally {
      setBusy(false);
      setCode("");
    }
  };

  return (
    <div className="space-y-4">
      <SectionTitle title="Check-in terminal" sub="Scan a QR code or type a member code to check access" />
      <div className="grid gap-4 lg:grid-cols-2">
        <div className={`${panel} relative overflow-hidden p-5`}>
          <div className="rounded-xl border border-border bg-secondary/40 p-4">
            <div className="flex items-start gap-3">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-primary/12 text-primary"><QrCode size={18} /></span>
              <div>
                <p className="text-sm font-semibold">Scan a member QR code</p>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">Click the field below and scan with a handheld or USB scanner, which types the code and presses Enter. You can also type the member code by hand. Members find their QR code on the My pass page.</p>
              </div>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <input autoFocus value={code} onChange={(e) => setCode(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") scan(code); }} placeholder="Member code, e.g. FC-2001" className={`${input} min-w-[10rem] flex-1`} />
            <button onClick={() => scan(code)} disabled={busy} className={`${btnPrimary} shrink-0 whitespace-nowrap`}>{busy ? "Checking" : "Check in"}</button>
            <button onClick={() => leave(code)} disabled={busy} className={`${btnGhost} shrink-0 whitespace-nowrap`}>Check out</button>
          </div>

          <div className="mt-2 flex flex-wrap gap-1.5">
            {valid ? <button onClick={() => scan(valid.code)} className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-[11px] font-semibold text-emerald-500">Demo: valid card ({valid.code})</button> : null}
            {blocked ? <button onClick={() => scan(blocked.code)} className="rounded-full border border-rose-500/30 bg-rose-500/10 px-2.5 py-1 text-[11px] font-semibold text-rose-500">Demo: blocked card ({blocked.code})</button> : null}
          </div>

          {result ? (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className={`mt-4 flex items-start gap-2 rounded-xl border px-3 py-2.5 text-xs font-semibold ${result.ok ? "border-emerald-500/35 bg-emerald-500/10 text-emerald-500" : "border-rose-500/35 bg-rose-500/10 text-rose-500"}`}>
              {result.ok ? <BadgeCheck size={16} className="mt-0.5 shrink-0" /> : <AlertTriangle size={16} className="mt-0.5 shrink-0" />}
              <span>{result.message}</span>
            </motion.div>
          ) : null}
        </div>

        <div className={`${panel} p-4`}>
          <SectionTitle title="Live attendance" sub="Most recent terminal events" right={<span className="rounded-full bg-secondary px-2 py-0.5 text-[11px] font-semibold text-muted-foreground">{db.attendance.length} today</span>} />
          <div className="max-h-[26rem] space-y-1.5 overflow-y-auto pr-1">
            {today.length === 0 ? <EmptyState title="No check-ins yet" sub="Scan a card to start the log." icon={Calendar} /> : null}
            {today.map((a) => (
              <div key={a.id} className="flex items-center gap-2 rounded-xl border border-border/50 px-2.5 py-2">
                <span className={`grid h-7 w-7 place-items-center rounded-lg ${a.result === "Granted" ? "bg-emerald-500/12 text-emerald-500" : "bg-rose-500/12 text-rose-500"}`}>
                  {a.result === "Granted" ? <Check size={14} /> : <X size={14} />}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-semibold">{a.memberName}</p>
                  <p className="text-[11px] text-muted-foreground">{new Date(a.at).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}{a.reason ? ` - ${a.reason}` : ""}</p>
                </div>
                <Pill tone={a.result}>{a.result}</Pill>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className={`${panel} p-4`}>
        <SectionTitle
          title="In the gym now"
          sub={`${inside.length} of ${db.settings.maxCapacity} allowed. A member counts as inside for up to ${STAY_WINDOW_MS / 3600000} hours unless checked out.`}
        />
        {inside.length === 0 ? (
          <EmptyState title="Nobody is checked in" sub="Members appear here after they check in." icon={Users} />
        ) : (
          <ul className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
            {inside.map((v) => {
              const member = db.members.find((m) => m.id === v.memberId);
              return (
                <li key={v.memberId} className="flex items-center justify-between gap-2 rounded-xl border border-border/50 px-3 py-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">{v.memberName}</p>
                    <p className="text-[11px] text-muted-foreground">Since {new Date(v.since).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</p>
                  </div>
                  <button onClick={() => leave(member?.code ?? v.memberId)} disabled={busy} className={`${btnGhost} shrink-0 text-xs`}><LogOut size={13} /> Check out</button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
export function SettingsView({
  db,
  onSave,
  onReset,
  onRunTests,
  testResults,
  running,
}: {
  db: Database;
  onSave: (settings: Database["settings"]) => Promise<void>;
  onReset: () => Promise<void>;
  onRunTests: () => Promise<void>;
  testResults: { name: string; passed: boolean; detail: string }[];
  running: boolean;
}) {
  const [form, setForm] = useState(db.settings);
  const [confirming, setConfirming] = useState(false);
  const [saving, setSaving] = useState(false);
  const passed = testResults.filter((t) => t.passed).length;

  const save = async () => {
    setSaving(true);
    try { await onSave(form); } finally { setSaving(false); }
  };

  return (
    <div className="space-y-4">
      <SectionTitle title="Gym settings" sub="Branding, billing defaults and demo data controls" />
      <div className="grid gap-4 lg:grid-cols-2">
        <div className={`${panel} p-4`}>
          <div className="mb-3 flex items-center gap-2 text-sm font-bold"><Settings size={15} className="text-primary" /> Facility profile</div>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-xs font-semibold text-muted-foreground sm:col-span-2">Gym name<input className={`${input} mt-1`} value={form.gymName} onChange={(e) => setForm({ ...form, gymName: e.target.value })} /></label>
            <label className="text-xs font-semibold text-muted-foreground sm:col-span-2">Address<input className={`${input} mt-1`} value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} /></label>
            <label className="text-xs font-semibold text-muted-foreground">Phone<input className={`${input} mt-1`} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></label>
            <label className="text-xs font-semibold text-muted-foreground">Open hours<input className={`${input} mt-1`} value={form.openHours} onChange={(e) => setForm({ ...form, openHours: e.target.value })} /></label>
            <label className="text-xs font-semibold text-muted-foreground">Tax rate<input type="number" step="0.01" className={`${input} mt-1`} value={form.taxRate} onChange={(e) => setForm({ ...form, taxRate: Number(e.target.value) })} /></label>
            <label className="text-xs font-semibold text-muted-foreground">Day pass<input type="number" className={`${input} mt-1`} value={form.dayPassPrice} onChange={(e) => setForm({ ...form, dayPassPrice: Number(e.target.value) })} /></label>
            <label className="text-xs font-semibold text-muted-foreground sm:col-span-2">Gym capacity (people allowed in at once)<input type="number" min={1} className={`${input} mt-1`} value={form.maxCapacity} onChange={(e) => setForm({ ...form, maxCapacity: Number(e.target.value) })} /></label>
          </div>
          <button onClick={save} disabled={saving} className={`${btnPrimary} mt-4`}>{saving ? "Saving..." : "Save settings"}</button>
        </div>

        <div className="space-y-4">
          <div className={`${panel} p-4`}>
            <div className="mb-2 flex items-center gap-2 text-sm font-bold"><CreditCard size={15} className="text-amber-500" /> Demo data factory</div>
            <p className="text-xs leading-relaxed text-muted-foreground">All records persist in this browser. Reset restores the seeded 40 members, 12 classes, payments, attendance and equipment logs.</p>
            {confirming ? (
              <div className="mt-3 flex gap-2">
                <button onClick={async () => { await onReset(); setConfirming(false); }} className={`${btn} bg-rose-500 text-white`}>Yes, reset everything</button>
                <button onClick={() => setConfirming(false)} className={btnGhost}>Cancel</button>
              </div>
            ) : (
              <button onClick={() => setConfirming(true)} className={`${btnGhost} mt-3`}><RefreshCw size={14} /> Reset demo data</button>
            )}
          </div>

          <div className={`${panel} p-4`}>
            <div className="mb-1 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-sm font-bold"><Dumbbell size={15} className="text-primary" /> Business rules checks</div>
              <button onClick={onRunTests} disabled={running} className={`${btnGhost} !px-2.5 !py-1 text-xs`}>{running ? "Running" : "Run tests"}</button>
            </div>
            <p className="mb-3 text-xs text-muted-foreground">{testResults.length ? `${passed}/${testResults.length} checks passing` : "Verify expiry, booking, waitlist and access rules."}</p>
            <div className="space-y-1.5">
              {testResults.map((t) => (
                <div key={t.name} className="flex items-start gap-2 rounded-xl border border-border/50 px-2.5 py-2">
                  <span className={`mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full ${t.passed ? "bg-emerald-500/12 text-emerald-500" : "bg-rose-500/12 text-rose-500"}`}>{t.passed ? <Check size={12} /> : <X size={12} />}</span>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold">{t.name}</p>
                    <p className="text-[11px] leading-snug text-muted-foreground">{t.detail}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

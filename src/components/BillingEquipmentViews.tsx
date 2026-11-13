import { useState } from "react";
import { Check, ChevronDown, CreditCard, Download, History, NotebookPen, Pencil, Plus, Printer, Search, Trash2, Wallet, Wrench } from "lucide-react";
import { PLANS, PLAN_NAMES, trainerName } from "../mockData";
import type { ClassInput, Database, EquipmentItem, FitnessClass, GymSettings, MaintenanceInput, Member, PaymentRecord, PaymentStatus, PlanName } from "../types";
import { firstError, paymentSchema } from "../lib/schemas";
import { ClassFormModal } from "./ClassFormModal";
import { MaintenanceModal } from "./MaintenanceModal";
import { downloadCsv } from "../lib/csv";
import { EmptyState, Modal, Pill, SectionTitle, Stat, btn, btnGhost, btnPrimary, input, panel } from "./Navbar";

const fmtDate = (iso: string) => new Date(`${iso}T12:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

export function InvoiceModal({ open, onClose, payment, settings }: { open: boolean; onClose: () => void; payment: PaymentRecord | null; settings: GymSettings }) {
  const tax = payment ? payment.amount * settings.taxRate : 0;
  return (
    <Modal open={open} onClose={onClose} title="Invoice">
      {payment ? (
        <div>
          <div className="rounded-xl border border-border/60 bg-background/40 p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-display text-lg font-extrabold tracking-tight">{settings.gymName}</p>
                <p className="text-[11px] text-muted-foreground">{settings.address}</p>
                <p className="text-[11px] text-muted-foreground">{settings.phone}</p>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-bold text-muted-foreground">Invoice</p>
                <p className="font-display text-sm font-bold">{payment.invoiceNo}</p>
                <p className="text-[11px] text-muted-foreground">{fmtDate(payment.date)}</p>
              </div>
            </div>
            <div className="mt-4 flex items-start justify-between gap-3 border-t border-border/60 pt-3">
              <div>
                <p className="text-[10px] font-bold text-muted-foreground">Billed to</p>
                <p className="text-sm font-semibold">{payment.memberName}</p>
                <p className="text-[11px] text-muted-foreground">{payment.memberId}</p>
              </div>
              <Pill tone={payment.status}>{payment.status}</Pill>
            </div>
            <table className="mt-4 w-full text-left text-xs">
              <thead>
                <tr className="border-b border-border/60 text-[10px] text-muted-foreground">
                  <th className="py-1.5 font-semibold">Description</th>
                  <th className="py-1.5 text-right font-semibold">Amount</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-border/40">
                  <td className="py-2">{payment.plan} membership - {PLANS[payment.plan].days} days</td>
                  <td className="py-2 text-right tabular-nums">${payment.amount.toFixed(2)}</td>
                </tr>
                <tr>
                  <td className="py-2 text-muted-foreground">Tax ({(settings.taxRate * 100).toFixed(0)}%)</td>
                  <td className="py-2 text-right tabular-nums text-muted-foreground">${tax.toFixed(2)}</td>
                </tr>
              </tbody>
            </table>
            <div className="mt-3 flex items-center justify-between border-t border-border/60 pt-3">
              <span className="text-xs font-semibold text-muted-foreground">Total due</span>
              <span className="font-display text-xl font-extrabold tabular-nums">${(payment.amount + tax).toFixed(2)}</span>
            </div>
            <p className="mt-3 text-[11px] text-muted-foreground">Paid via {payment.method}. Thank you for training with us.</p>
          </div>
          <div className="mt-4 flex justify-end gap-2">
            <button onClick={onClose} className={btnGhost}>Close</button>
            <button onClick={() => window.print()} className={btnPrimary}><Printer size={15} /> Print receipt</button>
          </div>
        </div>
      ) : (
        <EmptyState title="No invoice selected" sub="Pick a payment row to preview its receipt." icon={CreditCard} />
      )}
    </Modal>
  );
}

export function PaymentsView({
  db,
  onLogPayment,
}: {
  db: Database;
  onLogPayment: (input: { memberId: string; plan: PlanName; amount: number; method: string; status: PaymentStatus }) => Promise<void>;
}) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("All");
  const [invoice, setInvoice] = useState<PaymentRecord | null>(null);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState<{ memberId: string; plan: PlanName; method: string; status: PaymentStatus }>({ memberId: db.members[0]?.id ?? "", plan: "Monthly", method: "Card", status: "Paid" });

  const collected = db.payments.filter((p) => p.status === "Paid").reduce((s, p) => s + p.amount, 0);
  const pending = db.payments.filter((p) => p.status === "Pending").reduce((s, p) => s + p.amount, 0);
  const overdue = db.payments.filter((p) => p.status === "Overdue").reduce((s, p) => s + p.amount, 0);
  const filtered = db.payments.filter((p) => {
    const q = query.trim().toLowerCase();
    return (!q || [p.memberName, p.invoiceNo, p.memberId].some((v) => v.toLowerCase().includes(q))) && (status === "All" || p.status === status);
  });

  const exportCsv = () => {
    downloadCsv("fitcore-payments.csv", [
      ["Invoice", "Date", "Member ID", "Member", "Plan", "Amount", "Method", "Status"],
      ...filtered.map((p) => [p.invoiceNo, p.date, p.memberId, p.memberName, p.plan, p.amount, p.method, p.status]),
    ]);
  };

  const submit = async () => {
    const payload = { ...form, amount: PLANS[form.plan].price };
    const problem = firstError(paymentSchema.safeParse(payload));
    if (problem) return setError(problem);
    setSaving(true);
    setError("");
    try {
      await onLogPayment(payload);
      setOpen(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to record payment.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <SectionTitle title="Billing and invoices" sub="Track dues, log payments, print receipts" right={
          <div className="flex flex-wrap gap-2">
            <button onClick={exportCsv} disabled={filtered.length === 0} className={btnGhost}><Download size={15} /> Export CSV</button>
            <button onClick={() => { setOpen(true); setError(""); }} className={btnPrimary}><Plus size={15} /> Log payment</button>
          </div>
        } />

      <div className="grid gap-3 sm:grid-cols-3">
        <Stat label="Collected" value={`$${collected.toLocaleString()}`} hint={`${db.payments.filter((p) => p.status === "Paid").length} paid invoices`} icon={Wallet} tone="emerald" />
        <Stat label="Pending" value={`$${pending.toLocaleString()}`} hint="Awaiting settlement" icon={CreditCard} tone="amber" />
        <Stat label="Overdue" value={`$${overdue.toLocaleString()}`} hint="Escalate to admin" icon={Wrench} tone="rose" />
      </div>

      <div className={`${panel} flex flex-wrap items-center gap-2 p-3`}>
        <div className="relative min-w-[200px] flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search invoice or member" className={`${input} pl-9`} aria-label="Search invoices or members" />
        </div>
        {["All", "Paid", "Pending", "Overdue"].map((s) => (
          <button key={s} onClick={() => setStatus(s)} className={`rounded-full border px-3 py-1 text-[11px] font-semibold transition ${status === s ? "border-primary bg-primary/15 text-primary" : "border-border text-muted-foreground hover:bg-secondary"}`}>{s}</button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <EmptyState title="No payments found" sub="Adjust the filters or log a new payment." icon={CreditCard} />
      ) : (
        <div className={`${panel} overflow-hidden`}>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead>
                <tr className="border-b border-border/70 text-[11px] text-muted-foreground">
                  <th className="px-4 py-2.5 font-semibold">Invoice</th>
                  <th className="px-3 py-2.5 font-semibold">Member</th>
                  <th className="px-3 py-2.5 font-semibold">Plan</th>
                  <th className="px-3 py-2.5 font-semibold">Amount</th>
                  <th className="px-3 py-2.5 font-semibold">Method</th>
                  <th className="px-3 py-2.5 font-semibold">Status</th>
                  <th className="px-3 py-2.5 text-right font-semibold">Receipt</th>
                </tr>
              </thead>
              <tbody>
                {filtered.slice(0, 40).map((p) => (
                  <tr key={p.id} className="border-b border-border/40 transition hover:bg-secondary/40">
                    <td className="px-4 py-2.5">
                      <p className="text-xs font-semibold">{p.invoiceNo}</p>
                      <p className="text-[11px] text-muted-foreground">{fmtDate(p.date)}</p>
                    </td>
                    <td className="px-3 py-2.5 text-xs font-medium">{p.memberName}</td>
                    <td className="px-3 py-2.5 text-xs text-muted-foreground">{p.plan}</td>
                    <td className="px-3 py-2.5 text-xs font-semibold tabular-nums">${p.amount.toFixed(2)}</td>
                    <td className="px-3 py-2.5 text-xs text-muted-foreground">{p.method}</td>
                    <td className="px-3 py-2.5"><Pill tone={p.status}>{p.status}</Pill></td>
                    <td className="px-3 py-2.5 text-right">
                      <button onClick={() => setInvoice(p)} className={`${btnGhost} !px-2 !py-1 text-[11px]`}>View</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <InvoiceModal open={Boolean(invoice)} onClose={() => setInvoice(null)} payment={invoice} settings={db.settings} />

      <Modal open={open} onClose={() => setOpen(false)} title="Log a payment">
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="text-xs font-semibold text-muted-foreground sm:col-span-2">Member
            <select className={`${input} mt-1`} value={form.memberId} onChange={(e) => setForm({ ...form, memberId: e.target.value })}>
              {db.members.map((m) => <option key={m.id} value={m.id}>{m.name} ({m.id})</option>)}
            </select>
          </label>
          <label className="text-xs font-semibold text-muted-foreground">Plan
            <select className={`${input} mt-1`} value={form.plan} onChange={(e) => setForm({ ...form, plan: e.target.value as PlanName })}>
              {PLAN_NAMES.map((p) => <option key={p} value={p}>{p} - ${PLANS[p].price}</option>)}
            </select>
          </label>
          <label className="text-xs font-semibold text-muted-foreground">Amount<input className={`${input} mt-1`} value={`$${PLANS[form.plan].price}`} readOnly /></label>
          <label className="text-xs font-semibold text-muted-foreground">Method
            <select className={`${input} mt-1`} value={form.method} onChange={(e) => setForm({ ...form, method: e.target.value })}>
              {["Card", "Cash", "Transfer"].map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
          </label>
          <label className="text-xs font-semibold text-muted-foreground">Status
            <select className={`${input} mt-1`} value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as PaymentStatus })}>
              {["Paid", "Pending", "Overdue"].map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </label>
        </div>
        {error ? <p className="mt-3 rounded-lg bg-rose-500/12 px-3 py-2 text-xs font-medium text-rose-500">{error}</p> : null}
        <div className="mt-4 flex justify-end gap-2">
          <button onClick={() => setOpen(false)} className={btnGhost}>Cancel</button>
          <button onClick={submit} disabled={saving} className={btnPrimary}>{saving ? "Recording..." : "Record payment"}</button>
        </div>
      </Modal>
    </div>
  );
}

export function EquipmentView({
  db,
  onCycle,
  onLog,
}: {
  db: Database;
  onCycle: (id: string) => Promise<void>;
  onLog: (id: string, value: MaintenanceInput) => Promise<boolean>;
}) {
  const groups = ["Operational", "Needs Service", "Out of Order"];
  const [logging, setLogging] = useState<EquipmentItem | null>(null);
  const [openHistory, setOpenHistory] = useState<string | null>(null);

  return (
    <div className="space-y-4">
      <SectionTitle title="Equipment and facilities" sub="Advance a unit's status, or log the maintenance work done on it" />
      <div className="grid gap-3 sm:grid-cols-3">
        {groups.map((g, i) => (
          <Stat key={g} label={g} value={db.equipment.filter((e) => e.status === g).length} hint={`${db.equipment.length} tracked units`} icon={Wrench} tone={i === 0 ? "emerald" : i === 1 ? "amber" : "rose"} />
        ))}
      </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {db.equipment.map((e) => (
          <div key={e.id} className={`${panel} flex flex-col p-4`}>
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="font-display text-sm font-bold">{e.name}</p>
                <p className="text-[11px] text-muted-foreground">{e.category} - serviced {fmtDate(e.lastService)}</p>
              </div>
              <Pill tone={e.status}>{e.status}</Pill>
            </div>
            <p className="mt-2 text-[11px] leading-snug text-muted-foreground">{e.note || "No open maintenance notes."}</p>

            <div className="mt-3 space-y-2">
              <button onClick={() => onCycle(e.id)} className={`${btnGhost} text-xs`}><Check size={13} /> Advance status</button>
              <div className="flex flex-wrap gap-2">
                <button onClick={() => setLogging(e)} className={`${btnGhost} flex-auto whitespace-nowrap !px-2.5 text-xs`}><NotebookPen size={13} /> Log maintenance</button>
                <button onClick={() => setOpenHistory(openHistory === e.id ? null : e.id)} className={`${btnGhost} flex-auto whitespace-nowrap !px-2.5 text-xs`} aria-expanded={openHistory === e.id}>
                  <History size={13} /> History ({e.log.length}) <ChevronDown size={13} className={openHistory === e.id ? "rotate-180" : ""} />
                </button>
              </div>
            </div>

            {openHistory === e.id ? (
              <ul className="mt-3 space-y-2 border-t border-border pt-3">
                {e.log.length === 0 ? <li className="text-[11px] text-muted-foreground">No maintenance logged yet.</li> : null}
                {e.log.slice(0, 6).map((entry) => (
                  <li key={entry.id} className="text-[11px] leading-snug">
                    <span className="font-semibold text-foreground">{fmtDate(entry.date)}</span>
                    <span className="text-muted-foreground"> - {entry.status}. {entry.note}</span>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        ))}
      </div>
      {logging ? <MaintenanceModal item={logging} onClose={() => setLogging(null)} onSave={(value) => onLog(logging.id, value)} /> : null}
    </div>
  );
}

export function ClassesBoard({
  db,
  onBook,
  onCancel,
  onCheckIn,
  canManage,
  onSaveClass,
  onCancelClass,
}: {
  db: Database;
  onBook: (classId: string, memberId: string) => Promise<{ ok: boolean; message: string }>;
  onCancel: (bookingId: string) => Promise<{ ok: boolean; message: string }>;
  onCheckIn: (code: string) => Promise<{ ok: boolean; message: string }>;
  canManage: boolean;
  onSaveClass: (value: ClassInput) => Promise<boolean>;
  onCancelClass: (classId: string) => Promise<boolean>;
}) {
  const [memberId, setMemberId] = useState(db.members[0]?.id ?? "");
  const [busy, setBusy] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editingClass, setEditingClass] = useState<FitnessClass | null>(null);
  const [confirmCancelId, setConfirmCancelId] = useState<string | null>(null);
  const member: Member | undefined = db.members.find((m) => m.id === memberId);

  const act = async (fn: () => Promise<unknown>) => {
    setBusy(true);
    try { await fn(); } finally { setBusy(false); }
  };

  return (
    <div className="space-y-4">
      <SectionTitle
        title="Class schedule board"
        sub="Book members in, release seats, or verify attendance"
        right={canManage ? <button onClick={() => { setEditingClass(null); setFormOpen(true); }} className={btnPrimary}><Plus size={15} /> New class</button> : undefined}
      />
      <div className={`${panel} flex flex-wrap items-end gap-3 p-3`}>
        <label className="min-w-[220px] flex-1 text-xs font-semibold text-muted-foreground">Booking for
          <select className={`${input} mt-1`} value={memberId} onChange={(e) => setMemberId(e.target.value)}>
            {db.members.map((m) => <option key={m.id} value={m.id}>{m.name} - {m.status}</option>)}
          </select>
        </label>
        {member ? (
          <button onClick={() => act(() => onCheckIn(member.code))} className={`${btnGhost} text-xs`} disabled={busy}>Check in {member.name.split(" ")[0]}</button>
        ) : null}
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {db.classes.map((c) => {
          const booked = db.bookings.filter((b) => b.classId === c.id);
          const waiting = db.waitlist.filter((w) => w.classId === c.id);
          const mine = booked.find((b) => b.memberId === memberId);
          const full = booked.length >= c.capacity;
          const pct = Math.min(100, Math.round((booked.length / c.capacity) * 100));
          return (
            <div key={c.id} className={`${panel} p-4`}>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-display text-sm font-bold">{c.name}</p>
                  <p className="text-[11px] text-muted-foreground">{c.day} {c.time} - {c.room}</p>
                </div>
                <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-bold text-muted-foreground">{c.category}</span>
              </div>
              <p className="mt-1.5 text-[11px] text-muted-foreground">{trainerName(db.trainers, c.trainerId)} - {c.duration} min</p>
              <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-secondary">
                <div className={`h-full rounded-full ${pct >= 100 ? "bg-rose-500" : pct > 70 ? "bg-amber-500" : "bg-emerald-500"}`} style={{ width: `${pct}%` }} />
              </div>
              <p className="mt-1 text-[11px] text-muted-foreground">{booked.length}/{c.capacity} seats{waiting.length ? ` - ${waiting.length} waitlisted` : ""}</p>
              <div className="mt-3 flex gap-2">
                {mine ? (
                  <button onClick={() => act(() => onCancel(mine.id))} disabled={busy} className={`${btnGhost} flex-1 text-xs`}>Cancel seat</button>
                ) : (
                  <button onClick={() => act(() => onBook(c.id, memberId))} disabled={busy || !memberId} className={`${full ? `${btn} bg-amber-500/15 text-amber-500` : btnPrimary} flex-1 text-xs`}>{full ? "Join waitlist" : "Book seat"}</button>
                )}
              </div>
              {canManage ? (
                <div className="mt-2 grid grid-cols-2 gap-2 border-t border-border pt-3">
                  {confirmCancelId === c.id ? (
                    <>
                      <button onClick={() => act(async () => { await onCancelClass(c.id); setConfirmCancelId(null); })} disabled={busy} className={`${btn} w-full border border-rose-400 px-2.5 text-xs text-rose-500`}>Yes, cancel class</button>
                      <button onClick={() => setConfirmCancelId(null)} className={`${btnGhost} w-full px-2.5 text-xs`}>Keep</button>
                    </>
                  ) : (
                    <>
                      <button onClick={() => { setEditingClass(c); setFormOpen(true); }} className={`${btnGhost} w-full px-2.5 text-xs`}><Pencil size={13} /> Edit</button>
                      <button onClick={() => setConfirmCancelId(c.id)} className={`${btn} w-full border border-border px-2.5 text-xs text-muted-foreground hover:border-rose-400 hover:text-rose-500`}><Trash2 size={13} /> Cancel class</button>
                    </>
                  )}
                </div>
              ) : null}
            </div>
          );
        })}
      </div>

      {formOpen ? <ClassFormModal db={db} initial={editingClass} onClose={() => setFormOpen(false)} onSave={onSaveClass} /> : null}
    </div>
  );
}